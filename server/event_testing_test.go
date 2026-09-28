package server

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
)

// testMongoDatabase connects to MONGO_TEST_URI, creates a throwaway database
// with all indexes and drops it at the end of the test.
func testMongoDatabase(t *testing.T) *mongo.Database {
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

func newTestEvent(t *testing.T, db *mongo.Database) *Event {
	t.Helper()
	return newEventFromStores(
		store.NewStoreEventFromCollection(db.Collection("events")),
		store.NewStoreLockFromCollection(db.Collection("locks")),
		slog.New(slog.NewJSONHandler(io.Discard, nil)),
	)
}

func writerPrincipal() auth.Principal {
	return auth.Principal{Kind: auth.KindUser, Username: "tester",
		Permissions: auth.NewPermissionSet(auth.AllPermissions()...), Scope: auth.ScopeAll()}
}

func eventRPCCtx(method string) context.Context {
	ctx := grpc.NewContextWithServerTransportStream(context.Background(),
		fakeTransportStream{method: "/tracker.event.v1alpha1.EventService/" + method})
	return auth.WithPrincipal(ctx, writerPrincipal())
}

// gatheredCounter reads a counter of the default registry whose labels
// include every pair of labels (0 when absent).
func gatheredCounter(t *testing.T, name string, labels map[string]string) float64 {
	t.Helper()
	mfs, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)
	for _, mf := range mfs {
		if mf.GetName() != name {
			continue
		}
		for _, m := range mf.GetMetric() {
			match := true
			for k, v := range labels {
				found := false
				for _, lp := range m.GetLabel() {
					if lp.GetName() == k && lp.GetValue() == v {
						found = true
						break
					}
				}
				if !found {
					match = false
					break
				}
			}
			if match {
				return m.GetCounter().GetValue()
			}
		}
	}
	return 0
}
