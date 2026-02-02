package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lock "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/bananaops/tracker/internal/utils"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var (
	eventCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "tracker_event_status_total",
			Help: "Total number of events by status",
		},
		[]string{"service", "status", "environment"},
	)

	eventDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "tracker_event_duration_seconds",
			Help:    "Duration of events in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"service", "status", "environment"},
	)
)

type Event struct {
	v1alpha1.UnimplementedEventServiceServer
	store       *store.EventStoreClient
	lockService *Lock
	logger      *slog.Logger
}

func NewEvent() *Event {
	return &Event{
		UnimplementedEventServiceServer: v1alpha1.UnimplementedEventServiceServer{},
		store:                           store.NewStoreEvent(config.ConfigDatabase.EventCollection),
		lockService:                     NewLock(),
		logger:                          slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

// addChangelogEntry adds a new entry to the event's changelog
func addChangelogEntry(event *v1alpha1.Event, changeType v1alpha1.ChangeType, user, field, oldValue, newValue, comment string) {
	if event.Changelog == nil {
		event.Changelog = []*v1alpha1.ChangelogEntry{}
	}

	entry := &v1alpha1.ChangelogEntry{
		Timestamp:  timestamppb.Now(),
		User:       user,
		ChangeType: changeType,
		Field:      field,
		OldValue:   oldValue,
		NewValue:   newValue,
		Comment:    comment,
	}

	event.Changelog = append(event.Changelog, entry)
}

// shouldCreateLock détermine si un lock doit être créé pour cet événement
func shouldCreateLock(eventType v1alpha1.Type, status v1alpha1.Status) bool {
	// Créer un lock pour les déploiements et opérations qui démarrent
	return (eventType == v1alpha1.Type_deployment || eventType == v1alpha1.Type_operation) &&
		(status == v1alpha1.Status_start || status == v1alpha1.Status_in_progress)
}

// shouldReleaseLock détermine si un lock doit être libéré pour cet événement
func shouldReleaseLock(eventType v1alpha1.Type, status v1alpha1.Status) bool {
	// Libérer le lock quand l'événement se termine (success, failure ou done)
	return (eventType == v1alpha1.Type_deployment || eventType == v1alpha1.Type_operation) &&
		(status == v1alpha1.Status_success || status == v1alpha1.Status_failure || status == v1alpha1.Status_done)
}

// getResourceType retourne le type de ressource pour le lock
func getResourceType(eventType v1alpha1.Type) string {
	switch eventType {
	case v1alpha1.Type_deployment:
		return "deployment"
	case v1alpha1.Type_operation:
		return "operation"
	default:
		return "unknown"
	}
}

func (e *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.CreateEventResponse, error) {

	var event = &v1alpha1.Event{
		Title: i.Title,
		Attributes: &v1alpha1.EventAttributes{
			Message:       i.Attributes.Message,
			Source:        i.Attributes.Source,
			Type:          i.Attributes.Type,
			Priority:      i.Attributes.Priority,
			Impact:        i.Attributes.Impact,
			Environment:   i.Attributes.Environment,
			Owner:         i.Attributes.Owner,
			RelatedId:     i.Attributes.RelatedId,
			Service:       i.Attributes.Service,
			Status:        i.Attributes.Status,
			StartDate:     i.Attributes.StartDate,
			EndDate:       i.Attributes.EndDate,
			StakeHolders:  i.Attributes.StakeHolders,
			Notification:  i.Attributes.Notification,
			Notifications: i.Attributes.Notifications,
		},
		Links: &v1alpha1.EventLinks{
			PullRequestLink: i.Links.PullRequestLink,
			Ticket:          i.Links.Ticket,
		},
		Metadata: &v1alpha1.EventMetadata{
			SlackId: i.SlackId,
		},
	}

	if event.Attributes.RelatedId != "" {
		// check attributes.relatedId is present
		relatedEvent, err := e.store.Get(context.Background(), map[string]interface{}{"metadata.id": &i.Attributes.RelatedId})
		if err != nil {
			if err.Error() == "mongo: no documents in result" {
				return nil, fmt.Errorf("no event found in tracker for attributes.related_id %s", i.Attributes.RelatedId)
			}
			return nil, err
		}

		event.Metadata.Duration = durationpb.New(time.Since(relatedEvent.Metadata.CreatedAt.AsTime()))

	}

	eventCounter.With(prometheus.Labels{"status": i.Attributes.Status.String(), "service": i.Attributes.Service, "environment": i.Attributes.Environment.String()}).Inc()

	// Add initial changelog entry
	user := "system"
	if i.Attributes.Owner != "" {
		user = i.Attributes.Owner
	}
	addChangelogEntry(event, v1alpha1.ChangeType_created, user, "", "", "", "Event created")

	// Vérifier et créer un lock si nécessaire AVANT de créer l'événement
	if shouldCreateLock(i.Attributes.Type, i.Attributes.Status) {
		lockReq := &lock.CreateLockRequest{
			Service:     i.Attributes.Service,
			Who:         user,
			Environment: i.Attributes.Environment.String(),
			Resource:    getResourceType(i.Attributes.Type),
			EventId:     "", // Sera mis à jour après la création de l'événement
		}

		_, err := e.lockService.CreateLock(ctx, lockReq)
		if err != nil {
			e.logger.Error("failed to create lock",
				"service", i.Attributes.Service,
				"environment", i.Attributes.Environment.String(),
				"resource", getResourceType(i.Attributes.Type),
				"error", err,
			)

			// Améliorer le message d'erreur pour être plus explicite
			if strings.Contains(err.Error(), "already locked") {
				return nil, fmt.Errorf("cannot create event: service %s is already locked in %s. Please unlock it first",
					i.Attributes.Service, i.Attributes.Environment.String())
			}

			return nil, fmt.Errorf("cannot create event: failed to create lock - %v", err)
		}
	}

	var eventResult = &v1alpha1.CreateEventResponse{}
	var err error
	eventResult.Event, err = e.store.Create(context.Background(), event)
	if err != nil {
		return nil, err
	}

	// Mettre à jour le lock avec l'event_id
	if shouldCreateLock(i.Attributes.Type, i.Attributes.Status) {
		// Récupérer le lock correspondant et mettre à jour son event_id
		filter := map[string]interface{}{
			"service":     i.Attributes.Service,
			"environment": i.Attributes.Environment.String(),
			"resource":    getResourceType(i.Attributes.Type),
		}

		existingLock, err2 := e.lockService.store.Get(ctx, filter)
		if err2 == nil && existingLock != nil && existingLock.Id != "" {
			_, errUpd := e.lockService.UpdateLock(ctx, &lock.UpdateLockRequest{
				Id:      existingLock.Id,
				EventId: eventResult.Event.Metadata.Id,
			})
			if errUpd != nil {
				e.logger.Warn("failed to update lock with event_id",
					"lock_id", existingLock.Id,
					"event_id", eventResult.Event.Metadata.Id,
					"service", i.Attributes.Service,
					"environment", i.Attributes.Environment.String(),
					"error", errUpd,
				)
			} else {
				e.logger.Info("lock updated with event_id",
					"lock_id", existingLock.Id,
					"event_id", eventResult.Event.Metadata.Id,
					"service", i.Attributes.Service,
					"environment", i.Attributes.Environment.String(),
				)
			}
		} else {
			e.logger.Warn("lock not found for event to update",
				"service", i.Attributes.Service,
				"environment", i.Attributes.Environment.String(),
				"resource", getResourceType(i.Attributes.Type),
				"error", err2,
			)
		}
	}

	// log event to json format
	e.logger.Info("event created",
		"title", eventResult.Event.Title,
		"message", eventResult.Event.Attributes.Message,
		"priority", eventResult.Event.Attributes.Priority.String(),
		"environment", eventResult.Event.Attributes.Environment.String(),
		"owner", eventResult.Event.Attributes.Owner,
		"impact", eventResult.Event.Attributes.Impact,
		"service", eventResult.Event.Attributes.Service,
		"status", eventResult.Event.Attributes.Status.String(),
		"type", eventResult.Event.Attributes.Type.String(),
		"pull_request", eventResult.Event.Links.PullRequestLink,
		"id", eventResult.Event.Metadata.Id,
		"created_at", eventResult.Event.Metadata.CreatedAt.AsTime(),
	)

	return eventResult, nil
}

func (e *Event) GetEvent(
	ctx context.Context,
	i *v1alpha1.GetEventRequest,
) (*v1alpha1.GetEventResponse, error) {

	var eventResult = &v1alpha1.GetEventResponse{}
	var err error

	if utils.IsUUID(i.Id) {
		eventResult.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.id": i.Id})
		if err != nil {
			return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
		}
	} else {
		eventResult.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.slackid": i.Id})
		if err != nil {
			return nil, fmt.Errorf("no event found in tracker for slack id %s", i.Id)
		}
	}

	return eventResult, nil
}

func (e *Event) SearchEvents(
	ctx context.Context,
	i *v1alpha1.SearchEventsRequest,
) (*v1alpha1.SearchEventsResponse, error) {

	filter, err := utils.CreateFilter(i)
	if err != nil {
		return nil, err
	}

	var eventsResult = &v1alpha1.SearchEventsResponse{}
	eventsResult.Events, err = e.store.Search(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	eventsResult.TotalCount = uint32(len(eventsResult.Events))

	return eventsResult, nil
}

func (e *Event) ListEvents(
	ctx context.Context,
	i *v1alpha1.ListEventsRequest,
) (*v1alpha1.ListEventsResponse, error) {

	var eventsResult = &v1alpha1.ListEventsResponse{}
	var err error

	eventsResult.Events, err = e.store.List(context.Background())
	if err != nil {
		return nil, err
	}
	eventsResult.TotalCount = uint32(len(eventsResult.Events))

	return eventsResult, nil
}

func (e *Event) TodayEvents(
	ctx context.Context,
	i *v1alpha1.TodayEventsRequest,
) (*v1alpha1.TodayEventsResponse, error) {

	today := time.Now().Format("2006-01-02")

	var todayFilter = &v1alpha1.SearchEventsRequest{
		StartDate: today + "T00:00:00Z",
		EndDate:   today + "T23:59:59Z",
	}

	filter, err := utils.CreateFilter(todayFilter)
	if err != nil {
		return nil, err
	}

	var eventsResult = &v1alpha1.TodayEventsResponse{}
	eventsResult.Events, err = e.store.Search(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	eventsResult.TotalCount = uint32(len(eventsResult.Events))

	return eventsResult, nil
}

func (e *Event) UpdateEvent(
	ctx context.Context,
	i *v1alpha1.UpdateEventRequest,
) (*v1alpha1.UpdateEventResponse, error) {

	var eventResult = &v1alpha1.UpdateEventResponse{}
	var eventDatabase = &v1alpha1.GetEventResponse{}
	var err error

	eventDatabase.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.slackid": i.SlackId})
	if err != nil {
		return nil, fmt.Errorf("no event found in tracker for id %s", i.SlackId)
	}

	if i.SlackId == "" {
		eventDatabase.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.id": i.Id})
		if err != nil {
			return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
		}
	} else {
		eventDatabase.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.slackid": i.SlackId})
		if err != nil {
			return nil, fmt.Errorf("no event found in tracker for slack id %s", i.SlackId)
		}
	}

	var event = &v1alpha1.Event{
		Title: i.Title,
		Attributes: &v1alpha1.EventAttributes{
			Message:       i.Attributes.Message,
			Source:        i.Attributes.Source,
			Type:          i.Attributes.Type,
			Priority:      i.Attributes.Priority,
			Impact:        i.Attributes.Impact,
			Environment:   i.Attributes.Environment,
			Owner:         i.Attributes.Owner,
			RelatedId:     i.Attributes.RelatedId,
			Service:       i.Attributes.Service,
			Status:        i.Attributes.Status,
			StartDate:     i.Attributes.StartDate,
			EndDate:       i.Attributes.EndDate,
			StakeHolders:  i.Attributes.StakeHolders,
			Notification:  i.Attributes.Notification,
			Notifications: i.Attributes.Notifications,
		},
		Links: &v1alpha1.EventLinks{
			PullRequestLink: i.Links.PullRequestLink,
			Ticket:          i.Links.Ticket,
		},
		Metadata: &v1alpha1.EventMetadata{
			SlackId:   i.SlackId,
			CreatedAt: eventDatabase.Event.Metadata.CreatedAt,
			Duration:  eventDatabase.Event.Metadata.Duration,
			Id:        eventDatabase.Event.Metadata.Id,
		},
	}

	if event.Attributes.Status == 2 || event.Attributes.Status == 3 {
		duration := time.Since(eventDatabase.Event.Metadata.CreatedAt.AsTime())
		event.Metadata.Duration = durationpb.New(duration)
		if eventDatabase.Event.Attributes.Status != event.Attributes.Status {
			recordEvent(event.Attributes.Status.String(), event.Attributes.Service, event.Attributes.Environment.String(), duration)
		}
	}

	// Preserve existing changelog
	event.Changelog = eventDatabase.Event.Changelog

	// Track changes and add changelog entries
	user := "system"
	if i.Attributes.Owner != "" {
		user = i.Attributes.Owner
	}

	// Detect if this is an approval (only owner changed, nothing else)
	isApproval := eventDatabase.Event.Attributes.Owner != event.Attributes.Owner &&
		eventDatabase.Event.Attributes.Status == event.Attributes.Status &&
		eventDatabase.Event.Attributes.Priority == event.Attributes.Priority &&
		eventDatabase.Event.Title == event.Title

	// Check for status change
	if eventDatabase.Event.Attributes.Status != event.Attributes.Status {
		addChangelogEntry(
			event,
			v1alpha1.ChangeType_status_changed,
			user,
			"status",
			eventDatabase.Event.Attributes.Status.String(),
			event.Attributes.Status.String(),
			"Status updated",
		)
	}

	// Check for ticket link change
	if eventDatabase.Event.Links.Ticket != event.Links.Ticket && event.Links.Ticket != "" {
		addChangelogEntry(
			event,
			v1alpha1.ChangeType_linked,
			user,
			"ticket",
			eventDatabase.Event.Links.Ticket,
			event.Links.Ticket,
			"Jira ticket linked",
		)
	}

	// Check for priority change
	if eventDatabase.Event.Attributes.Priority != event.Attributes.Priority {
		addChangelogEntry(
			event,
			v1alpha1.ChangeType_updated,
			user,
			"priority",
			eventDatabase.Event.Attributes.Priority.String(),
			event.Attributes.Priority.String(),
			"Priority updated",
		)
	}

	// Check for title change
	if eventDatabase.Event.Title != event.Title {
		addChangelogEntry(
			event,
			v1alpha1.ChangeType_updated,
			user,
			"title",
			eventDatabase.Event.Title,
			event.Title,
			"Title updated",
		)
	}

	// Add general update entry if no specific changes were tracked
	if len(event.Changelog) == len(eventDatabase.Event.Changelog) {
		if isApproval {
			addChangelogEntry(
				event,
				v1alpha1.ChangeType_approved,
				user,
				"",
				"",
				"",
				fmt.Sprintf("Event approved by %s", user),
			)
		} else {
			addChangelogEntry(
				event,
				v1alpha1.ChangeType_updated,
				user,
				"",
				"",
				"",
				"Event updated",
			)
		}
	}

	// Use the appropriate filter based on whether SlackId or Id is provided
	var filter map[string]interface{}
	if i.SlackId != "" {
		filter = map[string]interface{}{"metadata.slackid": i.SlackId}
	} else {
		filter = map[string]interface{}{"metadata.id": i.Id}
	}

	eventResult.Event, err = e.store.Update(context.Background(), filter, event)
	if err != nil {
		return nil, err
	}

	// Libérer le lock si l'événement se termine
	if shouldReleaseLock(event.Attributes.Type, event.Attributes.Status) {
		err = e.lockService.UnlockByEventId(ctx, eventResult.Event.Metadata.Id)
		if err != nil {
			e.logger.Warn("failed to release lock",
				"event_id", eventResult.Event.Metadata.Id,
				"service", event.Attributes.Service,
				"error", err,
			)
			// Ne pas retourner d'erreur, l'événement est déjà mis à jour
		} else {
			e.logger.Info("lock released for event",
				"event_id", eventResult.Event.Metadata.Id,
				"service", event.Attributes.Service,
				"status", event.Attributes.Status.String(),
			)
		}
	}

	return eventResult, nil
}

func (e *Event) DeleteEvent(
	ctx context.Context,
	i *v1alpha1.DeleteEventRequest,
) (*v1alpha1.DeleteEventResponse, error) {

	var eventResult = &v1alpha1.DeleteEventResponse{}

	err := e.store.Delete(context.Background(), map[string]interface{}{"metadata.id": i.Id})
	if err != nil {
		return nil, err
	}

	return eventResult, nil
}

func (e *Event) AddChangelogEntry(
	ctx context.Context,
	i *v1alpha1.AddChangelogEntryRequest,
) (*v1alpha1.AddChangelogEntryResponse, error) {

	// Retrieve the existing event
	eventDatabase, err := e.store.Get(ctx, map[string]interface{}{"metadata.id": i.Id})
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return nil, fmt.Errorf("event not found with id %s", i.Id)
		}
		return nil, err
	}

	// Validate the changelog entry
	if i.Entry == nil {
		return nil, fmt.Errorf("changelog entry cannot be nil")
	}

	// Set timestamp if not provided
	if i.Entry.Timestamp == nil {
		i.Entry.Timestamp = timestamppb.Now()
	}

	// Append the new changelog entry
	if eventDatabase.Changelog == nil {
		eventDatabase.Changelog = []*v1alpha1.ChangelogEntry{}
	}
	eventDatabase.Changelog = append(eventDatabase.Changelog, i.Entry)

	// Update the event in the database
	updatedEvent, err := e.store.Update(ctx, map[string]interface{}{"metadata.id": i.Id}, eventDatabase)
	if err != nil {
		return nil, fmt.Errorf("failed to update event changelog: %w", err)
	}

	e.logger.Info("changelog entry added",
		"event_id", i.Id,
		"user", i.Entry.User,
		"change_type", i.Entry.ChangeType.String(),
	)

	return &v1alpha1.AddChangelogEntryResponse{
		Event: updatedEvent,
	}, nil
}

func (e *Event) GetEventChangelog(
	ctx context.Context,
	i *v1alpha1.GetEventChangelogRequest,
) (*v1alpha1.GetEventChangelogResponse, error) {

	// Retrieve the existing event
	eventDatabase, err := e.store.Get(ctx, map[string]interface{}{"metadata.id": i.Id})
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return nil, fmt.Errorf("event not found with id %s", i.Id)
		}
		return nil, err
	}

	// Get pagination parameters with defaults
	perPage := uint32(50) // default
	if i.PerPage != nil {
		perPage = i.PerPage.Value
	}

	page := int32(1) // default
	if i.Page != nil {
		page = i.Page.Value
	}

	// Calculate pagination
	totalCount := uint32(len(eventDatabase.Changelog))
	startIdx := int((page - 1) * int32(perPage))
	endIdx := int(page * int32(perPage))

	// Handle out of bounds
	if startIdx < 0 {
		startIdx = 0
	}
	if startIdx >= int(totalCount) {
		return &v1alpha1.GetEventChangelogResponse{
			Changelog:  []*v1alpha1.ChangelogEntry{},
			TotalCount: totalCount,
		}, nil
	}
	if endIdx > int(totalCount) {
		endIdx = int(totalCount)
	}

	// Extract the paginated changelog
	paginatedChangelog := eventDatabase.Changelog[startIdx:endIdx]

	e.logger.Info("changelog retrieved",
		"event_id", i.Id,
		"total_entries", totalCount,
		"page", page,
		"per_page", perPage,
	)

	return &v1alpha1.GetEventChangelogResponse{
		Changelog:  paginatedChangelog,
		TotalCount: totalCount,
	}, nil
}

