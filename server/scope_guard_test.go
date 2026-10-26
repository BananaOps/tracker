package server

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

type scopeStance int

const (
	scopeFiltered scopeStance = iota // list style: restricted by a MongoDB filter
	scopeChecked                     // unit operation: PermissionDenied outside the scope
	scopeExempt                      // no service data: reason required
)

type scopeProbe struct {
	stance scopeStance
	reason string
	// request builds a request targeting the seeded svc-a objects.
	request func(seed scopeSeed) any
	// empty reports whether a filtered response holds no data.
	empty func(resp any) bool
}

type scopeSeed struct{ eventID, lockID, catalogName string }

const (
	guardEventSvc   = "/tracker.event.v1alpha1.EventService/"
	guardLockSvc    = "/tracker.lock.v1alpha1.LockService/"
	guardCatalogSvc = "/tracker.catalog.v1alpha1.CatalogService/"
	guardAuthSvc    = "/tracker.auth.v1alpha1.AuthService/"
)

func checked(request func(seed scopeSeed) any) scopeProbe {
	return scopeProbe{stance: scopeChecked, request: request}
}

func filtered(request func(seed scopeSeed) any, empty func(resp any) bool) scopeProbe {
	return scopeProbe{stance: scopeFiltered, request: request, empty: empty}
}

func exempt(reason string) scopeProbe {
	return scopeProbe{stance: scopeExempt, reason: reason}
}

const adminReason = "identity administration guarded by access:manage, no service data"

