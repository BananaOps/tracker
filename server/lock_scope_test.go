package server

import (
	"context"
	"testing"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
)

const lockSvc = "/tracker.lock.v1alpha1.LockService/"

type lockScopeEnv struct {
	*scopeEnv
	la, lb, le string
}

func newLockScopeEnv(t *testing.T) *lockScopeEnv {
	t.Helper()
	x := newScopeEnv(t)
	return &lockScopeEnv{
		scopeEnv: x,
		la:       seedLock(t, x.s, "svc-a"),
		lb:       seedLock(t, x.s, "svc-b"),
		le:       seedLock(t, x.s, ""),
	}
}

func (x *lockScopeEnv) lctx(p auth.Principal, method string) context.Context {
	return scopeCtx(p, lockSvc+method)
}

func (x *lockScopeEnv) lock(t *testing.T, id string) *lockv1.Lock {
	t.Helper()
	l, err := x.s.lockStore.Get(context.Background(), map[string]interface{}{"id": id})
	require.NoError(t, err)
	return l
}

func (x *lockScopeEnv) hasLock(t *testing.T, filter map[string]interface{}) bool {
	t.Helper()
	_, err := x.s.lockStore.Get(context.Background(), filter)
	if err == mongo.ErrNoDocuments {
		return false
	}
	require.NoError(t, err)
	return true
}

func countChange(e *eventv1.Event, ct eventv1.ChangeType) int {
	n := 0
	for _, c := range e.Changelog {
		if c.ChangeType == ct {
			n++
		}
	}
	return n
}

func createLockReq(service, env, eventID string) *lockv1.CreateLockRequest {
	return &lockv1.CreateLockRequest{Service: service, Who: "alice", Environment: env, Resource: "deployment", EventId: eventID}
}

func TestCreateLockScope(t *testing.T) {
	x := newLockScopeEnv(t)
	create := func(p auth.Principal, svc string) error {
		_, err := x.s.locks.CreateLock(x.lctx(p, "CreateLock"), createLockReq(svc, "staging", ""))
		return err
	}
	require.NoError(t, create(x.pa, "svc-a"))
	requireDenied(t, create(x.pa, "svc-b"))
	require.False(t, x.hasLock(t, map[string]interface{}{"service": "svc-b", "environment": "staging"}))
	requireDenied(t, create(x.pa, ""))
	requireDenied(t, create(x.none, "svc-a"))
	require.NoError(t, create(x.all, "svc-b"))
}

func TestCreateLockLinkedEventScope(t *testing.T) {
	x := newLockScopeEnv(t)
	create := func(p auth.Principal, svc, env, eventID string) error {
		_, err := x.s.locks.CreateLock(x.lctx(p, "CreateLock"), createLockReq(svc, env, eventID))
		return err
	}
	before := len(x.stored(t, x.b).Changelog)
	requireDenied(t, create(x.pa, "svc-a", "uat", x.b))
	require.False(t, x.hasLock(t, map[string]interface{}{"service": "svc-a", "environment": "uat"}))
	require.Len(t, x.stored(t, x.b).Changelog, before)

	require.NoError(t, create(x.pa, "svc-a", "uat", x.a))
	require.Equal(t, 1, countChange(x.stored(t, x.a), eventv1.ChangeType_locked))

	require.NoError(t, create(x.pa, "svc-a", "dev", "6f1c1c6e-2f0a-4b57-9d3a-1c2f3a4b5c6d"))

	require.NoError(t, create(x.all, "svc-b", "uat", x.b))
	require.Equal(t, 1, countChange(x.stored(t, x.b), eventv1.ChangeType_locked))
}

func TestGetLockScope(t *testing.T) {
	x := newLockScopeEnv(t)
	get := func(p auth.Principal, id string) error {
		_, err := x.s.locks.GetLock(x.lctx(p, "GetLock"), &lockv1.GetLockRequest{Id: id})
		return err
	}
	require.NoError(t, get(x.pa, x.la))
	requireDenied(t, get(x.pa, x.lb))
	requireDenied(t, get(x.pa, x.le))
	requireDenied(t, get(x.none, x.la))
	require.NoError(t, get(x.all, x.le))
}