func (e *Event) AddSlackId(
	ctx context.Context,
	i *v1alpha1.AddSlackIdRequest,
) (*v1alpha1.AddSlackIdResponse, error) {

	// Retrieve the existing event
	eventDatabase, err := e.store.Get(ctx, map[string]interface{}{"metadata.id": i.Id})
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return nil, fmt.Errorf("event not found with id %s", i.Id)
		}
		return nil, err
	}

	// Validate the Slack ID
	if i.SlackId == "" {
		return nil, fmt.Errorf("slack_id cannot be empty")
	}

	// Check if Slack ID already exists
	if eventDatabase.Metadata.SlackId != "" {
		return nil, fmt.Errorf("event already has a slack_id: %s", eventDatabase.Metadata.SlackId)
	}

	// Update the Slack ID
	eventDatabase.Metadata.SlackId = i.SlackId

	// Add changelog entry
	user := "system"
	if eventDatabase.Attributes.Owner != "" {
		user = eventDatabase.Attributes.Owner
	}
	addChangelogEntry(
		eventDatabase,
		v1alpha1.ChangeType_linked,
		user,
		"slack_id",
		"",
		i.SlackId,
		"Slack message linked",
	)

	// Update the event in the database
	updatedEvent, err := e.store.Update(ctx, map[string]interface{}{"metadata.id": i.Id}, eventDatabase)
	if err != nil {
		return nil, fmt.Errorf("failed to update event with slack_id: %w", err)
	}

	e.logger.Info("slack_id added to event",
		"event_id", i.Id,
		"slack_id", i.SlackId,
	)

	return &v1alpha1.AddSlackIdResponse{
		Event: updatedEvent,
	}, nil
}