var rpcScopeProbes = map[string]scopeProbe{
	// EventService
	guardEventSvc + "CreateEvent": checked(func(scopeSeed) any { return createReq("svc-a") }),
	guardEventSvc + "UpdateEvent": checked(func(s scopeSeed) any { return updateReq(s.eventID, "svc-a") }),
	guardEventSvc + "DeleteEvents": checked(func(s scopeSeed) any {
		return &eventv1.DeleteEventRequest{Id: s.eventID}
	}),
	guardEventSvc + "GetEvent": checked(func(s scopeSeed) any { return &eventv1.GetEventRequest{Id: s.eventID} }),
	guardEventSvc + "AddChangelogEntry": checked(func(s scopeSeed) any {
		return &eventv1.AddChangelogEntryRequest{
			Id:    s.eventID,
			Entry: &eventv1.ChangelogEntry{User: "alice", ChangeType: eventv1.ChangeType_commented, Comment: "c"},
		}
	}),
	guardEventSvc + "GetEventChangelog": checked(func(s scopeSeed) any {
		return &eventv1.GetEventChangelogRequest{Id: s.eventID}
	}),
	guardEventSvc + "AddSlackId": checked(func(s scopeSeed) any {
		return &eventv1.AddSlackIdRequest{Id: s.eventID, SlackId: "S1"}
	}),
	guardEventSvc + "SearchEvents": filtered(
		func(scopeSeed) any { return &eventv1.SearchEventsRequest{Source: "scope-test"} },
		func(r any) bool {
			resp := r.(*eventv1.SearchEventsResponse)
			return len(resp.Events) == 0 && resp.TotalCount == 0
		}),
	guardEventSvc + "ListEvents": filtered(
		func(scopeSeed) any { return &eventv1.ListEventsRequest{} },
		func(r any) bool {
			resp := r.(*eventv1.ListEventsResponse)
			return len(resp.Events) == 0 && resp.TotalCount == 0
		}),
	guardEventSvc + "TodayEvents": filtered(
		func(scopeSeed) any { return &eventv1.TodayEventsRequest{} },
		func(r any) bool {
			resp := r.(*eventv1.TodayEventsResponse)
			return len(resp.Events) == 0 && resp.TotalCount == 0
		}),
	guardEventSvc + "GetEventStats": filtered(
		func(scopeSeed) any {
			start, end := statsDates()
			return &eventv1.GetEventStatsRequest{StartDate: start, EndDate: end, Source: "scope-test"}
		},
		func(r any) bool { return r.(*eventv1.GetEventStatsResponse).TotalCount == 0 }),
	guardEventSvc + "GetEventStatsByMonth": filtered(
		func(scopeSeed) any {
			start, end := statsDates()
			return &eventv1.GetEventStatsByMonthRequest{StartDate: start, EndDate: end, Source: "scope-test", GroupByService: true}
		},
		func(r any) bool {
			resp := r.(*eventv1.GetEventStatsByMonthResponse)
			return len(resp.Stats) == 0 && resp.TotalCount == 0
		}),

	// LockService
	guardLockSvc + "CreateLock": checked(func(scopeSeed) any {
		return &lockv1.CreateLockRequest{Service: "svc-a", Environment: "guard", Who: "x", Resource: "deployment"}
	}),
	guardLockSvc + "GetLock": checked(func(s scopeSeed) any { return &lockv1.GetLockRequest{Id: s.lockID} }),
	guardLockSvc + "UpdateLock": checked(func(s scopeSeed) any {
		return &lockv1.UpdateLockRequest{Id: s.lockID, Who: "x"}
	}),
	guardLockSvc + "UnLock": checked(func(s scopeSeed) any { return &lockv1.UnLockRequest{Id: s.lockID} }),
	guardLockSvc + "ListLocks": filtered(
		func(scopeSeed) any { return &lockv1.ListLocksRequest{} },
		func(r any) bool {
			resp := r.(*lockv1.ListLocksResponse)
			return len(resp.Locks) == 0 && resp.TotalCount == 0
		}),

	// CatalogService
	guardCatalogSvc + "CreateUpdateCatalog": checked(func(s scopeSeed) any {
		return &catalogv1.CreateUpdateCatalogRequest{Name: s.catalogName, Type: catalogv1.Type_project, Owner: "o", Version: "1"}
	}),
	guardCatalogSvc + "GetCatalog": checked(func(s scopeSeed) any {
		return &catalogv1.GetCatalogRequest{Name: s.catalogName}
	}),
	guardCatalogSvc + "DeleteCatalog": checked(func(s scopeSeed) any {
		return &catalogv1.DeleteCatalogRequest{Name: s.catalogName}
	}),
	guardCatalogSvc + "UpdateVersions": checked(func(s scopeSeed) any {
		return &catalogv1.UpdateVersionsRequest{Name: s.catalogName, AvailableVersions: []string{"1"}, LatestVersion: "1"}
	}),
	guardCatalogSvc + "UpdateDependencies": checked(func(s scopeSeed) any {
		return &catalogv1.UpdateDependenciesRequest{Name: s.catalogName, DependenciesOut: []string{"x"}}
	}),
	guardCatalogSvc + "ListCatalogs": filtered(
		func(scopeSeed) any { return &catalogv1.ListCatalogsRequest{} },
		func(r any) bool {
			resp := r.(*catalogv1.ListCatalogsResponse)
			return len(resp.Catalogs) == 0 && resp.TotalCount == 0
		}),
	guardCatalogSvc + "GetVersionCompliance": filtered(
		func(scopeSeed) any { return &catalogv1.GetVersionComplianceRequest{} },
		func(r any) bool {
			resp := r.(*catalogv1.GetVersionComplianceResponse)
			return len(resp.Projects) == 0 && resp.GetSummary().GetTotalProjects() == 0
		}),

	// AuthService
	guardAuthSvc + "Me":            exempt("returns the caller's own principal"),
	guardAuthSvc + "GetAuthConfig": exempt("public configuration, no service data"),
	guardAuthSvc + "ListUsers":     exempt(adminReason),
	guardAuthSvc + "CreateUser":    exempt(adminReason),
	guardAuthSvc + "UpdateUser":    exempt(adminReason),
	guardAuthSvc + "ListTeams":     exempt(adminReason),
	guardAuthSvc + "CreateTeam":    exempt(adminReason),
	guardAuthSvc + "UpdateTeam":    exempt(adminReason),
	guardAuthSvc + "DeleteTeam":    exempt(adminReason),
	guardAuthSvc + "ListApiKeys":   exempt(adminReason),
	guardAuthSvc + "CreateApiKey":  exempt(adminReason),
	guardAuthSvc + "RevokeApiKey":  exempt(adminReason),
}

