package server

import (
	"context"

	v1alpha1 "github.com/bananaops/events-tracker/generated/proto/event/v1alpha1"
)

type Event struct {
	v1alpha1.UnimplementedEventServiceServer
}

func NewEvent() *Event {
	return &Event{}
}

func (t *Event) CreateEvent(
	ctx context.Context,
	i *v1alpha1.CreateEventRequest,
) (*v1alpha1.CreateEventResponse, error) {

	eventResult := &v1alpha1.CreateEventResponse{
		Event: &v1alpha1.EventResponse{
			Title:      "",
			Attributes: &v1alpha1.EventAttributes{},
			Links:      &v1alpha1.EventLinks{},
			Metadata:   &v1alpha1.EventMetadata{},
		},
	}

	return eventResult, nil
}