func recordEvent(status string, service string, environment string, duration time.Duration) {
	// Incrase the counter of events
	eventCounter.With(prometheus.Labels{"status": status, "service": service, "environment": environment}).Inc()

	// save duration of events
	eventDuration.With(prometheus.Labels{"status": status, "service": service, "environment": environment}).Observe(duration.Seconds())
}

func (e *Event) GetEventStats(
	ctx context.Context,
	i *v1alpha1.GetEventStatsRequest,
) (*v1alpha1.GetEventStatsResponse, error) {

	// Build filter from request
	statsFilter := &utils.StatsFilter{
		StartDate: i.StartDate,
		EndDate:   i.EndDate,
		Source:    i.Source,
		Service:   i.Service,
	}

	// Convert environments
	if len(i.Environments) > 0 {
		statsFilter.Environments = make([]int32, len(i.Environments))
		for idx, env := range i.Environments {
			statsFilter.Environments[idx] = int32(env)
		}
	}

	// Convert impact
	if i.Impact != nil {
		impact := i.Impact.Value
		statsFilter.Impact = &impact
	}

	// Convert priorities
	if len(i.Priorities) > 0 {
		statsFilter.Priorities = make([]int32, len(i.Priorities))
		for idx, p := range i.Priorities {
			statsFilter.Priorities[idx] = int32(p)
		}
	}

	// Convert types
	if len(i.Types) > 0 {
		statsFilter.Types = make([]int32, len(i.Types))
		for idx, t := range i.Types {
			statsFilter.Types[idx] = int32(t)
		}
	}

	// Convert statuses
	if len(i.Statuses) > 0 {
		statsFilter.Statuses = make([]int32, len(i.Statuses))
		for idx, s := range i.Statuses {
			statsFilter.Statuses[idx] = int32(s)
		}
	}

	filter, err := utils.CreateStatsFilter(statsFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to create stats filter: %w", err)
	}

	count, err := e.store.CountWithFilter(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to count events: %w", err)
	}

	// Safe conversion: count is always >= 0
	var totalCount uint64
	if count >= 0 {
		totalCount = uint64(count) // #nosec G115
	}

	e.logger.Info("event stats retrieved",
		"start_date", i.StartDate,
		"end_date", i.EndDate,
		"count", totalCount,
	)

	return &v1alpha1.GetEventStatsResponse{
		TotalCount: totalCount,
		StartDate:  i.StartDate,
		EndDate:    i.EndDate,
	}, nil
}

