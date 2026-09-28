package store

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
)

func newIDStore(t *testing.T) *IntegrationDeploymentStore {
	return NewIntegrationDeploymentStoreFromCollection(testDatabase(t).Collection(IntegrationDeploymentsCollection))
}

func TestIntegrationDeploymentClaim(t *testing.T) {
	s := newIDStore(t)
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)
	k := "claim-key"

	created, doc, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
	require.NoError(t, err)
	assert.True(t, created)
	assert.Equal(t, "", doc.EventID)

	created, doc, err = s.Claim(ctx, k, "gitlab", "success", t0, 1)
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, "start", doc.Status)
	assert.Equal(t, 1, doc.Rank)
	assert.True(t, doc.LastEventAt.Equal(t0))
	assert.Equal(t, "gitlab", doc.Source)
}

func TestIntegrationDeploymentClaimConcurrent(t *testing.T) {
	s := newIDStore(t)
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)
	k := "claim-concurrent-key"

	const n = 16
	start := make(chan struct{})
	var wg sync.WaitGroup
	created := make([]bool, n)
	errs := make([]error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			c, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
			created[i] = c
			errs[i] = err
		}(i)
	}
	close(start)
	wg.Wait()

	createdCount := 0
	for i := 0; i < n; i++ {
		require.NoError(t, errs[i])
		if created[i] {
			createdCount++
		}
	}
	assert.Equal(t, 1, createdCount)
}

func TestIntegrationDeploymentAdvance(t *testing.T) {
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)

	t.Run("duplicate and stale", func(t *testing.T) {
		s := newIDStore(t)
		k := "advance-duplicate-stale"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		applied, prev, err := s.Advance(ctx, k, "success", t0.Add(time.Second), 2)
		require.NoError(t, err)
		assert.True(t, applied)
		assert.Equal(t, "start", prev.Status)

		got, err := s.Get(ctx, k)
		require.NoError(t, err)
		assert.Equal(t, "success", got.Status)
		assert.Equal(t, 2, got.Rank)
		assert.True(t, got.LastEventAt.Equal(t0.Add(time.Second)))

		// same advance again: duplicate, not applied.
		applied, doc, err := s.Advance(ctx, k, "success", t0.Add(time.Second), 2)
		require.NoError(t, err)
		assert.False(t, applied)
		assert.Equal(t, "success", doc.Status)
		assert.True(t, doc.LastEventAt.Equal(t0.Add(time.Second)))

		// non terminal on a later instant never applies over a terminal status.
		applied, doc, err = s.Advance(ctx, k, "start", t0.Add(2*time.Second), 1)
		require.NoError(t, err)
		assert.False(t, applied)
		assert.Equal(t, "success", doc.Status)

		// older instant, not applied.
		applied, doc, err = s.Advance(ctx, k, "failure", t0, 2)
		require.NoError(t, err)
		assert.False(t, applied)
		assert.Equal(t, "success", doc.Status)
	})

	t.Run("same instant higher rank applies", func(t *testing.T) {
		s := newIDStore(t)
		k := "advance-same-instant-higher-rank"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		applied, prev, err := s.Advance(ctx, k, "success", t0, 2)
		require.NoError(t, err)
		assert.True(t, applied)
		assert.Equal(t, "start", prev.Status)
	})

	t.Run("same instant lower rank does not apply", func(t *testing.T) {
		s := newIDStore(t)
		k := "advance-same-instant-lower-rank"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		applied, doc, err := s.Advance(ctx, k, "waiting_approval", t0, 1)
		require.NoError(t, err)
		assert.False(t, applied)
		assert.Equal(t, "start", doc.Status)
	})

	t.Run("terminal replaces older terminal", func(t *testing.T) {
		s := newIDStore(t)
		k := "advance-terminal-replaces-terminal"
		_, _, err := s.Claim(ctx, k, "gitlab", "success", t0, 2)
		require.NoError(t, err)

		applied, prev, err := s.Advance(ctx, k, "failure", t0.Add(time.Second), 2)
		require.NoError(t, err)
		assert.True(t, applied)
		assert.Equal(t, "success", prev.Status)
	})

	t.Run("truncates to millisecond", func(t *testing.T) {
		s := newIDStore(t)
		k := "advance-truncation"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		at := t0.Add(1*time.Second + 123456789*time.Nanosecond)
		applied, _, err := s.Advance(ctx, k, "success", at, 2)
		require.NoError(t, err)
		assert.True(t, applied)

		applied, doc, err := s.Advance(ctx, k, "success", at, 2)
		require.NoError(t, err)
		assert.False(t, applied)
		assert.True(t, doc.LastEventAt.Equal(NormalizeEventTime(at)))
	})

	t.Run("unknown key", func(t *testing.T) {
		s := newIDStore(t)
		_, _, err := s.Advance(ctx, "unknown-key", "success", t0, 1)
		assert.ErrorIs(t, err, ErrNotFound)
	})
}