func TestEveryRPCDeclaresAScopeStance(t *testing.T) {
	declared := map[string]bool{}
	for _, desc := range []grpc.ServiceDesc{
		eventv1.EventService_ServiceDesc,
		catalogv1.CatalogService_ServiceDesc,
		lockv1.LockService_ServiceDesc,
		authv1.AuthService_ServiceDesc,
	} {
		for _, m := range desc.Methods {
			declared["/"+desc.ServiceName+"/"+m.MethodName] = true
		}
	}

	for name := range declared {
		_, ok := rpcScopeProbes[name]
		assert.True(t, ok, "RPC %s has no scope stance in rpcScopeProbes: decide whether it is filtered, checked or exempt", name)
	}
	for name, p := range rpcScopeProbes {
		assert.True(t, declared[name], "rpcScopeProbes entry %s does not match any RPC (typo?)", name)
		switch p.stance {
		case scopeExempt:
			assert.NotEmpty(t, p.reason, "exempt RPC %s needs a reason", name)
		case scopeFiltered:
			assert.NotNil(t, p.empty, "filtered RPC %s needs an empty predicate", name)
			assert.NotNil(t, p.request, "RPC %s needs a request builder", name)
		default:
			assert.NotNil(t, p.request, "RPC %s needs a request builder", name)
		}
		_, ok := authz.MethodPermissions[name]
		assert.True(t, ok, "rpcScopeProbes entry %s is missing from authz.MethodPermissions", name)
	}
	for name := range authz.MethodPermissions {
		_, ok := rpcScopeProbes[name]
		assert.True(t, ok, "authz.MethodPermissions entry %s has no scope stance in rpcScopeProbes", name)
	}
}

// scopeFingerprint serializes every stored event, lock and catalog entry so a
// probe can prove it wrote nothing.
func scopeFingerprint(t *testing.T, s *scopeServices) string {
	t.Helper()
	ctx := context.Background()
	var b strings.Builder
	events, err := s.eventStore.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	locks, err := s.lockStore.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	catalogs, err := s.catalogs.store.List(ctx, auth.ScopeAll())
	require.NoError(t, err)
	var all []proto.Message
	for _, e := range events {
		all = append(all, e)
	}
	for _, l := range locks {
		all = append(all, l)
	}
	for _, c := range catalogs {
		all = append(all, c)
	}
	for _, m := range all {
		b.WriteString(protojson.Format(m))
	}
	return b.String()
}

func seedGuardData(t *testing.T, s *scopeServices) scopeSeed {
	t.Helper()
	seed := scopeSeed{
		eventID:     seedEvent(t, s, "svc-a"),
		lockID:      seedLock(t, s, "svc-a"),
		catalogName: "svc-a",
	}
	seedCatalog(t, s, &catalogv1.Catalog{Name: seed.catalogName, Type: catalogv1.Type_project})
	return seed
}

func callRPC(s *scopeServices, full string, p auth.Principal, req any) (any, error) {
	var impl any
	switch {
	case strings.HasPrefix(full, guardEventSvc):
		impl = s.events
	case strings.HasPrefix(full, guardLockSvc):
		impl = s.locks
	default:
		impl = s.catalogs
	}
	name := full[strings.LastIndex(full, "/")+1:]
	method := reflect.ValueOf(impl).MethodByName(name)
	if !method.IsValid() {
		return nil, status.Errorf(codes.Unimplemented, "%s not implemented", name)
	}
	out := method.Call([]reflect.Value{reflect.ValueOf(scopeCtx(p, full)), reflect.ValueOf(req)})
	err, _ := out[1].Interface().(error)
	return out[0].Interface(), err
}

