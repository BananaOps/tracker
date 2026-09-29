package identity

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const testIssuer = "https://idp"

func oidcID(subject, username string) OIDCIdentity {
	return OIDCIdentity{Issuer: testIssuer, Subject: subject, Username: username, Email: username + "@x.io", DisplayName: username}
}

func TestResolveOIDCUserProvisions(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	id := OIDCIdentity{Issuer: testIssuer, Subject: "s1", Username: "alice", Email: "alice@x.io", DisplayName: "Alice"}
	u, created, err := ResolveOIDCUser(ctx, users, id, true, now)
	require.NoError(t, err)
	assert.True(t, created)
	assert.False(t, u.ID.IsZero())
	assert.Equal(t, store.UserSourceOIDC, u.Source)
	assert.Equal(t, testIssuer, u.OIDCIssuer)
	assert.Equal(t, "s1", u.OIDCSubject)
	assert.Empty(t, u.PasswordHash)
	assert.False(t, u.MustChangePassword)
	assert.NotNil(t, u.Teams)
	assert.Empty(t, u.Teams)
	require.NotNil(t, u.LastLoginAt)
	assert.False(t, u.Disabled)

	stored, err := users.GetByOIDCIdentity(ctx, testIssuer, "s1")
	require.NoError(t, err)
	assert.Equal(t, u.ID, stored.ID)
	assert.Equal(t, "Alice", stored.DisplayName)
}

func TestResolveOIDCUserReturnsExisting(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	first, _, err := ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), true, now)
	require.NoError(t, err)

	again := OIDCIdentity{Issuer: testIssuer, Subject: "s1", Username: "renamed", Email: "new@x.io", DisplayName: "Alice New"}
	u, created, err := ResolveOIDCUser(ctx, users, again, true, now.Add(time.Minute))
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, first.ID, u.ID)
	assert.Equal(t, "new@x.io", u.Email)
	assert.Equal(t, "Alice New", u.DisplayName)

	stored, err := users.GetByID(ctx, first.ID)
	require.NoError(t, err)
	assert.Equal(t, "new@x.io", stored.Email)
	assert.Equal(t, "Alice New", stored.DisplayName)
	assert.Equal(t, "alice", stored.Username)
}

func TestResolveOIDCUserUsernameCollision(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	local := &store.User{Username: "alice", Source: store.UserSourceLocal, PasswordHash: "x"}
	require.NoError(t, users.Create(ctx, local))

	u1, created, err := ResolveOIDCUser(ctx, users, oidcID("s1", "Alice"), true, now)
	require.NoError(t, err)
	assert.True(t, created)
	assert.Equal(t, "Alice-2", u1.Username)

	u2, _, err := ResolveOIDCUser(ctx, users, oidcID("s2", "alice"), true, now)
	require.NoError(t, err)
	assert.Equal(t, "alice-3", u2.Username)

	got, err := users.GetByID(ctx, local.ID)
	require.NoError(t, err)
	assert.Equal(t, "x", got.PasswordHash)
	assert.Empty(t, got.OIDCIssuer)
	assert.Empty(t, got.OIDCSubject)
}

func TestResolveOIDCUserNeverBindsAdmin(t *testing.T) {
	users, teams := mongoStores(t)
	ctx := context.Background()

	team := &store.Team{Name: "admins", Permissions: []string{}}
	require.NoError(t, teams.Create(ctx, team))
	admin := &store.User{Username: "admin", Source: store.UserSourceLocal, PasswordHash: "x", Teams: []primitive.ObjectID{team.ID}}
	require.NoError(t, users.Create(ctx, admin))

	u, created, err := ResolveOIDCUser(ctx, users, oidcID("s1", "admin"), true, time.Now().UTC())
	require.NoError(t, err)
	assert.True(t, created)
	assert.NotEqual(t, admin.ID, u.ID)
	assert.Equal(t, "admin-2", u.Username)
	assert.Equal(t, store.UserSourceOIDC, u.Source)
	assert.Empty(t, u.Teams)
}

