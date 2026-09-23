package identity

import (
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
)

func TestEffective(t *testing.T) {
	perms, scope, admin := Effective(nil)
	assert.Empty(t, perms)
	assert.False(t, scope.All)
	assert.False(t, admin)

	teams := []*store.Team{
		{Name: "readers", Permissions: []string{"event:read", "bogus"}, Scope: store.TeamScope{Services: []string{"api"}}},
		{Name: "ops", Permissions: []string{"lock:write"}, Scope: store.TeamScope{Services: []string{"web"}}},
	}
	perms, scope, admin = Effective(teams)
	assert.True(t, perms.Has(auth.PermEventRead))
	assert.True(t, perms.Has(auth.PermLockWrite))
	assert.False(t, perms.Has("bogus"), "unknown permissions stored in the database are ignored")
	assert.Equal(t, []string{"api", "web"}, scope.ServiceList())
	assert.False(t, admin)

	teams = append(teams, &store.Team{Name: "Administrators", Builtin: true, Permissions: []string{"access:manage"}, Scope: store.TeamScope{All: true}})
	perms, scope, admin = Effective(teams)
	assert.True(t, scope.All)
	assert.True(t, admin)
	assert.True(t, perms.Has(auth.PermAccessManage))
}
