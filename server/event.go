package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/bananaops/tracker/internal/utils"
	"google.golang.org/protobuf/types/known/durationpb"
)

type Event struct {
	v1alpha1.UnimplementedEventServiceServer
	store  *store.EventStoreClient
	logger *slog.Logger
}

func NewEvent() *Event {
	return &Event{
		UnimplementedEventServiceServer: v1alpha1.UnimplementedEventServiceServer{},
		store:                           store.NewStoreEvent(config.ConfigDatabase.EventCollection),
		logger:                          slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.CreateEventResponse, error) {

	var event = &v1alpha1.Event{
		Title: i.Title,
		Attributes: &v1alpha1.EventAttributes{
			Message:   i.Attributes.Message,
			Source:    i.Attributes.Source,
			Type:      i.Attributes.Type,
			Priority:  i.Attributes.Priority,
			RelatedId: i.Attributes.RelatedId,
			Service:   i.Attributes.Service,
			Status:    i.Attributes.Status,
		},
		Links: &v1alpha1.EventLinks{
			PullRequestLink: i.Links.PullRequestLink,
		},
		Metadata: &v1alpha1.EventMetadata{},
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

	var eventResult = &v1alpha1.CreateEventResponse{}
	var err error
	eventResult.Event, err = e.store.Create(context.Background(), event)
	if err != nil {
		return nil, err
	}

	// log event to json format
	e.logger.Info("event created",
		"title", eventResult.Event.Title,
		"message", eventResult.Event.Attributes.Message,
		"priority", eventResult.Event.Attributes.Priority.String(),
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

	eventResult.Event, err = e.store.Get(context.Background(), map[string]interface{}{"metadata.id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
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