func TestResolveOIDCUserNeverBindsByEmail(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()

	local := &store.User{Username: "carol", Email: "victim@x.io", DisplayName: "Carol", Source: store.UserSourceLocal, PasswordHash: "x"}
	require.NoError(t, users.Create(ctx, local))
	before, err := users.GetByID(ctx, local.ID)
	require.NoError(t, err)

	id := OIDCIdentity{Issuer: testIssuer, Subject: "s1", Username: "mallory", Email: "victim@x.io", DisplayName: "Mallory"}
	u, created, err := ResolveOIDCUser(ctx, users, id, true, time.Now().UTC())
	require.NoError(t, err)
	assert.True(t, created)
	assert.NotEqual(t, local.ID, u.ID)

	after, err := users.GetByID(ctx, local.ID)
	require.NoError(t, err)
	assert.Equal(t, before, after)
}

func TestResolveOIDCUserLongUsername(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	long := strings.Repeat("a", 64)

	require.NoError(t, users.Create(ctx, &store.User{Username: long, Source: store.UserSourceLocal, PasswordHash: "x"}))
	u, _, err := ResolveOIDCUser(ctx, users, oidcID("s1", long), true, time.Now().UTC())
	require.NoError(t, err)
	assert.LessOrEqual(t, len(u.Username), 64)
	assert.True(t, strings.HasSuffix(u.Username, "-2"))
}

func TestResolveOIDCUserProvisioningDisabled(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	_, _, err := ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), false, now)
	assert.ErrorIs(t, err, ErrOIDCNotProvisioned)
	n, err := users.Count(ctx)
	require.NoError(t, err)
	assert.Zero(t, n)

	_, _, err = ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), true, now)
	require.NoError(t, err)
	u, created, err := ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), false, now)
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, "alice", u.Username)
}

func TestResolveOIDCUserDisabled(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	u, _, err := ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), true, now)
	require.NoError(t, err)
	u.Disabled = true
	require.NoError(t, users.Update(ctx, u))

	changed := OIDCIdentity{Issuer: testIssuer, Subject: "s1", Email: "other@x.io", DisplayName: "Other"}
	_, _, err = ResolveOIDCUser(ctx, users, changed, true, now.Add(time.Hour))
	assert.ErrorIs(t, err, ErrOIDCUserDisabled)

	stored, err := users.GetByID(ctx, u.ID)
	require.NoError(t, err)
	assert.Equal(t, "alice@x.io", stored.Email)
	assert.Equal(t, "alice", stored.DisplayName)
}

func TestResolveOIDCUserNoUsername(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	_, _, err := ResolveOIDCUser(ctx, users, OIDCIdentity{Issuer: testIssuer, Subject: "s1"}, true, now)
	assert.ErrorIs(t, err, ErrOIDCNoUsername)

	_, _, err = ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), true, now)
	require.NoError(t, err)
	u, created, err := ResolveOIDCUser(ctx, users, OIDCIdentity{Issuer: testIssuer, Subject: "s1", Email: "a@x.io"}, true, now)
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, "alice", u.Username)
}

func TestResolveOIDCUserConcurrentFirstLogin(t *testing.T) {
	users, _ := mongoStores(t)
	ctx := context.Background()
	now := time.Now().UTC()

	const workers = 2
	ids := make([]primitive.ObjectID, workers)
	errs := make([]error, workers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			u, _, err := ResolveOIDCUser(ctx, users, oidcID("s1", "alice"), true, now)
			errs[i] = err
			if u != nil {
				ids[i] = u.ID
			}
		}()
	}
	close(start)
	wg.Wait()

	for i := 0; i < workers; i++ {
		require.NoError(t, errs[i])
	}
	assert.Equal(t, ids[0], ids[1])
	assert.False(t, ids[0].IsZero())
	n, err := users.Count(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 1, n)
}

func TestCandidateUsername(t *testing.T) {
	assert.Equal(t, "bob", candidateUsername("bob", 1))
	assert.Equal(t, "bob-2", candidateUsername("bob", 2))
	got := candidateUsername(strings.Repeat("a", 64), 12)
	assert.Len(t, got, 64)
	assert.True(t, strings.HasSuffix(got, "-12"))
}
