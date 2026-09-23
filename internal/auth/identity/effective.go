// Package identity resolves principals from the persisted users, teams and API keys.
package identity

import (
	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
)

// Effective computes the rights granted by a set of teams: the union of their
// permissions, the union of their scopes and whether one of them is the
// built-in Administrators team.
func Effective(teams []*store.Team) (auth.PermissionSet, auth.Scope, bool) {
	perms := auth.NewPermissionSet()
	scope := auth.ScopeOf()
	admin := false
	for _, t := range teams {
		for _, raw := range t.Permissions {
			p := auth.Permission(raw)
			if auth.IsValidPermission(p) {
				perms.Add(p)
			}
		}
		if t.Scope.All {
			scope = scope.Union(auth.ScopeAll())
		} else {
			scope = scope.Union(auth.ScopeOf(t.Scope.Services...))
		}
		if t.Builtin {
			admin = true
		}
	}
	return perms, scope, admin
}