func TestUpdateLockScope(t *testing.T) {
	x := newLockScopeEnv(t)
	update := func(p auth.Principal, req *lockv1.UpdateLockRequest) error {
		_, err := x.s.locks.UpdateLock(x.lctx(p, "UpdateLock"), req)
		return err
	}
	require.NoError(t, update(x.pa, &lockv1.UpdateLockRequest{Id: x.la, Who: "bob"}))
	require.Equal(t, "bob", x.lock(t, x.la).Who)

	requireDenied(t, update(x.pa, &lockv1.UpdateLockRequest{Id: x.lb, Who: "bob"}))
	require.Equal(t, "seed", x.lock(t, x.lb).Who)

	requireDenied(t, update(x.pa, &lockv1.UpdateLockRequest{Id: x.la, Service: "svc-b"}))
	require.Equal(t, "svc-a", x.lock(t, x.la).Service)

	requireDenied(t, update(x.none, &lockv1.UpdateLockRequest{Id: x.la, Who: "eve"}))

	before := len(x.stored(t, x.b).Changelog)
	requireDenied(t, update(x.pa, &lockv1.UpdateLockRequest{Id: x.la, EventId: x.b}))
	require.Empty(t, x.lock(t, x.la).EventId)
	require.Len(t, x.stored(t, x.b).Changelog, before)
	require.NoError(t, update(x.pa, &lockv1.UpdateLockRequest{Id: x.la, EventId: x.a}))
	require.Equal(t, x.a, x.lock(t, x.la).EventId)

	require.NoError(t, update(x.pab, &lockv1.UpdateLockRequest{Id: x.la, Service: "svc-b"}))
	require.Equal(t, "svc-b", x.lock(t, x.la).Service)
}

func TestUnLockScope(t *testing.T) {
	x := newLockScopeEnv(t)
	unlock := func(p auth.Principal, id string) (*lockv1.UnLockResponse, error) {
		return x.s.locks.UnLock(x.lctx(p, "UnLock"), &lockv1.UnLockRequest{Id: id})
	}
	_, err := unlock(x.pa, x.lb)
	requireDenied(t, err)
	require.True(t, x.hasLock(t, map[string]interface{}{"id": x.lb}))
	_, err = unlock(x.pa, x.le)
	requireDenied(t, err)
	require.True(t, x.hasLock(t, map[string]interface{}{"id": x.le}))
	r, err := unlock(x.pa, x.la)
	require.NoError(t, err)
	require.EqualValues(t, 1, r.Count)
	require.False(t, x.hasLock(t, map[string]interface{}{"id": x.la}))
	_, err = unlock(x.none, x.lb)
	requireDenied(t, err)
	require.True(t, x.hasLock(t, map[string]interface{}{"id": x.lb}))
	_, err = unlock(x.all, x.lb)
	require.NoError(t, err)
}

// UnLock of an in-scope lock stays allowed when the linked event is out of
// scope, but nothing is written to that event.
func TestUnLockLinkedOutOfScopeEvent(t *testing.T) {
	x := newLockScopeEnv(t)
	_, err := x.s.locks.CreateLock(x.lctx(x.all, "CreateLock"), createLockReq("svc-a", "uat", x.b))
	require.NoError(t, err)
	l, err := x.s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc-a", "environment": "uat"})
	require.NoError(t, err)
	locked := countChange(x.stored(t, x.b), eventv1.ChangeType_locked)

	r, err := x.s.locks.UnLock(x.lctx(x.pa, "UnLock"), &lockv1.UnLockRequest{Id: l.Id})
	require.NoError(t, err)
	require.EqualValues(t, 1, r.Count)
	require.False(t, x.hasLock(t, map[string]interface{}{"id": l.Id}))
	require.Equal(t, 0, countChange(x.stored(t, x.b), eventv1.ChangeType_unlocked))
	require.Equal(t, locked, countChange(x.stored(t, x.b), eventv1.ChangeType_locked))
}

func TestUnLockLinkedInScopeEventWritesChangelog(t *testing.T) {
	x := newLockScopeEnv(t)
	_, err := x.s.locks.CreateLock(x.lctx(x.pa, "CreateLock"), createLockReq("svc-a", "uat", x.a))
	require.NoError(t, err)
	l, err := x.s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc-a", "environment": "uat"})
	require.NoError(t, err)
	_, err = x.s.locks.UnLock(x.lctx(x.pa, "UnLock"), &lockv1.UnLockRequest{Id: l.Id})
	require.NoError(t, err)
	require.Equal(t, 1, countChange(x.stored(t, x.a), eventv1.ChangeType_unlocked))
}

