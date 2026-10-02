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

// -- Task 10 (deferred T8): characterization tests for the remaining RPC
// behaviours, pinned green on the current code, no logic changed. --

func TestCreateEventRPCUnknownRelatedIDErrorText(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	req := baseCreateEventRequest()
	req.Attributes.RelatedId = "does-not-exist"

	_, err := e.CreateEvent(eventRPCCtx("CreateEvent"), req)
	require.EqualError(t, err, "no event found in tracker for attributes.related_id does-not-exist")
}

func TestCreateEventRPCKnownRelatedIDSetsPositiveDuration(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	related, err := e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.NoError(t, err)

	req := baseCreateEventRequest()
	req.Attributes.Service = "svc2"
	req.Attributes.RelatedId = related.Event.Metadata.Id
	resp, err := e.CreateEvent(eventRPCCtx("CreateEvent"), req)
	require.NoError(t, err)

	require.NotNil(t, resp.Event.Metadata.Duration)
	require.Greater(t, resp.Event.Metadata.Duration.AsDuration(), time.Duration(0))
}

func TestUpdateEventRPCUnknownSlackIDErrorText(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	req := baseCreateEventRequest()
	_, err := e.UpdateEvent(eventRPCCtx("UpdateEvent"), &v1alpha1.UpdateEventRequest{
		SlackId:    "SLACK-404",
		Title:      "deploy svc",
		Attributes: req.Attributes,
		Links:      &v1alpha1.EventLinks{},
	})
	require.EqualError(t, err, "no event found in tracker for id SLACK-404")
}

func TestUpdateEventRPCNoLockReleaseOnNonTerminalStatus(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)

	created, err := e.CreateEvent(eventRPCCtx("CreateEvent"), baseCreateEventRequest())
	require.NoError(t, err)
	id := created.Event.Metadata.Id

	req := baseCreateEventRequest()
	req.Attributes.Status = v1alpha1.Status_warning
	_, err = e.UpdateEvent(eventRPCCtx("UpdateEvent"), &v1alpha1.UpdateEventRequest{
		Id:         id,
		Title:      "deploy svc",
		Attributes: req.Attributes,
		Links:      &v1alpha1.EventLinks{},
	})
	require.NoError(t, err)

	locks, err := store.NewStoreLockFromCollection(db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, locks, 1, "a non-terminal status must not release the lock")
}

// baseEventForUpdate creates and returns a fresh deployment start event on
// service, for the updateEvent changelog characterization tests below.
func baseEventForUpdate(t *testing.T, e *Event, service string) *v1alpha1.Event {
	t.Helper()
	ev := &v1alpha1.Event{
		Title: "deploy " + service,
		Attributes: &v1alpha1.EventAttributes{
			Type:        v1alpha1.Type_deployment,
			Status:      v1alpha1.Status_start,
			Service:     service,
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
	return created
}

// copyEventForUpdate returns a new *v1alpha1.Event carrying the same fields
// as current, the shape updateEvent's "next" argument takes from every real
// caller (RPC or integration processor): a full copy with exactly one field
// then changed by the test.
func copyEventForUpdate(current *v1alpha1.Event) *v1alpha1.Event {
	return &v1alpha1.Event{
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
			Status:        current.Attributes.Status,
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
			Duration:  current.Metadata.Duration,
		},
	}
}

// changelogEntry returns the last changelog entry of changeType in entries,
// or nil.
func changelogEntry(entries []*v1alpha1.ChangelogEntry, changeType v1alpha1.ChangeType) *v1alpha1.ChangelogEntry {
	var found *v1alpha1.ChangelogEntry
	for _, entry := range entries {
		if entry.ChangeType == changeType {
			found = entry
		}
	}
	return found
}

func TestUpdateEventChangelogTicketLinked(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)
	current := baseEventForUpdate(t, e, "svc-ticket")

	next := copyEventForUpdate(current)
	next.Links.Ticket = "JIRA-1"

	// e.store.Update's FindOneAndUpdate defaults to returning the document
	// before the update, so the changelog it just wrote is re-read from the
	// store instead of taken from updateEvent's own return value.
	_, err := e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": current.Metadata.Id}, "alice", "", time.Now())
	require.NoError(t, err)
	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": current.Metadata.Id})
	require.NoError(t, err)

	entry := changelogEntry(updated.Changelog, v1alpha1.ChangeType_linked)
	require.NotNil(t, entry)
	require.Equal(t, "ticket", entry.Field)
	require.Equal(t, "", entry.OldValue)
	require.Equal(t, "JIRA-1", entry.NewValue)
	require.Equal(t, "Jira ticket linked", entry.Comment)
}

