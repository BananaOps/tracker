package server

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"testing"
	"time"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// scopeDB connects to MONGO_TEST_URI and returns a throwaway database with
// all indexes, dropped at the end of the test.
func scopeDB(t *testing.T) *mongo.Database {
	t.Helper()
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("MONGO_TEST_URI not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	require.NoError(t, err)
	db := client.Database(fmt.Sprintf("tracker_test_%d", time.Now().UnixNano()))
	t.Cleanup(func() {
		c, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = db.Drop(c)
		_ = client.Disconnect(c)
	})
	require.NoError(t, store.EnsureIndexes(ctx, db))
	return db
}

type scopeServices struct {
	events     *Event
	locks      *Lock
	catalogs   *Catalog
	eventStore *store.EventStoreClient
	lockStore  *store.LockStoreClient
}

// newScopeServices wires the services on db with a silent logger.
func newScopeServices(t *testing.T, db *mongo.Database) *scopeServices {
	t.Helper()
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	eventStore := store.NewStoreEventFromCollection(db.Collection("events"))
	lockStore := store.NewStoreLockFromCollection(db.Collection("locks"))
	locks := &Lock{store: *lockStore, eventStore: eventStore, logger: logger}
	events := &Event{store: eventStore, lockService: locks, logger: logger}
	catalogs := &Catalog{store: store.NewStoreCatalogFromCollection(db.Collection(config.ConfigDatabase.CatalogCollection)), logger: logger}
	return &scopeServices{events: events, locks: locks, catalogs: catalogs, eventStore: eventStore, lockStore: lockStore}
}

// scopedPrincipal is a user holding every permission, restricted to services.
// No argument yields an empty restricted scope.
func scopedPrincipal(services ...string) auth.Principal {
	return auth.Principal{
		Kind:        auth.KindUser,
		UserID:      "000000000000000000000001",
		Username:    "scoped",
		Permissions: auth.NewPermissionSet(auth.AllPermissions()...),
		Scope:       auth.ScopeOf(services...),
	}
}

// allScopePrincipal is the same user with an unrestricted scope.
func allScopePrincipal() auth.Principal {
	p := scopedPrincipal()
	p.Scope = auth.ScopeAll()
	return p
}

// scopeCtx builds a context as the gRPC server would for fullMethod,
// for example "/tracker.event.v1alpha1.EventService/GetEvent".
func scopeCtx(p auth.Principal, fullMethod string) context.Context {
	ctx := grpc.NewContextWithServerTransportStream(context.Background(), fakeTransportStream{method: fullMethod})
	return auth.WithPrincipal(ctx, p)
}

// seedEvent stores an incident of the given service and returns its id.
func seedEvent(t *testing.T, s *scopeServices, service string) string {
	t.Helper()
	d, err := time.Parse("2006-01-02", time.Now().Format("2006-01-02"))
	require.NoError(t, err)
	e, err := s.eventStore.Create(context.Background(), &eventv1.Event{
		Title: "seed " + service,
		Attributes: &eventv1.EventAttributes{
			Service:     service,
			Source:      "scope-test",
			Type:        eventv1.Type_incident,
			Status:      eventv1.Status_open,
			Environment: eventv1.Environment_production,
			Priority:    eventv1.Priority_P3,
			Owner:       "seed",
			StartDate:   timestamppb.New(d.Add(12 * time.Hour)),
		},
		Links:    &eventv1.EventLinks{},
		Metadata: &eventv1.EventMetadata{},
	})
	require.NoError(t, err)
	return e.Metadata.Id
}

// seedLock stores a lock on service and returns its id.
func seedLock(t *testing.T, s *scopeServices, service string) string {
	t.Helper()
	l, err := s.lockStore.Create(context.Background(), &lockv1.Lock{
		Service: service, Environment: "production", Resource: "deployment", Who: "seed",
	})
	require.NoError(t, err)
	return l.Id
}

// seedCatalog upserts a catalog entry directly through the store.
func seedCatalog(t *testing.T, s *scopeServices, entry *catalogv1.Catalog) {
	t.Helper()
	entry.Owner = "seed"
	entry.Version = "1"
	_, err := s.catalogs.store.Update(context.Background(), map[string]interface{}{"name": entry.Name}, entry)
	require.NoError(t, err)
}