func (e *Event) GetEventStatsByMonth(
	ctx context.Context,
	i *v1alpha1.GetEventStatsByMonthRequest,
) (*v1alpha1.GetEventStatsByMonthResponse, error) {

	// Build filter from request
	statsFilter := &utils.StatsFilter{
		StartDate: i.StartDate,
		EndDate:   i.EndDate,
		Source:    i.Source,
		Service:   i.Service,
	}

	// Convert environments
	if len(i.Environments) > 0 {
		statsFilter.Environments = make([]int32, len(i.Environments))
		for idx, env := range i.Environments {
			statsFilter.Environments[idx] = int32(env)
		}
	}

	// Convert impact
	if i.Impact != nil {
		impact := i.Impact.Value
		statsFilter.Impact = &impact
	}

	// Convert priorities
	if len(i.Priorities) > 0 {
		statsFilter.Priorities = make([]int32, len(i.Priorities))
		for idx, p := range i.Priorities {
			statsFilter.Priorities[idx] = int32(p)
		}
	}

	// Convert types
	if len(i.Types) > 0 {
		statsFilter.Types = make([]int32, len(i.Types))
		for idx, t := range i.Types {
			statsFilter.Types[idx] = int32(t)
		}
	}

	// Convert statuses
	if len(i.Statuses) > 0 {
		statsFilter.Statuses = make([]int32, len(i.Statuses))
		for idx, s := range i.Statuses {
			statsFilter.Statuses[idx] = int32(s)
		}
	}

	filter, err := utils.CreateStatsFilter(statsFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to create stats filter: %w", err)
	}

	results, err := e.store.AggregateByMonth(ctx, filter, i.GroupByService)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate events by month: %w", err)
	}

	// Convert results to proto
	stats := make([]*v1alpha1.MonthlyStats, len(results))
	var totalCount uint64
	for idx, r := range results {
		// Safe conversion: r.Count is always >= 0
		var count uint64
		if r.Count >= 0 {
			count = uint64(r.Count) // #nosec G115
		}
		stats[idx] = &v1alpha1.MonthlyStats{
			Year:    r.Year,
			Month:   r.Month,
			Count:   count,
			Service: r.Service,
		}
		totalCount += count
	}

	e.logger.Info("event stats by month retrieved",
		"start_date", i.StartDate,
		"end_date", i.EndDate,
		"months_count", len(stats),
		"total_count", totalCount,
		"group_by_service", i.GroupByService,
	)

	return &v1alpha1.GetEventStatsByMonthResponse{
		Stats:      stats,
		TotalCount: totalCount,
		StartDate:  i.StartDate,
		EndDate:    i.EndDate,
	}, nil
}

func init() {
	// Enregistrer les métriques
	prometheus.MustRegister(eventCounter)
	prometheus.MustRegister(eventDuration)
}