func TestIntegrationDeploymentRevert(t *testing.T) {
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)

	t.Run("restores previous state", func(t *testing.T) {
		s := newIDStore(t)
		k := "revert-key"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		applied, prev, err := s.Advance(ctx, k, "success", t0.Add(time.Second), 2)
		require.NoError(t, err)
		require.True(t, applied)

		require.NoError(t, s.Revert(ctx, k, prev, "success", 2, t0.Add(time.Second)))

		got, err := s.Get(ctx, k)
		require.NoError(t, err)
		assert.Equal(t, "start", got.Status)
		assert.Equal(t, 1, got.Rank)
		assert.True(t, got.LastEventAt.Equal(t0))
	})

	t.Run("no-op when a newer state already applied", func(t *testing.T) {
		s := newIDStore(t)
		k := "revert-conditional-key"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		applied, prev1, err := s.Advance(ctx, k, "success", t0.Add(time.Second), 2)
		require.NoError(t, err)
		require.True(t, applied)

		applied, _, err = s.Advance(ctx, k, "failure", t0.Add(2*time.Second), 2)
		require.NoError(t, err)
		require.True(t, applied)

		require.NoError(t, s.Revert(ctx, k, prev1, "success", 2, t0.Add(time.Second)))

		got, err := s.Get(ctx, k)
		require.NoError(t, err)
		assert.Equal(t, "failure", got.Status)
		assert.True(t, got.LastEventAt.Equal(t0.Add(2*time.Second)))
	})

	t.Run("no-op when a higher rank state applied at the same instant", func(t *testing.T) {
		s := newIDStore(t)
		k := "revert-same-instant-higher-rank-key"
		_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
		require.NoError(t, err)

		// A request observing "success" at t0 advances the claim (same
		// instant, higher rank). Its own write to the previous, lower-rank
		// state must never clobber it: the filter has to match status and
		// rank too, not just lastEventAt.
		applied, prev, err := s.Advance(ctx, k, "success", t0, 2)
		require.NoError(t, err)
		require.True(t, applied)
		require.Equal(t, "start", prev.Status)
		require.Equal(t, 1, prev.Rank)

		// Revert as if undoing the original "start" claim (status/rank from
		// before the Advance) at the same lastEventAt: must not apply since
		// the stored status/rank no longer match "start"/1.
		require.NoError(t, s.Revert(ctx, k, &IntegrationDeployment{Status: "queued", Rank: 0}, "start", 1, t0))

		got, err := s.Get(ctx, k)
		require.NoError(t, err)
		assert.Equal(t, "success", got.Status)
		assert.Equal(t, 2, got.Rank)
	})

	t.Run("nil previous state is an error", func(t *testing.T) {
		s := newIDStore(t)
		err := s.Revert(ctx, "revert-nil-key", nil, "start", 1, t0)
		assert.Error(t, err)
	})
}

func TestIntegrationDeploymentSetEventIDGetDelete(t *testing.T) {
	s := newIDStore(t)
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)
	k := "set-event-id-key"

	_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
	require.NoError(t, err)

	require.NoError(t, s.SetEventID(ctx, k, "evt-1"))
	got, err := s.Get(ctx, k)
	require.NoError(t, err)
	assert.Equal(t, "evt-1", got.EventID)
	assert.False(t, got.UpdatedAt.IsZero())

	require.NoError(t, s.Delete(ctx, k))
	_, err = s.Get(ctx, k)
	assert.ErrorIs(t, err, ErrNotFound)

	assert.ErrorIs(t, s.SetEventID(ctx, "missing", "x"), ErrNotFound)
	assert.NoError(t, s.Delete(ctx, "missing"))
}

func TestIntegrationDeploymentSetEventIDDoesNotOverwrite(t *testing.T) {
	s := newIDStore(t)
	ctx := context.Background()
	t0 := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)
	k := "set-event-id-no-overwrite-key"

	_, _, err := s.Claim(ctx, k, "gitlab", "start", t0, 1)
	require.NoError(t, err)
	require.NoError(t, s.SetEventID(ctx, k, "evt-1"))

	assert.ErrorIs(t, s.SetEventID(ctx, k, "evt-2"), ErrNotFound)

	got, err := s.Get(ctx, k)
	require.NoError(t, err)
	assert.Equal(t, "evt-1", got.EventID)
}

func TestIntegrationDeploymentIndexes(t *testing.T) {
	ctx := context.Background()
	db := testDatabase(t)

	cursor, err := db.Collection(IntegrationDeploymentsCollection).Indexes().List(ctx)
	require.NoError(t, err)
	var results []bson.M
	require.NoError(t, cursor.All(ctx, &results))

	found := map[string]bson.M{}
	for _, idx := range results {
		if name, ok := idx["name"].(string); ok {
			found[name] = idx
		}
	}

	require.Contains(t, found, "idx_integration_event_id")
	require.Contains(t, found, "idx_integration_updated_at_ttl")

	ttlIdx := found["idx_integration_updated_at_ttl"]
	var ttl int64
	switch v := ttlIdx["expireAfterSeconds"].(type) {
	case int32:
		ttl = int64(v)
	case int64:
		ttl = v
	case float64:
		ttl = int64(v)
	default:
		t.Fatalf("unexpected type for expireAfterSeconds: %T", v)
	}
	assert.Equal(t, int64(7776000), ttl)
}