func TestScopedRPCsEnforceAnEmptyScope(t *testing.T) {
	names := []string{}
	for name, p := range rpcScopeProbes {
		if p.stance != scopeExempt {
			names = append(names, name)
		}
	}
	sort.Strings(names)

	// Empty scope probes never write, so one database serves all of them.
	shared := newScopeServices(t, scopeDB(t))
	sharedSeed := seedGuardData(t, shared)
	destructive := map[string]bool{
		guardEventSvc + "DeleteEvents":    true,
		guardCatalogSvc + "DeleteCatalog": true,
		guardLockSvc + "UnLock":           true,
	}

	for _, full := range names {
		probe := rpcScopeProbes[full]
		t.Run(full[strings.LastIndex(full, "/")+1:], func(t *testing.T) {
			before := scopeFingerprint(t, shared)
			resp, err := callRPC(shared, full, scopedPrincipal(), probe.request(sharedSeed))
			switch probe.stance {
			case scopeChecked:
				requireDenied(t, err)
			case scopeFiltered:
				require.NoError(t, err)
				require.True(t, probe.empty(resp), "empty scope must see no data: %v", resp)
			}
			require.Equal(t, before, scopeFingerprint(t, shared), "an empty scope must not write")

			// Control: the same call with an unrestricted scope on the same
			// kind of data proves the probe really observes something.
			s, seed := shared, sharedSeed
			if destructive[full] {
				s = newScopeServices(t, scopeDB(t))
				seed = seedGuardData(t, s)
			}
			resp, err = callRPC(s, full, allScopePrincipal(), probe.request(seed))
			switch probe.stance {
			case scopeChecked:
				require.NotEqual(t, codes.PermissionDenied, status.Code(err), "unrestricted scope must pass: %v", err)
			case scopeFiltered:
				require.NoError(t, err)
				require.False(t, probe.empty(resp), "control must observe seeded data: %v", resp)
			}
		})
	}
}

var httpRouteSites = map[string]struct {
	calls  int
	reason string
}{
	"links.go":       {4, "custom links carry no service field"},
	"homer.go":       {1, "proxy of an external Homer dashboard, no Tracker service data"},
	"auth_http.go":   {1, "login, logout and password change act on the caller only"},
	"auth_oidc.go":   {1, "OpenID Connect login flow, no service data"},
	"../cmd/serv.go": {3, "swagger.json, docs and config.js are static, no service data"},
}

func TestCustomHTTPRoutesDeclareAScopeStance(t *testing.T) {
	found := map[string]bool{}
	for _, dir := range []string{".", "../cmd"} {
		entries, err := os.ReadDir(dir)
		require.NoError(t, err)
		for _, e := range entries {
			name := e.Name()
			if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				continue
			}
			path := filepath.ToSlash(filepath.Join(dir, name))
			if dir == "." {
				path = name
			}
			content, err := os.ReadFile(filepath.Join(dir, name))
			require.NoError(t, err)
			n := strings.Count(string(content), "HandlePath(")
			if n == 0 {
				continue
			}
			found[path] = true
			site, ok := httpRouteSites[path]
			assert.Equal(t, site.calls, n, "%s registers %d custom HTTP routes, the scope guard knows %d: declare whether the new route returns per-service data and scope it or add an exemption reason", path, n, site.calls)
			assert.True(t, ok, "%s is not declared in httpRouteSites", path)
			assert.NotEmpty(t, site.reason, "%s needs an exemption reason", path)
		}
	}
	for path := range httpRouteSites {
		assert.True(t, found[path], "httpRouteSites entry %s matches no file registering HandlePath routes", path)
	}
}
