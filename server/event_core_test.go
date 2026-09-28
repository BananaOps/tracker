package server

import (
	"context"
	"testing"
	"time"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/require"
)

// baseCreateEventRequest returns the CreateEventRequest used by every
// characterization test: a deployment start on svc/production owned by alice.
func baseCreateEventRequest() *v1alpha1.CreateEventRequest {
	return &v1alpha1.CreateEventRequest{
		Title: "deploy svc",
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_start,
			Service:     "svc",
			Environment: v1alpha1.Environment_production,
			Owner:       "alice",
			Priority:    v1alpha1.Priority_P3,
			Source:      "manual",
		},
		Links: &v1alpha1.EventLinks{},
	}
}

func TestCreateEventRPCTakesAndLinksLock(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	resp, err := e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.NoError(t, err)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "alice", locks[0].Who)
	require.Equal(t, "production", locks[0].Environment)
	require.Equal(t, "deployment", locks[0].Resource)
	require.Equal(t, resp.Event.Metadata.Id, locks[0].EventId)

	require.NotEmpty(t, resp.Event.Changelog)
	require.Equal(t, v1alpha1.ChangeType_created, resp.Event.Changelog[0].ChangeType)
	require.Equal(t, "alice", resp.Event.Changelog[0].User)
	require.Equal(t, "Event created", resp.Event.Changelog[0].Comment)
}

func TestCreateEventRPCRefusesLockedService(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	_, err := store.NewStoreLockFromCollection(db.Collection("locks")).Create(context.Background(), &lockv1.Lock{
		Service: "svc", Environment: "production", Resource: "deployment", Who: "bob",
	})
	require.NoError(t, err)

	_, err = e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.Error(t, err)
	require.EqualError(t, err, "cannot create event: service svc is already locked in production. Please unlock it first")

	events, err := store.NewStoreEventFromCollection(db.Collection("events")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, events, 0)
}

func TestUpdateEventRPCReleasesLockOnSuccess(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	created, err := e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.NoError(t, err)
	id := created.Event.Metadata.Id

	req := baseCreateEventRequest()
	req.Attributes.Status = v1alpha1.Status_success
	_, err = e.UpdateEvent(eventRPCCtx("UpdateEvent"), &v1alpha1.UpdateEventRequest{
		Id:         id,
		Title:      "deploy svc",
		Attributes: req.Attributes,
		Links:      &v1alpha1.EventLinks{},
	})
	require.NoError(t, err)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 0)

	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": id})
	require.NoError(t, err)
	require.Equal(t, v1alpha1.Status_success, updated.Attributes.Status)
	require.NotNil(t, updated.Metadata.Duration)

	var statusChanged *v1alpha1.ChangelogEntry
	for _, entry := range updated.Changelog {
		if entry.ChangeType == v1alpha1.ChangeType_status_changed {
			statusChanged = entry
		}
	}
	require.NotNil(t, statusChanged)
	require.Equal(t, "status", statusChanged.Field)
	require.Equal(t, "start", statusChanged.OldValue)
	require.Equal(t, "success", statusChanged.NewValue)
	require.Equal(t, "alice", statusChanged.User)
}

func TestCreateEventRPCIncidentTakesNoLock(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	req := baseCreateEventRequest()
	req.Attributes.Type = v1alpha1.Type_incident
	_, err := e.CreateEvent(eventRPCCtx("CreateEvent"), req)
	require.NoError(t, err)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 0)
}

// -- Step 4: new tests, red until the core refactor lands. --

func TestCreateEventObserveRecordsConflict(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	_, err := store.NewStoreLockFromCollection(db.Collection("locks")).Create(context.Background(), &lockv1.Lock{
		Service: "svc", Environment: "production", Resource: "deployment", Who: "alice",
	})
	require.NoError(t, err)

	ev := &v1alpha1.Event{
		Title: "deploy svc",
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_start,
			Service:     "svc",
			Environment: v1alpha1.Environment_production,
			Owner:       "alice",
			Priority:    v1alpha1.Priority_P3,
			Source:      "manual",
		},
		Links:    &v1alpha1.EventLinks{},
		Metadata: &v1alpha1.EventMetadata{},
	}

	created, conflict, err := e.createEvent(context.Background(), ev, "gitlab:bob", "", lockObserve)
	require.NoError(t, err)
	require.NotNil(t, conflict)
	require.Equal(t, "alice", conflict.Who)

	var commented *v1alpha1.ChangelogEntry
	for _, entry := range created.Changelog {
		if entry.ChangeType == v1alpha1.ChangeType_commented {
			commented = entry
		}
	}
	require.NotNil(t, commented)
	require.Equal(t, "Deployed while svc was locked in production by alice", commented.Comment)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "alice", locks[0].Who)
	require.Equal(t, "", locks[0].EventId)
}