func TestUpdateEventChangelogPriorityUpdated(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)
	current := baseEventForUpdate(t, e, "svc-priority")

	next := copyEventForUpdate(current)
	next.Attributes.Priority = v1alpha1.Priority_P1

	_, err := e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": current.Metadata.Id}, "alice", "", time.Now())
	require.NoError(t, err)
	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": current.Metadata.Id})
	require.NoError(t, err)

	var entry *v1alpha1.ChangelogEntry
	for _, c := range updated.Changelog {
		if c.ChangeType == v1alpha1.ChangeType_updated && c.Field == "priority" {
			entry = c
		}
	}
	require.NotNil(t, entry)
	require.Equal(t, "P3", entry.OldValue)
	require.Equal(t, "P1", entry.NewValue)
	require.Equal(t, "Priority updated", entry.Comment)
}

func TestUpdateEventChangelogTitleUpdated(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)
	current := baseEventForUpdate(t, e, "svc-title")

	next := copyEventForUpdate(current)
	next.Title = "deploy svc-title v2"

	_, err := e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": current.Metadata.Id}, "alice", "", time.Now())
	require.NoError(t, err)
	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": current.Metadata.Id})
	require.NoError(t, err)

	var entry *v1alpha1.ChangelogEntry
	for _, c := range updated.Changelog {
		if c.ChangeType == v1alpha1.ChangeType_updated && c.Field == "title" {
			entry = c
		}
	}
	require.NotNil(t, entry)
	require.Equal(t, "deploy svc-title", entry.OldValue)
	require.Equal(t, "deploy svc-title v2", entry.NewValue)
	require.Equal(t, "Title updated", entry.Comment)
}

// TestUpdateEventChangelogApproval covers the owner-only change updateEvent
// treats as an approval: title, status and priority all unchanged, only the
// owner differs.
func TestUpdateEventChangelogApproval(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)
	current := baseEventForUpdate(t, e, "svc-approval")

	next := copyEventForUpdate(current)
	next.Attributes.Owner = "bob"

	_, err := e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": current.Metadata.Id}, "bob", "", time.Now())
	require.NoError(t, err)
	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": current.Metadata.Id})
	require.NoError(t, err)

	entry := changelogEntry(updated.Changelog, v1alpha1.ChangeType_approved)
	require.NotNil(t, entry)
	require.Equal(t, "bob", entry.User)
	require.Equal(t, "Event approved by bob", entry.Comment)
}

// TestUpdateEventChangelogGenericUpdate covers a change to a field none of
// the specific rules track (here, the message): no more specific entry was
// added, so the generic "Event updated" entry closes the changelog.
func TestUpdateEventChangelogGenericUpdate(t *testing.T) {
	db := testMongoDatabase(t)
	e := newTestEvent(t, db)
	current := baseEventForUpdate(t, e, "svc-generic")

	next := copyEventForUpdate(current)
	next.Attributes.Message = "new message"

	_, err := e.updateEvent(context.Background(), current, next, map[string]interface{}{"metadata.id": current.Metadata.Id}, "alice", "", time.Now())
	require.NoError(t, err)
	updated, err := store.NewStoreEventFromCollection(db.Collection("events")).Get(context.Background(), map[string]interface{}{"metadata.id": current.Metadata.Id})
	require.NoError(t, err)

	last := updated.Changelog[len(updated.Changelog)-1]
	require.Equal(t, v1alpha1.ChangeType_updated, last.ChangeType)
	require.Equal(t, "", last.Field)
	require.Equal(t, "", last.OldValue)
	require.Equal(t, "", last.NewValue)
	require.Equal(t, "Event updated", last.Comment)
}
