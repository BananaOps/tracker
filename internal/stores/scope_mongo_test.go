package store

import (
	"context"
	"testing"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/config"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func insertEvent(t *testing.T, s *EventStoreClient, service, source string) string {
	t.Helper()
	e, err := s.Create(context.Background(), &eventv1.Event{
		Title:      service,
		Attributes: &eventv1.EventAttributes{Service: service, Source: source},
		Links:      &eventv1.EventLinks{},
		Metadata:   &eventv1.EventMetadata{},
	})
	require.NoError(t, err)
	return e.Metadata.Id
}

func seedScopeEvents(t *testing.T) *EventStoreClient {
	t.Helper()
	db := testDatabase(t)
	s := NewStoreEventFromCollection(db.Collection("events"))
	for _, svc := range []string{"svc-a", "svc-a", "svc-b", ""} {
		insertEvent(t, s, svc, "scope-test")
	}
	return s
}

func TestEventStoreListScoped(t *testing.T) {
	s := seedScopeEvents(t)
	ctx := context.Background()

	got, err := s.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	require.Len(t, got, 4)

	got, err = s.List(ctx, auth.ScopeOf("svc-a"))
	require.NoError(t, err)
	require.Len(t, got, 2)
	for _, e := range got {
		require.Equal(t, "svc-a", e.Attributes.Service)
	}

	got, err = s.List(ctx, auth.ScopeOf("svc-a", "svc-b"))
	require.NoError(t, err)
	require.Len(t, got, 3)

	got, err = s.List(ctx, auth.ScopeOf())
	require.NoError(t, err)
	require.Empty(t, got)

	got, err = s.List(ctx, auth.Scope{})
	require.NoError(t, err)
	require.Empty(t, got)

	got, err = s.List(ctx, auth.ScopeOf("SVC-A"))
	require.NoError(t, err)
	require.Empty(t, got)
}

func TestEventStoreSearchScoped(t *testing.T) {
	s := seedScopeEvents(t)
	ctx := context.Background()
	src := map[string]interface{}{"attributes.source": "scope-test"}

	got, err := s.Search(ctx, auth.ScopeAll(), src)
	require.NoError(t, err)
	require.Len(t, got, 4)

	got, err = s.Search(ctx, auth.ScopeOf("svc-a"), src)
	require.NoError(t, err)
	require.Len(t, got, 2)

	both := map[string]interface{}{"attributes.source": "scope-test", "attributes.service": "svc-b"}
	got, err = s.Search(ctx, auth.ScopeOf("svc-a"), both)
	require.NoError(t, err)
	require.Empty(t, got)

	got, err = s.Search(ctx, auth.ScopeOf("svc-b"), both)
	require.NoError(t, err)
	require.Len(t, got, 1)

	got, err = s.Search(ctx, auth.ScopeOf("svc-a"), map[string]interface{}{"attributes.service": ""})
	require.NoError(t, err)
	require.Empty(t, got)
}

func TestEventStoreCountScoped(t *testing.T) {
	s := seedScopeEvents(t)
	ctx := context.Background()
	f := bson.D{{Key: "attributes.source", Value: "scope-test"}}

	for scope, want := range map[string]int64{"all": 4, "a": 2, "none": 0} {
		sc := map[string]auth.Scope{"all": auth.ScopeAll(), "a": auth.ScopeOf("svc-a"), "none": auth.ScopeOf()}[scope]
		n, err := s.CountWithFilter(ctx, sc, f)
		require.NoError(t, err, scope)
		require.Equal(t, want, n, scope)
	}
}

func sumCounts(rows []MonthlyStatsResult) int64 {
	var n int64
	for _, r := range rows {
		n += r.Count
	}
	return n
}

func TestEventStoreAggregateScoped(t *testing.T) {
	s := seedScopeEvents(t)
	ctx := context.Background()
	f := bson.D{{Key: "attributes.source", Value: "scope-test"}}

	rows, err := s.AggregateByMonth(ctx, auth.ScopeAll(), f, true)
	require.NoError(t, err)
	require.Equal(t, int64(4), sumCounts(rows))

	rows, err = s.AggregateByMonth(ctx, auth.ScopeOf("svc-a"), f, true)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.Equal(t, "svc-a", rows[0].Service)
	require.Equal(t, int64(2), rows[0].Count)

	rows, err = s.AggregateByMonth(ctx, auth.ScopeOf(), f, true)
	require.NoError(t, err)
	require.Empty(t, rows)

	rows, err = s.AggregateByMonth(ctx, auth.ScopeOf("svc-b"), f, false)
	require.NoError(t, err)
	require.Equal(t, int64(1), sumCounts(rows))
}

func TestLockStoreListScoped(t *testing.T) {
	db := testDatabase(t)
	s := NewStoreLockFromCollection(db.Collection("locks"))
	ctx := context.Background()
	for _, svc := range []string{"svc-a", "svc-b", ""} {
		_, err := s.Create(ctx, &lockv1.Lock{Service: svc, Environment: "production", Resource: "deployment", Who: "seed"})
		require.NoError(t, err)
	}

	got, err := s.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	require.Len(t, got, 3)

	got, err = s.List(ctx, auth.ScopeOf("svc-a"))
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, "svc-a", got[0].Service)

	got, err = s.List(ctx, auth.ScopeOf())
	require.NoError(t, err)
	require.Empty(t, got)
}

func TestScopeIndexes(t *testing.T) {
	db := testDatabase(t)
	ctx := context.Background()
	cursor, err := db.Collection("locks").Indexes().List(ctx)
	require.NoError(t, err)
	var specs []bson.M
	require.NoError(t, cursor.All(ctx, &specs))
	names := []string{}
	for _, sp := range specs {
		name := sp["name"].(string)
		names = append(names, name)
		if name == "idx_lock_service" {
			require.NotContains(t, sp, "unique")
		}
	}
	require.Contains(t, names, "idx_lock_service")
	require.Contains(t, collectionIndexNames(t, db, config.ConfigDatabase.CatalogCollection), "idx_catalog_name")
}

func collectionIndexNames(t *testing.T, db *mongo.Database, coll string) []string {
	t.Helper()
	ctx := context.Background()
	cursor, err := db.Collection(coll).Indexes().List(ctx)
	require.NoError(t, err)
	var specs []bson.M
	require.NoError(t, cursor.All(ctx, &specs))
	names := []string{}
	for _, sp := range specs {
		names = append(names, sp["name"].(string))
	}
	return names
}

func TestCatalogStoreListScoped(t *testing.T) {
	db := testDatabase(t)
	s := NewStoreCatalogFromCollection(db.Collection(config.ConfigDatabase.CatalogCollection))
	ctx := context.Background()
	for _, n := range []string{"svc-a", "svc-b"} {
		_, err := s.Update(ctx, map[string]interface{}{"name": n}, &catalogv1.Catalog{Name: n, Owner: "o", Version: "1"})
		require.NoError(t, err)
	}

	got, err := s.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	require.Len(t, got, 2)

	got, err = s.List(ctx, auth.ScopeOf("svc-a"))
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, "svc-a", got[0].Name)

	got, err = s.List(ctx, auth.ScopeOf())
	require.NoError(t, err)
	require.Empty(t, got)
}