func TestCreateEventObserveTakesLock(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	ev := &v1alpha1.Event{
		Title: "deploy svc",
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_start,
			Service:     "svc",
			Environment: v1alpha1.Environment_production,
			Owner:       "alice",
			Priority:    v1alpha1.Priority_P3,
			Source:      "manual",
		},
		Links:    &v1alpha1.EventLinks{},
		Metadata: &v1alpha1.EventMetadata{},
	}

	created, conflict, err := e.createEvent(context.Background(), ev, "gitlab:bob", "", lockObserve)
	require.NoError(t, err)
	require.Nil(t, conflict)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "gitlab:bob", locks[0].Who)
	require.Equal(t, created.Metadata.Id, locks[0].EventId)
}

func TestCreateEventObserveTerminalTakesNoLock(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	ev := &v1alpha1.Event{
		Title: "deploy svc",
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_success,
			Service:     "svc",
			Environment: v1alpha1.Environment_production,
			Owner:       "alice",
			Priority:    v1alpha1.Priority_P3,
			Source:      "manual",
		},
		Links:    &v1alpha1.EventLinks{},
		Metadata: &v1alpha1.EventMetadata{},
	}

	_, conflict, err := e.createEvent(context.Background(), ev, "gitlab:bob", "", lockObserve)
	require.NoError(t, err)
	require.Nil(t, conflict)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 0)
}

func TestUpdateEventUsesExplicitTime(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	ev := &v1alpha1.Event{
		Title: "deploy svc",
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_start,
			Service:     "svc",
			Environment: v1alpha1.Environment_production,
			Owner:       "alice",
			Priority:    v1alpha1.Priority_P3,
			Source:      "manual",
		},
		Links:    &v1alpha1.EventLinks{},
		Metadata: &v1alpha1.EventMetadata{},
	}
	created, _, err := e.createEvent(context.Background(), ev, "alice", "", lockStrict)
	require.NoError(t, err)
	id := created.Metadata.Id

	current, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": id})
	require.NoError(t, err)

	next := &v1alpha1.Event{
		Title: current.Title,
		Attributes: &v1alpha1.EventAttributes{
			Message:       current.Attributes.Message,
			Source:        current.Attributes.Source,
			Type:          current.Attributes.Type,
			Priority:      current.Attributes.Priority,
			Impact:        current.Attributes.Impact,
			Environment:   current.Attributes.Environment,
			Owner:         current.Attributes.Owner,
			RelatedId:     current.Attributes.RelatedId,
			Service:       current.Attributes.Service,
			Status:        v1alpha1.Status_success,
			StartDate:     current.Attributes.StartDate,
			EndDate:       current.Attributes.EndDate,
			StakeHolders:  current.Attributes.StakeHolders,
			Notification:  current.Attributes.Notification,
			Notifications: current.Attributes.Notifications,
		},
		Links: &v1alpha1.EventLinks{
			PullRequestLink: current.Links.PullRequestLink,
			Ticket:          current.Links.Ticket,
		},
		Metadata: &v1alpha1.EventMetadata{
			Id:        current.Metadata.Id,
			CreatedAt: current.Metadata.CreatedAt,
			SlackId:   current.Metadata.SlackId,
		},
	}

	at := current.Metadata.CreatedAt.AsTime().Add(90 * time.Second)
	_, err = e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": id}, "gitlab:bob", "Deployment canceled", at)
	require.NoError(t, err)

	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": id})
	require.NoError(t, err)
	require.NotNil(t, updated.Metadata.Duration)
	require.Equal(t, 90*time.Second, updated.Metadata.Duration.AsDuration())

	last := updated.Changelog[len(updated.Changelog)-1]
	require.Equal(t, v1alpha1.ChangeType_commented, last.ChangeType)
	require.Equal(t, "Deployment canceled", last.Comment)

	var statusChanged *v1alpha1.ChangelogEntry
	for _, entry := range updated.Changelog {
		if entry.ChangeType == v1alpha1.ChangeType_status_changed {
			statusChanged = entry
		}
	}
	require.NotNil(t, statusChanged)
	require.Equal(t, "gitlab:bob", statusChanged.User)
}

func TestCreateEventCountsOneAuthorization(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	before := gatheredCounter(t, "tracker_auth_requests_total", map[string]string{"principal": "user", "result": "allowed"})

	_, err := e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.NoError(t, err)

	after := gatheredCounter(t, "tracker_auth_requests_total", map[string]string{"principal": "user", "result": "allowed"})
	require.Equal(t, float64(1), after-before)
}