// A principal holding both services moves a lock onto an event of the other
// service, then a user scoped to the lock service only releases it.
func TestUnLockNonAdminCrossLink(t *testing.T) {
	x := newLockScopeEnv(t)
	// lock on svc-a linked to the svc-b event: allowed for pab (both in scope)
	_, err := x.s.locks.UpdateLock(x.lctx(x.pab, "UpdateLock"), &lockv1.UpdateLockRequest{Id: x.la, EventId: x.b})
	require.NoError(t, err)

	_, err = x.s.locks.UnLock(x.lctx(x.pa, "UnLock"), &lockv1.UnLockRequest{Id: x.la})
	require.NoError(t, err)
	require.False(t, x.hasLock(t, map[string]interface{}{"id": x.la}))
	require.Equal(t, 0, countChange(x.stored(t, x.b), eventv1.ChangeType_unlocked))
}

func TestUpdateLockEmptyServiceAndUnknownEvent(t *testing.T) {
	x := newLockScopeEnv(t)
	_, err := x.s.locks.UpdateLock(x.lctx(x.pa, "UpdateLock"), &lockv1.UpdateLockRequest{Id: x.le, Who: "bob", Service: "svc-a"})
	requireDenied(t, err)
	l := x.lock(t, x.le)
	require.Equal(t, "seed", l.Who)
	require.Empty(t, l.Service)

	unknown := "6f1c1c6e-2f0a-4b57-9d3a-1c2f3a4b5c6d"
	_, err = x.s.locks.UpdateLock(x.lctx(x.pa, "UpdateLock"), &lockv1.UpdateLockRequest{Id: x.la, EventId: unknown})
	require.NoError(t, err)
	require.Equal(t, unknown, x.lock(t, x.la).EventId)
}

func TestListLocksScope(t *testing.T) {
	x := newLockScopeEnv(t)
	list := func(p auth.Principal) *lockv1.ListLocksResponse {
		r, err := x.s.locks.ListLocks(x.lctx(p, "ListLocks"), &lockv1.ListLocksRequest{})
		require.NoError(t, err)
		return r
	}
	r := list(x.pa)
	require.Len(t, r.Locks, 1)
	require.Equal(t, x.la, r.Locks[0].Id)
	require.EqualValues(t, 1, r.TotalCount)
	require.Empty(t, list(x.none).Locks)
	require.Len(t, list(x.all).Locks, 3)
}

func TestCreateEventTakesLockWithinScope(t *testing.T) {
	x := newScopeEnv(t)
	attrs := func(svc string, st eventv1.Status) *eventv1.EventAttributes {
		a := scopeAttrs(svc)
		a.Type, a.Status = eventv1.Type_deployment, st
		return a
	}
	ctx := x.ctx(x.pa, "CreateEvent")
	r, err := x.s.events.CreateEvent(ctx, &eventv1.CreateEventRequest{Title: "d", Attributes: attrs("svc-a", eventv1.Status_start), Links: &eventv1.EventLinks{}})
	require.NoError(t, err)
	id := r.Event.Metadata.Id
	l, err := x.s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc-a"})
	require.NoError(t, err)
	require.Equal(t, id, l.EventId)

	_, err = x.s.events.UpdateEvent(x.ctx(x.pa, "UpdateEvent"), &eventv1.UpdateEventRequest{
		Id: id, Title: "d", Attributes: attrs("svc-a", eventv1.Status_success), Links: &eventv1.EventLinks{},
	})
	require.NoError(t, err)
	_, err = x.s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc-a"})
	require.ErrorIs(t, err, mongo.ErrNoDocuments)

	_, err = x.s.events.CreateEvent(ctx, &eventv1.CreateEventRequest{Title: "d", Attributes: attrs("svc-b", eventv1.Status_start), Links: &eventv1.EventLinks{}})
	requireDenied(t, err)
	_, err = x.s.lockStore.Get(context.Background(), map[string]interface{}{"service": "svc-b"})
	require.ErrorIs(t, err, mongo.ErrNoDocuments)
}
