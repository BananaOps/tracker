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
	"github.com/bananaops/tracker/internal/auth/authz"
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

func newEventFromStores(events *store.EventStoreClient, locks *store.LockStoreClient, logger *slog.Logger) *Event {
	return &Event{
		UnimplementedEventServiceServer: v1alpha1.UnimplementedEventServiceServer{},
		store:                           events,
		lockService: &Lock{
			UnimplementedLockServiceServer: lock.UnimplementedLockServiceServer{},
			store:                          *locks,
			eventStore:                     events,
			logger:                         logger,
		},
		logger: logger,
	}
}

func NewEvent() *Event {
	return newEventFromStores(
		store.NewStoreEvent(config.ConfigDatabase.EventCollection),
		store.NewStoreLock(config.ConfigDatabase.LockCollection),
		slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	)
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

// lockMode tells createEvent what to do when the service is already locked.
type lockMode int

const (
	// lockStrict is the RPC behaviour: a conflict makes the creation fail.
	lockStrict lockMode = iota
	// lockObserve is the integration behaviour: the conflict is recorded,
	// the event is created without a lock.
	lockObserve
)

// lockConflict names the holder of the lock an observed deployment could not take.
type lockConflict struct{ Who string }

func lockConflictComment(service, environment, who string) string {
	return fmt.Sprintf("Deployed while %s was locked in %s by %s", service, environment, who)
}

func (e *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.CreateEventResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
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

	user := "system"
	if i.Attributes.Owner != "" {
		user = i.Attributes.Owner
	}

	// The lock taken for a deployment or an operation is part of creating the
	// event: it is covered by the event:write check above and goes through the
	// unauthorized lock core, so the request counts a single decision in
	// tracker_auth_requests_total.
	created, _, err := e.createEvent(ctx, event, user, "", lockStrict)
	if err != nil {
		return nil, err
	}
	return &v1alpha1.CreateEventResponse{Event: created}, nil
}

// createEvent is CreateEvent without authorization. mode controls what
// happens when the service is already locked: lockStrict fails the creation
// (the RPC behaviour, unchanged) and takes its lock before creating the
// event, attaching it afterward once the id is known. lockObserve (the
// integration behaviour) creates the event first, then takes the lock with
// the event id already known, in the same write: a conflict with an
// existing lock is recorded as a changelog comment instead of failing the
// creation, and any other failure taking the lock is only logged.
func (e *Event) createEvent(ctx context.Context, event *v1alpha1.Event, user, comment string, mode lockMode) (*v1alpha1.Event, *lockConflict, error) {
	attrs := event.Attributes
	environment := attrs.Environment.String()
	resource := getResourceType(attrs.Type)

	eventCounter.With(prometheus.Labels{"status": attrs.Status.String(), "service": attrs.Service, "environment": environment}).Inc()

	addChangelogEntry(event, v1alpha1.ChangeType_created, user, "", "", "", "Event created")

	var lockID string
	if mode == lockStrict && shouldCreateLock(attrs.Type, attrs.Status) {
		res, err := e.lockService.createLock(ctx, &lock.CreateLockRequest{
			Service:     attrs.Service,
			Who:         user,
			Environment: environment,
			Resource:    resource,
			EventId:     "",
		})
		if err != nil {
			e.logger.Error("failed to create lock",
				"service", attrs.Service,
				"environment", environment,
				"resource", resource,
				"error", err,
			)

			if strings.Contains(err.Error(), "already locked") {
				return nil, nil, fmt.Errorf("cannot create event: service %s is already locked in %s. Please unlock it first",
					attrs.Service, environment)
			}

			return nil, nil, fmt.Errorf("cannot create event: failed to create lock - %v", err)
		}
		lockID = res.Lock.Id
	}

	if comment != "" {
		addChangelogEntry(event, v1alpha1.ChangeType_commented, user, "", "", "", comment)
	}

	created, err := e.store.Create(context.Background(), event)
	if err != nil {
		return nil, nil, err
	}

	if lockID != "" {
		_, errUpd := e.lockService.updateLock(ctx, &lock.UpdateLockRequest{
			Id:      lockID,
			EventId: created.Metadata.Id,
		})
		if errUpd != nil {
			e.logger.Warn("failed to update lock with event_id",
				"lock_id", lockID,
				"event_id", created.Metadata.Id,
				"service", attrs.Service,
				"environment", environment,
				"error", errUpd,
			)
		} else {
			e.logger.Info("lock updated with event_id",
				"lock_id", lockID,
				"event_id", created.Metadata.Id,
				"service", attrs.Service,
				"environment", environment,
			)
		}
	}

	var conflict *lockConflict
	if mode == lockObserve && resource != "unknown" {
		created, conflict = e.observeLockAfterCreate(ctx, created, user, shouldCreateLock(attrs.Type, attrs.Status))
	}

	// log event to json format
	e.logger.Info("event created",
		"title", created.Title,
		"message", created.Attributes.Message,
		"priority", created.Attributes.Priority.String(),
		"environment", created.Attributes.Environment.String(),
		"owner", created.Attributes.Owner,
		"impact", created.Attributes.Impact,
		"service", created.Attributes.Service,
		"status", created.Attributes.Status.String(),
		"type", created.Attributes.Type.String(),
		"pull_request", created.Links.PullRequestLink,
		"id", created.Metadata.Id,
		"created_at", created.Metadata.CreatedAt.AsTime(),
	)

	return created, conflict, nil
}

// observeLock takes the lock when take is true and nobody holds it, with
// eventID already set in the same write: every observe-mode caller knows
// the event id up front (observeLockAfterCreate once the event is created,
// the processor's update path from the claim it already correlated), so
// there is no separate attach step. A lock held by someone else is
// reported, never returned as an error.
func (e *Event) observeLock(ctx context.Context, service, environment, resource, who, eventID string, take bool) (string, *lockConflict, error) {
	if held := e.lockService.findLock(ctx, service, environment, resource); held != nil {
		return "", &lockConflict{Who: held.Who}, nil
	}
	if !take {
		return "", nil, nil
	}
	res, err := e.lockService.createLock(ctx, &lock.CreateLockRequest{Service: service, Who: who, Environment: environment, Resource: resource, EventId: eventID})
	if err != nil {
		if strings.Contains(err.Error(), "already locked") {
			holder := "unknown"
			if held := e.lockService.findLock(ctx, service, environment, resource); held != nil {
				holder = held.Who
			}
			return "", &lockConflict{Who: holder}, nil
		}
		return "", nil, fmt.Errorf("cannot create lock: %w", err)
	}
	return res.Lock.Id, nil, nil
}

// observeLockAfterCreate takes the lock for an event that was just created,
// with the event id already known, in the same write. It never fails the
// creation: a conflict with an existing lock is recorded as a changelog
// comment on the event, and any other failure is only logged. It returns
// the event as currently stored, reloaded when the lock or the comment
// changed it.
func (e *Event) observeLockAfterCreate(ctx context.Context, created *v1alpha1.Event, user string, take bool) (*v1alpha1.Event, *lockConflict) {
	attrs := created.Attributes
	environment := attrs.Environment.String()
	resource := getResourceType(attrs.Type)

	lockID, conflict, err := e.observeLock(ctx, attrs.Service, environment, resource, user, created.Metadata.Id, take)
	if err != nil {
		e.logger.Warn("failed to take lock after creating event",
			"service", attrs.Service,
			"environment", environment,
			"resource", resource,
			"event_id", created.Metadata.Id,
			"error", err,
		)
		return created, nil
	}

	if conflict != nil {
		ev, gerr := e.store.Get(context.Background(), map[string]interface{}{"metadata.id": created.Metadata.Id})
		if gerr != nil {
			e.logger.Warn("failed to reload event to record lock conflict comment", "event_id", created.Metadata.Id, "error", gerr)
			return created, conflict
		}
		addChangelogEntry(ev, v1alpha1.ChangeType_commented, user, "", "", "", lockConflictComment(attrs.Service, environment, conflict.Who))
		// Update returns the document as it was before the $set (no
		// ReturnDocument(After) option), so the caller gets the locally
		// mutated copy, not that stale snapshot.
		if _, uerr := e.store.Update(context.Background(), map[string]interface{}{"metadata.id": created.Metadata.Id}, ev); uerr != nil {
			e.logger.Warn("failed to record lock conflict comment", "event_id", created.Metadata.Id, "error", uerr)
			return created, conflict
		}
		return ev, conflict
	}

	if lockID == "" {
		return created, nil
	}

	// createLock already appended the "Service locked in %s" changelog entry
	// since the event id was set in the same write: reload so the returned
	// event reflects it.
	ev, gerr := e.store.Get(context.Background(), map[string]interface{}{"metadata.id": created.Metadata.Id})
	if gerr != nil {
		e.logger.Warn("failed to reload event after taking lock", "event_id", created.Metadata.Id, "error", gerr)
		return created, nil
	}
	return ev, nil
}

func (e *Event) GetEvent(
	ctx context.Context,
	i *v1alpha1.GetEventRequest,
) (*v1alpha1.GetEventResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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

	// Track changes and add changelog entries
	user := "system"
	if i.Attributes.Owner != "" {
		user = i.Attributes.Owner
	}

	// Use the appropriate filter based on whether SlackId or Id is provided
	var filter map[string]interface{}
	if i.SlackId != "" {
		filter = map[string]interface{}{"metadata.slackid": i.SlackId}
	} else {
		filter = map[string]interface{}{"metadata.id": i.Id}
	}

	updated, err := e.updateEvent(ctx, eventDatabase.Event, event, filter, user, "", time.Now())
	if err != nil {
		return nil, err
	}

	// Libérer le lock si l'événement se termine
	if shouldReleaseLock(event.Attributes.Type, event.Attributes.Status) {
		err = e.lockService.UnlockByEventId(ctx, updated.Metadata.Id)
		if err != nil {
			e.logger.Warn("failed to release lock",
				"event_id", updated.Metadata.Id,
				"service", event.Attributes.Service,
				"error", err,
			)
			// Ne pas retourner d'erreur, l'événement est déjà mis à jour
		} else {
			e.logger.Info("lock released for event",
				"event_id", updated.Metadata.Id,
				"service", event.Attributes.Service,
				"status", event.Attributes.Status.String(),
			)
		}
	}

	return &v1alpha1.UpdateEventResponse{Event: updated}, nil
}

// updateEvent is UpdateEvent without authorization. current is the event as
// stored, next is the requested state (metadata already carries the id,
// created_at and previous duration); at is the instant the duration is
// measured against, and comment, when set, is appended as a final changelog
// entry after the update summary. Only callers of the server package that
// already authorized or authenticated the operation may use it.
func (e *Event) updateEvent(ctx context.Context, current, next *v1alpha1.Event, filter map[string]interface{}, user, comment string, at time.Time) (*v1alpha1.Event, error) {
	if next.Attributes.Status == v1alpha1.Status_failure || next.Attributes.Status == v1alpha1.Status_success {
		duration := at.Sub(current.Metadata.CreatedAt.AsTime())
		if duration < 0 {
			duration = 0
		}
		next.Metadata.Duration = durationpb.New(duration)
		if current.Attributes.Status != next.Attributes.Status {
			recordEvent(next.Attributes.Status.String(), next.Attributes.Service, next.Attributes.Environment.String(), duration)
		}
	}

	// Preserve existing changelog
	next.Changelog = current.Changelog

	// Detect if this is an approval (only owner changed, nothing else)
	isApproval := current.Attributes.Owner != next.Attributes.Owner &&
		current.Attributes.Status == next.Attributes.Status &&
		current.Attributes.Priority == next.Attributes.Priority &&
		current.Title == next.Title

	// Check for status change
	if current.Attributes.Status != next.Attributes.Status {
		addChangelogEntry(
			next,
			v1alpha1.ChangeType_status_changed,
			user,
			"status",
			current.Attributes.Status.String(),
			next.Attributes.Status.String(),
			"Status updated",
		)
	}

	// Check for ticket link change
	if current.Links.Ticket != next.Links.Ticket && next.Links.Ticket != "" {
		addChangelogEntry(
			next,
			v1alpha1.ChangeType_linked,
			user,
			"ticket",
			current.Links.Ticket,
			next.Links.Ticket,
			"Jira ticket linked",
		)
	}

	// Check for priority change
	if current.Attributes.Priority != next.Attributes.Priority {
		addChangelogEntry(
			next,
			v1alpha1.ChangeType_updated,
			user,
			"priority",
			current.Attributes.Priority.String(),
			next.Attributes.Priority.String(),
			"Priority updated",
		)
	}

	// Check for title change
	if current.Title != next.Title {
		addChangelogEntry(
			next,
			v1alpha1.ChangeType_updated,
			user,
			"title",
			current.Title,
			next.Title,
			"Title updated",
		)
	}

	// Add general update entry if no specific changes were tracked
	if len(next.Changelog) == len(current.Changelog) {
		if isApproval {
			addChangelogEntry(
				next,
				v1alpha1.ChangeType_approved,
				user,
				"",
				"",
				"",
				fmt.Sprintf("Event approved by %s", user),
			)
		} else {
			addChangelogEntry(
				next,
				v1alpha1.ChangeType_updated,
				user,
				"",
				"",
				"",
				"Event updated",
			)
		}
	}

	if comment != "" {
		addChangelogEntry(next, v1alpha1.ChangeType_commented, user, "", "", "", comment)
	}

	return e.store.Update(context.Background(), filter, next)
}

// DeleteEvents implements the EventService.DeleteEvents RPC. The method is
// named DeleteEvents (plural) to match the generated EventServiceServer
// interface; the previous DeleteEvent (singular) name never satisfied that
// interface, so the RPC always fell back to the embedded unimplemented stub.
func (e *Event) DeleteEvents(
	ctx context.Context,
	i *v1alpha1.DeleteEventRequest,
) (*v1alpha1.DeleteEventResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}

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
