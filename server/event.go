package server

import (
	"context"
	"fmt"
	"time"

	v1alpha1 "github.com/bananaops/events-tracker/generated/proto/event/v1alpha1"
	store "github.com/bananaops/events-tracker/internal/stores"
	"google.golang.org/protobuf/types/known/durationpb"
)

type Event struct {
	v1alpha1.UnimplementedEventServiceServer
	store store.MongoClient
}

func NewEvent() *Event {
	return &Event{
		UnimplementedEventServiceServer: v1alpha1.UnimplementedEventServiceServer{},
		store:                           store.NewClient(),
	}
}

func (e *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.Event, error) {

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
				return nil, fmt.Errorf("no event found in events-tracker for attributes.related_id %s", i.Attributes.RelatedId)
			}
			return nil, err
		}

		event.Metadata.Duration = durationpb.New(time.Since(relatedEvent.Metadata.CreatedAt.AsTime()))

	}

	eventResult, err := e.store.Create(context.Background(), event)
	if err != nil {
		return nil, err
	}

	return eventResult, nil
}

func (e *Event) GetEvent(
	ctx context.Context,
	i *v1alpha1.GetEventRequest,
) (*v1alpha1.Event, error) {

	eventResult := &v1alpha1.Event{
		Title:      "",
		Attributes: &v1alpha1.EventAttributes{},
		Links:      &v1alpha1.EventLinks{},
		Metadata:   &v1alpha1.EventMetadata{},
	}
	return eventResult, nil
}

func (e *Event) SearchEvents(
	ctx context.Context,
	i *v1alpha1.SearchEventsRequest,
) (*v1alpha1.SearchEventsResponse, error) {

	eventsResult := &v1alpha1.SearchEventsResponse{
		Events:     map[string]*v1alpha1.Event{},
		TotalCount: 0,
	}

	return eventsResult, nil
}

func (e *Event) ListEvents(
	ctx context.Context,
	i *v1alpha1.ListEventsRequest,
) (*v1alpha1.ListEventsResponse, error) {

	eventsResult := &v1alpha1.ListEventsResponse{
		Events:     map[string]*v1alpha1.Event{},
		TotalCount: 0,
	}

	return eventsResult, nil
}
