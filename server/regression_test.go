package server

import (
	"context"
	"strings"
	"sync"
	"testing"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// Regressions found by the backend audit. They run against MongoDB
// (MONGO_TEST_URI) with an unrestricted principal.

func eventCtx(rpc string) context.Context {
	return scopeCtx(allScopePrincipal(), "/tracker.event.v1alpha1.EventService/"+rpc)
}

func lockCtx(rpc string) context.Context {
	return scopeCtx(allScopePrincipal(), "/tracker.lock.v1alpha1.LockService/"+rpc)
}

func catalogCtx(rpc string) context.Context {
	return scopeCtx(allScopePrincipal(), "/tracker.catalog.v1alpha1.CatalogService/"+rpc)
}

func incident(service string) *eventv1.EventAttributes {
	return &eventv1.EventAttributes{
		Message: "m", Source: "audit", Type: eventv1.Type_incident, Priority: eventv1.Priority_P3,
		Service: service, Status: eventv1.Status_open, Environment: eventv1.Environment_production, Owner: "audit",
	}
}

func TestCreateEventWithoutLinks(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	r, err := s.events.CreateEvent(eventCtx("CreateEvent"), &eventv1.CreateEventRequest{Title: "no links", Attributes: incident("svc")})
	require.NoError(t, err)
	assert.NotEmpty(t, r.Event.GetMetadata().GetId())
}

func TestCreateEventWithoutAttributesIsInvalid(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	_, err := s.events.CreateEvent(eventCtx("CreateEvent"), &eventv1.CreateEventRequest{Title: "no attributes"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err), err)
}

func TestUpdateEventWithoutAttributesIsInvalid(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	id := seedEvent(t, s, "svc")
	_, err := s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: id, Title: "x"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err), err)
}

func TestUpdateEventReturnsTheUpdatedEvent(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	id := seedEvent(t, s, "svc")
	r, err := s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: id, Title: "renamed", Attributes: incident("svc")})
	require.NoError(t, err)
	assert.Equal(t, "renamed", r.Event.GetTitle())
}

func TestUpdateEventByIDKeepsItsSlackID(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	created, err := s.events.CreateEvent(eventCtx("CreateEvent"), &eventv1.CreateEventRequest{Title: "t", Attributes: incident("svc"), SlackId: "1700000000.000100"})
	require.NoError(t, err)

	_, err = s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: created.Event.Metadata.Id, Title: "t2", Attributes: incident("svc")})
	require.NoError(t, err)

	stored, err := s.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": created.Event.Metadata.Id})
	require.NoError(t, err)
	assert.Equal(t, "1700000000.000100", stored.GetMetadata().GetSlackId())
}

func TestUpdateEventByIDWhenEveryEventHasASlackID(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	created, err := s.events.CreateEvent(eventCtx("CreateEvent"), &eventv1.CreateEventRequest{Title: "t", Attributes: incident("svc"), SlackId: "1700000000.000200"})
	require.NoError(t, err)

	_, err = s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: created.Event.Metadata.Id, Title: "t2", Attributes: incident("svc")})
	assert.NoError(t, err)
}

func TestUpdateEventKeepsTheDurationOfAFinishedEvent(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	id := seedEvent(t, s, "svc")
	done := incident("svc")
	done.Status = eventv1.Status_success
	first, err := s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: id, Title: "t", Attributes: done})
	require.NoError(t, err)
	require.NotNil(t, first.Event.GetMetadata().GetDuration())

	second, err := s.events.UpdateEvent(eventCtx("UpdateEvent"), &eventv1.UpdateEventRequest{Id: id, Title: "t", Attributes: done, Links: &eventv1.EventLinks{Ticket: "OPS-1"}})
	require.NoError(t, err)
	assert.Equal(t, first.Event.GetMetadata().GetDuration().AsDuration(), second.Event.GetMetadata().GetDuration().AsDuration())
}

func TestAddSlackIDReturnsTheUpdatedEvent(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	id := seedEvent(t, s, "svc")
	r, err := s.events.AddSlackId(eventCtx("AddSlackId"), &eventv1.AddSlackIdRequest{Id: id, SlackId: "1700000000.000300"})
	require.NoError(t, err)
	assert.Equal(t, "1700000000.000300", r.Event.GetMetadata().GetSlackId())
}

