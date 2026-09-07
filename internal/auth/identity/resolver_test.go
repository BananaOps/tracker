package identity

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type fakeUsers struct {
	byID map[primitive.ObjectID]*store.User
}

func (f *fakeUsers) GetByID(_ context.Context, id primitive.ObjectID) (*store.User, error) {
	if u, ok := f.byID[id]; ok {
		return u, nil
	}
	return nil, store.ErrNotFound
}

type fakeTeams struct {
	byID map[primitive.ObjectID]*store.Team
}

func (f *fakeTeams) GetByIDs(_ context.Context, ids []primitive.ObjectID) ([]*store.Team, error) {
	var out []*store.Team
	for _, id := range ids {
		if t, ok := f.byID[id]; ok {
			out = append(out, t)
		}
	}
	return out, nil
}

type fakeKeys struct {
	byPrefix map[string]*store.APIKey
	touched  int
}

func (f *fakeKeys) GetByPrefix(_ context.Context, prefix string) (*store.APIKey, error) {
	if k, ok := f.byPrefix[prefix]; ok {
		return k, nil
	}
	return nil, store.ErrNotFound
}

func (f *fakeKeys) TouchLastUsed(_ context.Context, _ primitive.ObjectID, _ time.Time) error {
	f.touched++
	return nil
}

func newFixture(t *testing.T) (*Resolver, *store.User, *store.Team, *fakeKeys) {
	t.Helper()
	team := &store.Team{ID: primitive.NewObjectID(), Name: "ops", Permissions: []string{"event:read"}, Scope: store.TeamScope{Services: []string{"api"}}}
	admins := &store.Team{ID: primitive.NewObjectID(), Name: "Administrators", Builtin: true, Permissions: []string{"access:manage"}, Scope: store.TeamScope{All: true}}
	user := &store.User{ID: primitive.NewObjectID(), Username: "alice", Teams: []primitive.ObjectID{team.ID}, SessionVersion: 2}
	sessions, err := auth.NewSessionManager(bytes.Repeat([]byte{3}, 32), time.Hour)
	require.NoError(t, err)
	keys := &fakeKeys{byPrefix: map[string]*store.APIKey{}}
	r := &Resolver{
		Users:                &fakeUsers{byID: map[primitive.ObjectID]*store.User{user.ID: user}},
		Teams:                &fakeTeams{byID: map[primitive.ObjectID]*store.Team{team.ID: team, admins.ID: admins}},
		Keys:                 keys,
		Sessions:             sessions,
		AnonymousPermissions: []auth.Permission{auth.PermLinksRead},
		Now:                  time.Now,
	}
	return r, user, team, keys
}

func TestResolveAnonymous(t *testing.T) {
	r, _, _, _ := newFixture(t)
	p := r.Resolve(context.Background(), auth.Credentials{})
	assert.Equal(t, auth.KindAnonymous, p.Kind)
	assert.True(t, p.Has(auth.PermLinksRead))
	assert.False(t, p.Has(auth.PermEventRead))
}

func TestResolveSession(t *testing.T) {
	r, user, team, _ := newFixture(t)
	token, _, _ := r.Sessions.Issue(user.ID.Hex(), user.SessionVersion)

	p := r.Resolve(context.Background(), auth.Credentials{SessionToken: token})
	assert.Equal(t, auth.KindUser, p.Kind)
	assert.Equal(t, "alice", p.Username)
	assert.Equal(t, []string{team.ID.Hex()}, p.TeamIDs)
	assert.True(t, p.Has(auth.PermEventRead))
	assert.True(t, p.Scope.Allows("api"))
	assert.False(t, p.Scope.Allows("web"))
	assert.False(t, p.IsAdmin)

	stale, _, _ := r.Sessions.Issue(user.ID.Hex(), user.SessionVersion-1)
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{SessionToken: stale}).Kind)

	user.Disabled = true
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{SessionToken: token}).Kind)

	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{SessionToken: "garbage"}).Kind)
}

