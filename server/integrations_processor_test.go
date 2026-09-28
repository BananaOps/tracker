package server

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
)

type fakeCatalog struct {
	mu      sync.Mutex
	entries []*catalogv1.Catalog
	err     error
	calls   int
}

func (f *fakeCatalog) List(context.Context) ([]*catalogv1.Catalog, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.entries, nil
}

func (f *fakeCatalog) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

type procEnv struct {
	db     *mongo.Database
	events *Event
	store  *store.IntegrationDeploymentStore
	proc   *IntegrationProcessor
	cat    *fakeCatalog
}

func newProcEnv(t *testing.T) *procEnv {
	t.Helper()
	db := testMongoDatabase(t)
	events := newTestEvent(t, db)
	st := store.NewIntegrationDeploymentStoreFromCollection(db.Collection("integration_deployments"))
	cat := &fakeCatalog{}
	proc := NewIntegrationProcessor(events, st, cat, slog.New(slog.NewJSONHandler(io.Discard, nil)))
	return &procEnv{db: db, events: events, store: st, proc: proc, cat: cat}
}

func obs(status eventv1.Status, at time.Time) integrations.Observation {
	return integrations.Observation{
		Key:           "gitlab:gitlab.example.com:42",
		Source:        "gitlab",
		Status:        status,
		At:            at,
		Terminal:      integrations.IsTerminal(status),
		Environment:   eventv1.Environment_production,
		Service:       integrations.ServiceHint{Name: "payments"},
		ShortRevision: "a1b2c3d4",
		Message:       "m",
		Owner:         "jdoe",
		User:          "gitlab:jdoe",
	}
}

func TestProcessCreateThenUpdate(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	res, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res.Outcome)
	require.NotEmpty(t, res.EventID)

	ev, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	require.Equal(t, "Deploy payments a1b2c3d4 to production", ev.Title)
	require.Equal(t, "gitlab", ev.Attributes.Source)
	require.Equal(t, eventv1.Type_deployment, ev.Attributes.Type)
	require.Equal(t, eventv1.Priority_P3, ev.Attributes.Priority)
	require.Equal(t, "jdoe", ev.Attributes.Owner)
	require.True(t, ev.Attributes.StartDate.AsTime().Equal(t0))
	require.Nil(t, ev.Attributes.EndDate)

	locks, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "gitlab:jdoe", locks[0].Who)
	require.Equal(t, res.EventID, locks[0].EventId)

	t1 := t0.Add(30 * time.Second)
	res2, err := env.proc.Process(ctx, obs(eventv1.Status_success, t1))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res2.Outcome)
	require.Equal(t, res.EventID, res2.EventID)

	updated, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	require.Equal(t, eventv1.Status_success, updated.Attributes.Status)
	require.True(t, updated.Attributes.EndDate.AsTime().Equal(t1))

	locks, err = store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)

	doc, err := env.store.Get(ctx, obs(eventv1.Status_start, t0).Key)
	require.NoError(t, err)
	require.Equal(t, "success", doc.Status)
	require.Equal(t, res.EventID, doc.EventID)
}

func TestProcessDuplicateAndStale(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	_, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0))
	require.NoError(t, err)

	t1 := t0.Add(1 * time.Second)
	res, err := env.proc.Process(ctx, obs(eventv1.Status_success, t1))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res.Outcome)

	ev, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	changelogLen := len(ev.Changelog)

	res2, err := env.proc.Process(ctx, obs(eventv1.Status_success, t1))
	require.NoError(t, err)
	require.Equal(t, outcomeDuplicate, res2.Outcome)

	res3, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0.Add(2*time.Second)))
	require.NoError(t, err)
	require.Equal(t, outcomeStale, res3.Outcome)

	ev2, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	require.Len(t, ev2.Changelog, changelogLen)
}

func TestProcessTerminalFirstTakesNoLock(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	res, err := env.proc.Process(ctx, obs(eventv1.Status_success, t0))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res.Outcome)

	ev, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	require.True(t, ev.Attributes.StartDate.AsTime().Equal(t0))
	require.True(t, ev.Attributes.EndDate.AsTime().Equal(t0))

	locks, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)

	res2, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0.Add(-10*time.Second)))
	require.NoError(t, err)
	require.Equal(t, outcomeStale, res2.Outcome)

	locks, err = store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)
}

func TestProcessLockConflict(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	_, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).Create(ctx, &lockv1.Lock{
		Service: "payments", Environment: "production", Resource: "deployment", Who: "alice",
	})
	require.NoError(t, err)

	res, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0))
	require.NoError(t, err)
	require.Equal(t, outcomeLockConflict, res.Outcome)

	ev, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	var commented *eventv1.ChangelogEntry
	for _, e := range ev.Changelog {
		if e.ChangeType == eventv1.ChangeType_commented {
			commented = e
		}
	}
	require.NotNil(t, commented)
	require.Equal(t, "Deployed while payments was locked in production by alice", commented.Comment)

	res2, err := env.proc.Process(ctx, obs(eventv1.Status_success, t0.Add(time.Second)))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res2.Outcome)

	locks, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "alice", locks[0].Who)
	require.Equal(t, "", locks[0].EventId)
}

func TestProcessCanceledReleasesLock(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	_, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0))
	require.NoError(t, err)

	warn := obs(eventv1.Status_warning, t0.Add(time.Second))
	warn.Comment = "Deployment canceled"
	res, err := env.proc.Process(ctx, warn)
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res.Outcome)

	ev, err := env.events.store.Get(ctx, map[string]interface{}{"metadata.id": res.EventID})
	require.NoError(t, err)
	last := ev.Changelog[len(ev.Changelog)-1]
	require.Equal(t, eventv1.ChangeType_commented, last.ChangeType)
	require.Equal(t, "Deployment canceled", last.Comment)

	locks, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)
}