func TestChangelogPaginationDoesNotOverflow(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	created, err := s.events.CreateEvent(eventCtx("CreateEvent"), &eventv1.CreateEventRequest{Title: "t", Attributes: incident("svc"), Links: &eventv1.EventLinks{}})
	require.NoError(t, err)

	for _, p := range []struct{ perPage, page uint32 }{
		{4294967295, 1}, // per_page becomes -1 once converted to int32
		{100000, 100000},
		{0, 1},
	} {
		r, err := s.events.GetEventChangelog(eventCtx("GetEventChangelog"), &eventv1.GetEventChangelogRequest{
			Id: created.Event.Metadata.Id, PerPage: wrapperspb.UInt32(p.perPage), Page: wrapperspb.Int32(int32(p.page)), // #nosec G115 -- test values
		})
		require.NoError(t, err, "%+v", p)
		assert.LessOrEqual(t, len(r.Changelog), 1, "%+v", p)
	}
}

func TestUpdateLockReturnsTheUpdatedLock(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	id := seedLock(t, s, "svc")
	r, err := s.locks.UpdateLock(lockCtx("UpdateLock"), &lockv1.UpdateLockRequest{Id: id, Who: "someone-else"})
	require.NoError(t, err)
	assert.Equal(t, "someone-else", r.Lock.GetWho())
}

func TestConcurrentLocksOnTheSameResource(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	const n = 8
	var wg sync.WaitGroup
	errs := make([]error, n)
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, errs[i] = s.locks.CreateLock(lockCtx("CreateLock"), &lockv1.CreateLockRequest{
				Service: "svc", Environment: "production", Resource: "deployment", Who: "ci",
			})
		}()
	}
	wg.Wait()

	succeeded := 0
	for _, err := range errs {
		if err == nil {
			succeeded++
		}
	}
	assert.Equal(t, 1, succeeded, "exactly one concurrent lock may win: %v", errs)
	locks, err := s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc"})
	require.NoError(t, err)
	assert.NotEmpty(t, locks.GetId())
}

func TestCatalogUpdateKeepsCreatedAt(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	req := &catalogv1.CreateUpdateCatalogRequest{Name: "svc", Owner: "team", Version: "1.0.0", Type: catalogv1.Type_project}
	created, err := s.catalogs.CreateUpdateCatalog(catalogCtx("CreateUpdateCatalog"), req)
	require.NoError(t, err)
	require.NotNil(t, created.Catalog.GetCreatedAt())

	req.Version = "1.1.0"
	updated, err := s.catalogs.CreateUpdateCatalog(catalogCtx("CreateUpdateCatalog"), req)
	require.NoError(t, err)
	require.NotNil(t, updated.Catalog.GetCreatedAt())
	assert.Equal(t, created.Catalog.GetCreatedAt().AsTime(), updated.Catalog.GetCreatedAt().AsTime())
}

func TestUpdateLockOntoALockedResourceIsRefused(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	a := seedLock(t, s, "svc-a")
	seedLock(t, s, "svc-b")

	_, err := s.locks.UpdateLock(lockCtx("UpdateLock"), &lockv1.UpdateLockRequest{Id: a, Service: "svc-b"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already locked")
	stored, err := s.lockStore.Get(context.Background(), map[string]interface{}{"id": a})
	require.NoError(t, err)
	assert.Equal(t, "svc-a", stored.GetService())
}

func TestRelatedEventOutsideTheScopeLooksMissing(t *testing.T) {
	s := newScopeServices(t, scopeDB(t))
	other := seedEvent(t, s, "svc-b")
	ctx := scopeCtx(scopedPrincipal("svc-a"), "/tracker.event.v1alpha1.EventService/CreateEvent")

	create := func(relatedID string) error {
		attrs := incident("svc-a")
		attrs.RelatedId = relatedID
		_, err := s.events.CreateEvent(ctx, &eventv1.CreateEventRequest{Title: "t", Attributes: attrs})
		return err
	}
	outOfScope := create(other)
	missing := create("6f1c1e5e-0000-4000-8000-000000000000")
	require.Error(t, outOfScope)
	require.Error(t, missing)
	assert.Equal(t,
		strings.Replace(missing.Error(), "6f1c1e5e-0000-4000-8000-000000000000", other, 1),
		outOfScope.Error(), "an out-of-scope related event answers like a missing one")

	_, err := s.events.CreateEvent(scopeCtx(scopedPrincipal("svc-a", "svc-b"), "/tracker.event.v1alpha1.EventService/CreateEvent"),
		&eventv1.CreateEventRequest{Title: "t", Attributes: &eventv1.EventAttributes{
			Service: "svc-a", Type: eventv1.Type_incident, Status: eventv1.Status_open, RelatedId: other,
		}})
	assert.NoError(t, err, "a caller that sees the related event can link it")
}