func TestResolveAPIKey(t *testing.T) {
	r, _, team, keys := newFixture(t)
	gen, _ := auth.GenerateAPIKey()
	keys.byPrefix[gen.Prefix] = &store.APIKey{ID: primitive.NewObjectID(), Prefix: gen.Prefix, Hash: gen.Hash, TeamID: &team.ID}

	p := r.Resolve(context.Background(), auth.Credentials{APIKey: gen.Secret})
	assert.Equal(t, auth.KindAPIKey, p.Kind)
	assert.Equal(t, "apikey:"+gen.Prefix, p.Username)
	assert.Equal(t, gen.Prefix, p.KeyPrefix)
	assert.True(t, p.Has(auth.PermEventRead))
	assert.False(t, p.IsAdmin)
	assert.Equal(t, 1, keys.touched)

	// Second use within a minute does not touch again.
	now := time.Now()
	keys.byPrefix[gen.Prefix].LastUsedAt = &now
	r.Resolve(context.Background(), auth.Credentials{APIKey: gen.Secret})
	assert.Equal(t, 1, keys.touched)

	wrong := gen.Secret[:len(gen.Secret)-1] + "x"
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{APIKey: wrong}).Kind)

	revoked := now
	keys.byPrefix[gen.Prefix].RevokedAt = &revoked
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{APIKey: gen.Secret}).Kind)
	keys.byPrefix[gen.Prefix].RevokedAt = nil

	past := now.Add(-time.Minute)
	keys.byPrefix[gen.Prefix].ExpiresAt = &past
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{APIKey: gen.Secret}).Kind)
	keys.byPrefix[gen.Prefix].ExpiresAt = nil

	// Global key.
	global, _ := auth.GenerateAPIKey()
	keys.byPrefix[global.Prefix] = &store.APIKey{ID: primitive.NewObjectID(), Prefix: global.Prefix, Hash: global.Hash}
	p = r.Resolve(context.Background(), auth.Credentials{APIKey: global.Secret})
	assert.True(t, p.IsAdmin)
	assert.True(t, p.Scope.All)
	assert.True(t, p.Has(auth.PermAccessManage))

	// Unknown prefix and malformed key.
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{APIKey: "trk_zzzzzzzz_nothing"}).Kind)
	assert.Equal(t, auth.KindAnonymous, r.Resolve(context.Background(), auth.Credentials{APIKey: "trk_bad"}).Kind)
}

// A key attached to the built-in Administrators team is an administrator
// credential, as spec 4.1 and the comment on auth.Principal.IsAdmin say. Only
// the built-in flag grants it, not the permissions the team happens to hold.
func TestResolveAPIKeyOnAdministratorsTeam(t *testing.T) {
	r, _, team, keys := newFixture(t)
	admins := &store.Team{
		ID:          primitive.NewObjectID(),
		Name:        store.AdministratorsTeamName,
		Builtin:     true,
		Permissions: []string{string(auth.PermAccessManage)},
		Scope:       store.TeamScope{All: true},
	}
	r.Teams.(*fakeTeams).byID[admins.ID] = admins

	adminKey, _ := auth.GenerateAPIKey()
	keys.byPrefix[adminKey.Prefix] = &store.APIKey{
		ID: primitive.NewObjectID(), Prefix: adminKey.Prefix, Hash: adminKey.Hash, TeamID: &admins.ID,
	}

	p := r.Resolve(context.Background(), auth.Credentials{APIKey: adminKey.Secret})
	require.Equal(t, auth.KindAPIKey, p.Kind)
	assert.True(t, p.IsAdmin, "a key on the built-in team inherits the admin flag")
	assert.Equal(t, []string{admins.ID.Hex()}, p.TeamIDs)
	assert.True(t, p.Has(auth.PermAccessManage))
	assert.True(t, p.Scope.All)

	// A key on an ordinary team stays a plain credential.
	teamKey, _ := auth.GenerateAPIKey()
	keys.byPrefix[teamKey.Prefix] = &store.APIKey{
		ID: primitive.NewObjectID(), Prefix: teamKey.Prefix, Hash: teamKey.Hash, TeamID: &team.ID,
	}
	assert.False(t, r.Resolve(context.Background(), auth.Credentials{APIKey: teamKey.Secret}).IsAdmin)
}