func TestProcessApprovalThenStartTakesLock(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	_, err := env.proc.Process(ctx, obs(eventv1.Status_waiting_approval, t0))
	require.NoError(t, err)

	locks, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)

	t1 := t0.Add(5 * time.Second)
	res, err := env.proc.Process(ctx, obs(eventv1.Status_start, t1))
	require.NoError(t, err)

	locks, err = store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 1)
	require.Equal(t, "gitlab:jdoe", locks[0].Who)
	require.Equal(t, res.EventID, locks[0].EventId)

	t2 := t0.Add(10 * time.Second)
	_, err = env.proc.Process(ctx, obs(eventv1.Status_success, t2))
	require.NoError(t, err)

	locks, err = store.NewStoreLockFromCollection(env.db.Collection("locks")).List(ctx)
	require.NoError(t, err)
	require.Len(t, locks, 0)
}

func TestProcessUpdateFailureReverts(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)

	res, err := env.proc.Process(ctx, obs(eventv1.Status_start, t0))
	require.NoError(t, err)

	require.NoError(t, env.events.store.Delete(ctx, map[string]interface{}{"metadata.id": res.EventID}))

	_, err = env.proc.Process(ctx, obs(eventv1.Status_success, t0.Add(time.Second)))
	require.Error(t, err)

	doc, err := env.store.Get(ctx, obs(eventv1.Status_start, t0).Key)
	require.NoError(t, err)
	require.Equal(t, "start", doc.Status)
	require.True(t, doc.LastEventAt.Equal(t0))
}

func TestProcessWaitsForPendingClaim(t *testing.T) {
	env := newProcEnv(t)
	env.proc.pollInterval = 20 * time.Millisecond
	env.proc.pollTimeout = 500 * time.Millisecond
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)
	key := obs(eventv1.Status_start, t0).Key

	_, _, err := env.store.Claim(ctx, key, "gitlab", "start", t0, 1)
	require.NoError(t, err)

	idCh := make(chan string, 1)
	errCh := make(chan error, 1)
	go func() {
		ev := newIntegrationEvent(obs(eventv1.Status_start, t0), "payments")
		created, _, err := env.events.createEvent(ctx, ev, "gitlab:jdoe", "", lockObserve)
		if err != nil {
			errCh <- err
			return
		}
		idCh <- created.Metadata.Id
		time.Sleep(100 * time.Millisecond)
		errCh <- env.store.SetEventID(ctx, key, created.Metadata.Id)
	}()

	var expected string
	select {
	case expected = <-idCh:
	case err := <-errCh:
		t.Fatalf("create event: %v", err)
	}

	res, err := env.proc.Process(ctx, obs(eventv1.Status_success, t0.Add(time.Second)))
	require.NoError(t, err)
	require.Equal(t, outcomeRecorded, res.Outcome)
	require.Equal(t, expected, res.EventID)
}

func TestProcessPendingClaimTimesOut(t *testing.T) {
	env := newProcEnv(t)
	env.proc.pollTimeout = 200 * time.Millisecond
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)
	key := obs(eventv1.Status_start, t0).Key

	_, _, err := env.store.Claim(ctx, key, "gitlab", "start", t0, 1)
	require.NoError(t, err)

	_, err = env.proc.Process(ctx, obs(eventv1.Status_success, t0.Add(time.Second)))
	require.True(t, errors.Is(err, errClaimPending))
}

func TestProcessAbandonedClaimIsDropped(t *testing.T) {
	env := newProcEnv(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Truncate(time.Second)
	key := obs(eventv1.Status_start, t0).Key

	_, _, err := env.store.Claim(ctx, key, "gitlab", "start", t0, 1)
	require.NoError(t, err)

	env.proc.now = func() time.Time { return time.Now().Add(time.Minute) }

	_, err = env.proc.Process(ctx, obs(eventv1.Status_success, t0.Add(time.Second)))
	require.True(t, errors.Is(err, errClaimPending))

	_, err = env.store.Get(ctx, key)
	require.ErrorIs(t, err, store.ErrNotFound)
}

func TestServiceResolver(t *testing.T) {
	cat := &fakeCatalog{entries: []*catalogv1.Catalog{
		{Name: "payments-api", Repository: "git@gitlab.example.com:team/payments.git"},
		{Name: "billing"},
	}}
	now := time.Now()
	resolver := &serviceResolver{catalog: cat, ttl: 60 * time.Second, now: func() time.Time { return now }, logger: slog.New(slog.NewJSONHandler(io.Discard, nil))}
	ctx := context.Background()

	name := resolver.Resolve(ctx, integrations.ServiceHint{RepositoryURLs: []string{"https://gitlab.example.com/team/payments"}, Name: "payments"})
	require.Equal(t, "payments-api", name)

	name = resolver.Resolve(ctx, integrations.ServiceHint{Name: "billing"})
	require.Equal(t, "billing", name)

	name = resolver.Resolve(ctx, integrations.ServiceHint{Name: "unknown"})
	require.Equal(t, "unknown", name)

	require.Equal(t, 1, cat.callCount())

	now = now.Add(61 * time.Second)
	name = resolver.Resolve(ctx, integrations.ServiceHint{Name: "billing"})
	require.Equal(t, "billing", name)
	require.Equal(t, 2, cat.callCount())

	cat.mu.Lock()
	cat.err = errors.New("boom")
	cat.mu.Unlock()
	now = now.Add(61 * time.Second)
	name = resolver.Resolve(ctx, integrations.ServiceHint{RepositoryURLs: []string{"https://gitlab.example.com/team/payments"}, Name: "payments"})
	require.Equal(t, "payments-api", name)
	require.Equal(t, 3, cat.callCount())
}
