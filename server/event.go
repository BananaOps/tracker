package server

import (
	"context"

	v1alpha1 "github.com/bananaops/events-tracker/generated/proto/event/v1alpha1"
	store "github.com/bananaops/events-tracker/internal/stores"
)

type Event struct {
	v1alpha1.UnimplementedEventServiceServer
	EventsDb store.MongoClient
}

func NewEvent() *Event {
	return &Event{
		UnimplementedEventServiceServer: v1alpha1.UnimplementedEventServiceServer{},
		EventsDb:                        store.NewClient(),
	}
}

func (t *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.CreateEventResponse, error) {

	eventResult := &v1alpha1.CreateEventResponse{
		Event: &v1alpha1.Event{
			Title: i.Title,
			Attributes: &v1alpha1.EventAttributes{
				Message:   "",
				Source:    "",
				Type:      0,
				Priority:  0,
				RelatedId: "",
				Service:   "",
				Status:    0,
			},
			Links:    &v1alpha1.EventLinks{},
			Metadata: &v1alpha1.EventMetadata{},
		},
	}

	return eventResult, nil
}

func (t *Event) GetEvent(
	ctx context.Context,
	i *v1alpha1.GetEventRequest,
) (*v1alpha1.GetEventResponse, error) {

	eventResult := &v1alpha1.GetEventResponse{
		Event: &v1alpha1.Event{
			Title:      "",
			Attributes: &v1alpha1.EventAttributes{},
			Links:      &v1alpha1.EventLinks{},
			Metadata:   &v1alpha1.EventMetadata{},
		},
	}

	return eventResult, nil
}

func (t *Event) SearchEvents(
	ctx context.Context,
	i *v1alpha1.SearchEventsRequest,
) (*v1alpha1.SearchEventsResponse, error) {

	eventsResult := &v1alpha1.SearchEventsResponse{
		Events:     map[string]*v1alpha1.Event{},
		TotalCount: 0,
	}

	return eventsResult, nil
}

func (t *Event) ListEvents(
	ctx context.Context,
	i *v1alpha1.ListEventsRequest,
) (*v1alpha1.ListEventsResponse, error) {

	eventsResult := &v1alpha1.ListEventsResponse{
		Events:     map[string]*v1alpha1.Event{},
		TotalCount: 0,
	}

	return eventsResult, nil
}
