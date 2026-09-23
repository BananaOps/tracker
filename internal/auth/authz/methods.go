package authz

import "github.com/bananaops/tracker/internal/auth"

// MethodPermissions maps every RPC full name to the permission it requires.
// A method missing from this table is denied. methods_test.go enforces that
// every RPC declared in the protos has an entry.
var MethodPermissions = map[string]auth.Permission{
	// EventService
	"/tracker.event.v1alpha1.EventService/CreateEvent":          auth.PermEventWrite,
	"/tracker.event.v1alpha1.EventService/UpdateEvent":          auth.PermEventWrite,
	"/tracker.event.v1alpha1.EventService/DeleteEvents":         auth.PermEventWrite,
	"/tracker.event.v1alpha1.EventService/GetEvent":             auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/SearchEvents":         auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/ListEvents":           auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/TodayEvents":          auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/AddChangelogEntry":    auth.PermEventWrite,
	"/tracker.event.v1alpha1.EventService/GetEventChangelog":    auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/AddSlackId":           auth.PermEventWrite,
	"/tracker.event.v1alpha1.EventService/GetEventStats":        auth.PermEventRead,
	"/tracker.event.v1alpha1.EventService/GetEventStatsByMonth": auth.PermEventRead,

	// CatalogService
	"/tracker.catalog.v1alpha1.CatalogService/CreateUpdateCatalog":  auth.PermCatalogWrite,
	"/tracker.catalog.v1alpha1.CatalogService/GetCatalog":           auth.PermCatalogRead,
	"/tracker.catalog.v1alpha1.CatalogService/DeleteCatalog":        auth.PermCatalogWrite,
	"/tracker.catalog.v1alpha1.CatalogService/ListCatalogs":         auth.PermCatalogRead,
	"/tracker.catalog.v1alpha1.CatalogService/GetVersionCompliance": auth.PermCatalogRead,
	"/tracker.catalog.v1alpha1.CatalogService/UpdateVersions":       auth.PermCatalogWrite,
	"/tracker.catalog.v1alpha1.CatalogService/UpdateDependencies":   auth.PermCatalogWrite,

	// LockService
	"/tracker.lock.v1alpha1.LockService/CreateLock": auth.PermLockWrite,
	"/tracker.lock.v1alpha1.LockService/GetLock":    auth.PermLockRead,
	"/tracker.lock.v1alpha1.LockService/UpdateLock": auth.PermLockWrite,
	"/tracker.lock.v1alpha1.LockService/UnLock":     auth.PermLockWrite,
	"/tracker.lock.v1alpha1.LockService/ListLocks":  auth.PermLockRead,

	// AuthService (proto added in Task 12)
	"/tracker.auth.v1alpha1.AuthService/GetAuthConfig": auth.PermPublic,
	"/tracker.auth.v1alpha1.AuthService/Me":            auth.PermPublic,
	"/tracker.auth.v1alpha1.AuthService/ListUsers":     auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/CreateUser":    auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/UpdateUser":    auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/ListTeams":     auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/CreateTeam":    auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/UpdateTeam":    auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/DeleteTeam":    auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/ListApiKeys":   auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/CreateApiKey":  auth.PermAccessManage,
	"/tracker.auth.v1alpha1.AuthService/RevokeApiKey":  auth.PermAccessManage,
}
