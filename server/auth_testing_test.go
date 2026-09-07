package server

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/identity"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// authFixture wires real stores on a throwaway database.
type authFixture struct {
	users    *store.AuthUserStore
	teams    *store.AuthTeamStore
	keys     *store.AuthAPIKeyStore
	sessions *auth.SessionManager
	resolver *identity.Resolver
	cfg      auth.Config
	adminsID string
	admin    *store.User
}

func newAuthFixture(t *testing.T) *authFixture {
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

	f := &authFixture{
		users: store.NewAuthUserStoreFromCollection(db.Collection("auth_users")),
		teams: store.NewAuthTeamStoreFromCollection(db.Collection("auth_teams")),
		keys:  store.NewAuthAPIKeyStoreFromCollection(db.Collection("auth_api_keys")),
	}
	f.sessions, err = auth.NewSessionManager(bytes.Repeat([]byte{9}, 32), time.Hour)
	require.NoError(t, err)
	f.cfg = auth.Config{SessionTTL: time.Hour, AnonymousPermissions: []auth.Permission{}}
	f.resolver = &identity.Resolver{Users: f.users, Teams: f.teams, Keys: f.keys, Sessions: f.sessions}

	res, err := identity.Bootstrap(ctx, f.users, f.teams, "admin-password-123")
	require.NoError(t, err)
	f.adminsID = res.AdminsTeamID.Hex()
	f.admin, err = f.users.GetByUsername(ctx, "admin")
	require.NoError(t, err)
	return f
}

// principalOf resolves the principal of a stored user through the real resolver.
func (f *authFixture) principalOf(t *testing.T, u *store.User) auth.Principal {
	t.Helper()
	p, err := f.resolver.PrincipalForUser(context.Background(), u)
	require.NoError(t, err)
	return p
}

type fakeTransportStream struct{ method string }

func (s fakeTransportStream) Method() string             { return s.method }
func (fakeTransportStream) SetHeader(metadata.MD) error  { return nil }
func (fakeTransportStream) SendHeader(metadata.MD) error { return nil }
func (fakeTransportStream) SetTrailer(metadata.MD) error { return nil }

// rpcCtx builds a context as the gRPC server would: principal plus full method name.
func rpcCtx(p auth.Principal, method string) context.Context {
	ctx := grpc.NewContextWithServerTransportStream(context.Background(),
		fakeTransportStream{method: "/tracker.auth.v1alpha1.AuthService/" + method})
	return auth.WithPrincipal(ctx, p)
}
