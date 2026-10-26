package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/stretchr/testify/require"
)

const (
	e2ePrefix = "/api/v1alpha1"
	e2eTeamA  = "team-a"
	e2eTeamB  = "team-b"
)

var e2ePermissions = []string{
	"event:read", "event:write", "lock:read", "lock:write", "catalog:read", "catalog:write",
}

type scopeE2E struct {
	f       *authFixture
	s       *scopeServices
	handler http.Handler

	teamA, teamB     string
	alice, bob       *http.Cookie
	keyA, keyGlobal  string
	evA, evB, evNone string
	lockA, lockB     string
}

// newScopeE2E serves the event, lock, catalog and auth gateways and the
// cookie endpoints on a real mux behind the real auth middleware. mutate
// runs on the fixture before the handler is built.
func newScopeE2E(t *testing.T, mutate func(f *authFixture)) *scopeE2E {
	t.Helper()
	f := newAuthFixture(t)
	if mutate != nil {
		mutate(f)
	}
	s := newScopeServices(t, scopeDB(t))

	ctx := context.Background()
	mux := runtime.NewServeMux()
	require.NoError(t, eventv1.RegisterEventServiceHandlerServer(ctx, mux, s.events))
	require.NoError(t, lockv1.RegisterLockServiceHandlerServer(ctx, mux, s.locks))
	require.NoError(t, catalogv1.RegisterCatalogServiceHandlerServer(ctx, mux, s.catalogs))
	require.NoError(t, authv1.RegisterAuthServiceHandlerServer(ctx, mux, newAuthService(f)))
	NewAuthHTTP(f.users, f.sessions, f.cfg).Register(mux)
	return &scopeE2E{f: f, s: s, handler: auth.HTTPMiddleware(f.resolver, f.cfg)(mux)}
}

// do sends a request through the middleware and the mux.
func (h *scopeE2E) do(method, path, body string, cookie *http.Cookie, apiKey string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}
	if apiKey != "" {
		req.Header.Set(auth.APIKeyHeader, apiKey)
	}
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	return rec
}

func (h *scopeE2E) admin(t *testing.T) (*Auth, auth.Principal) {
	t.Helper()
	return newAuthService(h.f), h.f.principalOf(t, h.f.admin)
}

func (h *scopeE2E) createTeam(t *testing.T, name string, all bool, services ...string) string {
	t.Helper()
	svc, admin := h.admin(t)
	r, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{
		Name: name, Permissions: e2ePermissions, ScopeAll: all, ScopeServices: services,
	})
	require.NoError(t, err)
	return r.Team.Id
}

func (h *scopeE2E) createUser(t *testing.T, name, password string, teams ...string) {
	t.Helper()
	svc, admin := h.admin(t)
	_, err := svc.CreateUser(rpcCtx(admin, "CreateUser"), &authv1.CreateUserRequest{
		Username: name, Password: password, TeamIds: teams,
	})
	require.NoError(t, err)
}

func (h *scopeE2E) createKey(t *testing.T, name, teamID string) string {
	t.Helper()
	svc, admin := h.admin(t)
	r, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: name, TeamId: teamID})
	require.NoError(t, err)
	return r.Secret
}

// login signs a user in and completes the forced password change that users
// created by an administrator (and the bootstrap admin) go through, so the
// returned session is not refused before the scope is even checked.
func (h *scopeE2E) login(t *testing.T, user, password string) *http.Cookie {
	t.Helper()
	rec := post(h.handler, e2ePrefix+"/auth/login", `{"username":"`+user+`","password":"`+password+`"}`, nil)
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	rec = post(h.handler, e2ePrefix+"/auth/password", `{"currentPassword":"`+password+`","newPassword":"`+password+`-changed"}`, sessionCookie(t, rec))
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	return sessionCookie(t, rec)
}

// setup creates two single-service teams, a user and a key for team A, a user
// for team B, a global key and seeds events, locks and catalog entries.
func (h *scopeE2E) setup(t *testing.T) {
	t.Helper()
	h.teamA = h.createTeam(t, e2eTeamA, false, "service-a")
	h.teamB = h.createTeam(t, e2eTeamB, false, "service-b")
	h.createUser(t, "alice", "alice-initial-pass-1", h.teamA)
	h.createUser(t, "bob", "bob-initial-pass-12", h.teamB)
	h.keyA = h.createKey(t, "key-a", h.teamA)
	h.keyGlobal = h.createKey(t, "key-global", "")
	h.alice = h.login(t, "alice", "alice-initial-pass-1")
	h.bob = h.login(t, "bob", "bob-initial-pass-12")

	h.evA = seedEvent(t, h.s, "service-a")
	h.evB = seedEvent(t, h.s, "service-b")
	h.evNone = seedEvent(t, h.s, "")
	h.lockA = seedLock(t, h.s, "service-a")
	h.lockB = seedLock(t, h.s, "service-b")
	seedCatalog(t, h.s, &catalogv1.Catalog{Name: "service-a", Type: catalogv1.Type_project})
	seedCatalog(t, h.s, &catalogv1.Catalog{Name: "service-b", Type: catalogv1.Type_project})
}

func bodyJSON(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out), rec.Body.String())
	return out
}

// listField returns the objects held under key in a 200 list response.
func listField(t *testing.T, rec *httptest.ResponseRecorder, key string) []map[string]any {
	t.Helper()
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	out := []map[string]any{}
	raw, _ := bodyJSON(t, rec)[key].([]any)
	for _, r := range raw {
		m, ok := r.(map[string]any)
		require.True(t, ok)
		out = append(out, m)
	}
	return out
}

func eventServices(t *testing.T, rec *httptest.ResponseRecorder) []string {
	t.Helper()
	out := []string{}
	for _, e := range listField(t, rec, "events") {
		attrs, _ := e["attributes"].(map[string]any)
		svc, _ := attrs["service"].(string)
		out = append(out, svc)
	}
	return out
}

func lockServices(t *testing.T, rec *httptest.ResponseRecorder) []string {
	t.Helper()
	out := []string{}
	for _, l := range listField(t, rec, "locks") {
		svc, _ := l["service"].(string)
		out = append(out, svc)
	}
	return out
}

func catalogNames(t *testing.T, rec *httptest.ResponseRecorder) []string {
	t.Helper()
	out := []string{}
	for _, c := range listField(t, rec, "catalogs") {
		n, _ := c["name"].(string)
		out = append(out, n)
	}
	return out
}

func strs(v any) []string {
	out := []string{}
	raw, _ := v.([]any)
	for _, s := range raw {
		str, _ := s.(string)
		out = append(out, str)
	}
	return out
}

func e2eEventBody(service string) string {
	return `{"title":"t","attributes":{"service":"` + service +
		`","type":"incident","status":"open","environment":"production","priority":"P3","source":"e2e","owner":"alice"},"links":{}}`
}

func e2eUpdateBody(id, service string) string {
	return `{"id":"` + id + `","title":"t2","attributes":{"service":"` + service +
		`","type":"incident","status":"open","environment":"production","priority":"P3","source":"e2e","owner":"alice"},"links":{}}`
}

// requireForbidden asserts a 403 carrying the gateway JSON error body.
func requireForbidden(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	require.Contains(t, rec.Header().Get("Content-Type"), "application/json")
	body := bodyJSON(t, rec)
	require.EqualValues(t, 7, body["code"])
	require.NotEmpty(t, body["message"])
}

// eventCount counts the stored events of a service, bypassing the scope.
func (h *scopeE2E) eventCount(t *testing.T, service string) int {
	t.Helper()
	all, err := h.s.eventStore.List(context.Background(), auth.ScopeAll())
	require.NoError(t, err)
	n := 0
	for _, e := range all {
		if e.Attributes.Service == service {
			n++
		}
	}
	return n
}

func (h *scopeE2E) storedEvent(t *testing.T, id string) *eventv1.Event {
	t.Helper()
	e, err := h.s.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": id})
	require.NoError(t, err)
	return e
}

func (h *scopeE2E) eventExists(t *testing.T, id string) bool {
	t.Helper()
	return h.do(http.MethodGet, e2ePrefix+"/event/"+id, "", nil, h.keyGlobal).Code == http.StatusOK
}

func TestE2EMeReturnsScope(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)

	rec := h.do(http.MethodGet, e2ePrefix+"/auth/me", "", h.alice, "")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	me := bodyJSON(t, rec)
	require.Equal(t, "user", me["kind"])
	require.Equal(t, []string{"service-a"}, strs(me["scopeServices"]))
	require.Equal(t, false, me["scopeAll"])

	rec = h.do(http.MethodGet, e2ePrefix+"/auth/me", "", nil, h.keyA)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	me = bodyJSON(t, rec)
	require.Equal(t, "apikey", me["kind"])
	require.Equal(t, []string{"service-a"}, strs(me["scopeServices"]))
	require.Equal(t, false, me["scopeAll"])

	rec = h.do(http.MethodGet, e2ePrefix+"/auth/me", "", nil, h.keyGlobal)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	me = bodyJSON(t, rec)
	require.Equal(t, true, me["scopeAll"])
	require.Empty(t, strs(me["scopeServices"]))

	rec = h.do(http.MethodGet, e2ePrefix+"/auth/me", "", nil, "")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	me = bodyJSON(t, rec)
	require.Equal(t, "anonymous", me["kind"])
	require.Equal(t, true, me["scopeAll"])
	require.Empty(t, strs(me["permissions"]))
}

// scopedChecks runs the essential assertions for a caller scoped to service-a.
func (h *scopeE2E) scopedChecks(t *testing.T, cookie *http.Cookie, key string) {
	t.Helper()
	do := func(method, path, body string) *httptest.ResponseRecorder {
		return h.do(method, e2ePrefix+path, body, cookie, key)
	}

	require.Equal(t, []string{"service-a"}, eventServices(t, do(http.MethodGet, "/events/list", "")))

	require.Equal(t, http.StatusOK, do(http.MethodGet, "/event/"+h.evA, "").Code)
	requireForbidden(t, do(http.MethodGet, "/event/"+h.evB, ""))
	requireForbidden(t, do(http.MethodGet, "/event/"+h.evNone, ""))

	rec := do(http.MethodPost, "/event", e2eEventBody("service-a"))
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	before := h.eventCount(t, "service-b")
	requireForbidden(t, do(http.MethodPost, "/event", e2eEventBody("service-b")))
	require.Equal(t, before, h.eventCount(t, "service-b"), "denied create stores nothing")

	prev := h.storedEvent(t, h.evA)
	requireForbidden(t, do(http.MethodPut, "/event", e2eUpdateBody(h.evA, "service-b")))
	after := h.storedEvent(t, h.evA)
	require.Equal(t, "service-a", after.Attributes.Service)
	require.Equal(t, prev.Title, after.Title)
	requireForbidden(t, do(http.MethodDelete, "/event/"+h.evB, ""))
	require.True(t, h.eventExists(t, h.evB), "denied delete leaves the event")
}

func TestE2EUserScope(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	do := func(method, path, body string) *httptest.ResponseRecorder {
		return h.do(method, e2ePrefix+path, body, h.alice, "")
	}

	// Events.
	h.scopedChecks(t, h.alice, "")
	require.Equal(t, http.StatusOK, do(http.MethodDelete, "/event/"+h.evA, "").Code)
	require.False(t, h.eventExists(t, h.evA))

	// Locks.
	require.Equal(t, []string{"service-a"}, lockServices(t, do(http.MethodGet, "/locks/list", "")))
	requireForbidden(t, do(http.MethodGet, "/unlock/"+h.lockB, ""))
	_, err := h.s.lockStore.Get(context.Background(), map[string]interface{}{"id": h.lockB})
	require.NoError(t, err, "denied unlock keeps the lock")
	requireForbidden(t, do(http.MethodGet, "/lock/"+h.lockB, ""))
	require.Equal(t, http.StatusOK, do(http.MethodGet, "/lock/"+h.lockA, "").Code)

	// Catalog.
	require.Equal(t, []string{"service-a"}, catalogNames(t, do(http.MethodGet, "/catalogs/list", "")))
	require.Equal(t, http.StatusOK, do(http.MethodGet, "/catalog?name=service-a", "").Code)
	requireForbidden(t, do(http.MethodGet, "/catalog?name=service-b", ""))
	prevB, err := h.s.catalogs.store.Get(context.Background(), map[string]interface{}{"name": "service-b"})
	require.NoError(t, err)
	requireForbidden(t, do(http.MethodPut, "/catalog", `{"name":"service-b","owner":"o","version":"1"}`))
	requireForbidden(t, do(http.MethodDelete, "/catalog?name=service-b", ""))
	gotB, err := h.s.catalogs.store.Get(context.Background(), map[string]interface{}{"name": "service-b"})
	require.NoError(t, err, "denied delete keeps the entry")
	require.Equal(t, prevB.Owner, gotB.Owner)
	require.Equal(t, prevB.Version, gotB.Version)

	// Statistics only count service-a (the created and deleted events balance
	// out: one remains from the create above, the seeded one was deleted).
	start, end := statsDates()
	q := url.Values{"start_date": {start}, "end_date": {end}}.Encode()
	rec := do(http.MethodGet, "/events/stats?"+q, "")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.EqualValues(t, "1", bodyJSON(t, rec)["totalCount"])
}

func TestE2ETeamAPIKeyScope(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	h.scopedChecks(t, nil, h.keyA)
}

func TestE2EOtherTeamSeesItsOwn(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	require.Equal(t, []string{"service-b"}, eventServices(t, h.do(http.MethodGet, e2ePrefix+"/events/list", "", h.bob, "")))
	requireForbidden(t, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evA, "", h.bob, ""))
	require.Equal(t, http.StatusOK, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evB, "", h.bob, "").Code)
}

func TestE2EGlobalKeyAndAdminSeeEverything(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	adminCookie := h.login(t, "admin", "admin-password-123")

	for name, c := range map[string]struct {
		cookie *http.Cookie
		key    string
	}{"global key": {nil, h.keyGlobal}, "admin": {adminCookie, ""}} {
		t.Run(name, func(t *testing.T) {
			rec := h.do(http.MethodGet, e2ePrefix+"/events/list", "", c.cookie, c.key)
			require.ElementsMatch(t, []string{"service-a", "service-b", ""}, eventServices(t, rec))
			require.Equal(t, http.StatusOK, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evNone, "", c.cookie, c.key).Code)
			require.Len(t, lockServices(t, h.do(http.MethodGet, e2ePrefix+"/locks/list", "", c.cookie, c.key)), 2)
			require.Len(t, catalogNames(t, h.do(http.MethodGet, e2ePrefix+"/catalogs/list", "", c.cookie, c.key)), 2)
		})
	}
}

func TestE2EScopeChangeIsImmediate(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	list := func(cookie *http.Cookie, key string) []string {
		return eventServices(t, h.do(http.MethodGet, e2ePrefix+"/events/list", "", cookie, key))
	}
	require.Equal(t, []string{"service-a"}, list(h.alice, ""))
	require.Equal(t, []string{"service-a"}, list(nil, h.keyA))

	svc, admin := h.admin(t)
	_, err := svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: h.teamA, Name: e2eTeamA, Permissions: e2ePermissions, ScopeServices: []string{"service-b"},
	})
	require.NoError(t, err)

	// Same cookie, same key, no restart.
	require.Equal(t, []string{"service-b"}, list(h.alice, ""))
	require.Equal(t, []string{"service-b"}, list(nil, h.keyA))
	requireForbidden(t, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evA, "", h.alice, ""))
	requireForbidden(t, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evA, "", nil, h.keyA))
	rec := h.do(http.MethodGet, e2ePrefix+"/auth/me", "", h.alice, "")
	require.Equal(t, []string{"service-b"}, strs(bodyJSON(t, rec)["scopeServices"]))
}

func TestE2EAnonymousWithReadPermissionSeesAll(t *testing.T) {
	h := newScopeE2E(t, func(f *authFixture) {
		perms := []auth.Permission{auth.PermEventRead}
		f.cfg.AnonymousPermissions = perms
		f.resolver.AnonymousPermissions = perms
	})
	h.setup(t)
	rec := h.do(http.MethodGet, e2ePrefix+"/events/list", "", nil, "")
	require.ElementsMatch(t, []string{"service-a", "service-b", ""}, eventServices(t, rec))
}

func TestE2EForbiddenBodyHasNoObjectData(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	secret := seedEvent(t, h.s, "service-b")
	_, err := h.s.eventStore.Update(context.Background(), map[string]interface{}{"metadata.id": secret}, &eventv1.Event{
		Title:      "secret-title-b",
		Attributes: scopeAttrs("service-b"),
		Links:      &eventv1.EventLinks{},
		Metadata:   &eventv1.EventMetadata{Id: secret},
	})
	require.NoError(t, err)

	rec := h.do(http.MethodGet, e2ePrefix+"/event/"+secret, "", h.alice, "")
	requireForbidden(t, rec)
	require.Contains(t, rec.Body.String(), "service-b")
	require.NotContains(t, rec.Body.String(), "secret-title-b")
	require.NotContains(t, rec.Body.String(), secret)
}

func TestE2EInvalidAPIKeyStaysUnauthorized(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	for _, path := range []string{"/events/list", "/event/" + h.evA, "/auth/me"} {
		rec := h.do(http.MethodGet, e2ePrefix+path, "", nil, "trk_not-a-real-key")
		require.Equal(t, http.StatusUnauthorized, rec.Code, path+" "+rec.Body.String())
	}
}

func TestE2EUserInTwoTeamsGetsTheUnion(t *testing.T) {
	h := newScopeE2E(t, nil)
	h.setup(t)
	h.createUser(t, "carol", "carol-initial-pass-1", h.teamA, h.teamB)
	carol := h.login(t, "carol", "carol-initial-pass-1")

	rec := h.do(http.MethodGet, e2ePrefix+"/events/list", "", carol, "")
	require.ElementsMatch(t, []string{"service-a", "service-b"}, eventServices(t, rec))
	require.Equal(t, http.StatusOK, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evB, "", carol, "").Code)
	requireForbidden(t, h.do(http.MethodGet, e2ePrefix+"/event/"+h.evNone, "", carol, ""))
	me := bodyJSON(t, h.do(http.MethodGet, e2ePrefix+"/auth/me", "", carol, ""))
	require.Equal(t, []string{"service-a", "service-b"}, strs(me["scopeServices"]))

	// A team with scope all turns the union into all.
	everything := h.createTeam(t, "team-all", true)
	svc, admin := h.admin(t)
	carolUser, err := h.f.users.GetByUsername(context.Background(), "carol")
	require.NoError(t, err)
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{
		Id: carolUser.ID.Hex(), TeamIds: []string{h.teamA, h.teamB, everything},
	})
	require.NoError(t, err)

	rec = h.do(http.MethodGet, e2ePrefix+"/events/list", "", carol, "")
	require.ElementsMatch(t, []string{"service-a", "service-b", ""}, eventServices(t, rec))
	me = bodyJSON(t, h.do(http.MethodGet, e2ePrefix+"/auth/me", "", carol, ""))
	require.Equal(t, true, me["scopeAll"])
}

func TestScopeSlackIDLookups(t *testing.T) {
	x := newScopeEnv(t)
	pa := x.pa

	// AddSlackId by a scoped (non empty) user on an out-of-scope event.
	_, err := x.s.events.AddSlackId(x.ctx(pa, "AddSlackId"), &eventv1.AddSlackIdRequest{Id: x.b, SlackId: "SLACK-B"})
	requireDenied(t, err)
	require.Empty(t, x.stored(t, x.b).Metadata.SlackId)

	for id, slack := range map[string]string{x.a: "SLACK-A", x.b: "SLACK-B"} {
		_, err := x.s.events.AddSlackId(x.ctx(x.all, "AddSlackId"), &eventv1.AddSlackIdRequest{Id: id, SlackId: slack})
		require.NoError(t, err)
	}

	// GetEvent through the slack id branch (non UUID id).
	_, err = x.s.events.GetEvent(x.ctx(pa, "GetEvent"), &eventv1.GetEventRequest{Id: "SLACK-A"})
	require.NoError(t, err)
	_, err = x.s.events.GetEvent(x.ctx(pa, "GetEvent"), &eventv1.GetEventRequest{Id: "SLACK-B"})
	requireDenied(t, err)

	// UpdateEvent through the slack id branch.
	before := x.stored(t, x.b)
	req := updateReq("", "service-b")
	req.SlackId = "SLACK-B"
	_, err = x.s.events.UpdateEvent(x.ctx(pa, "UpdateEvent"), req)
	requireDenied(t, err)
	req.Attributes = scopeAttrs("svc-a")
	_, err = x.s.events.UpdateEvent(x.ctx(pa, "UpdateEvent"), req)
	requireDenied(t, err)
	after := x.stored(t, x.b)
	require.Equal(t, before.Title, after.Title)
	require.Equal(t, "svc-b", after.Attributes.Service)

	// GetEventChangelog on an out-of-scope event.
	_, err = x.s.events.GetEventChangelog(x.ctx(pa, "GetEventChangelog"), &eventv1.GetEventChangelogRequest{Id: x.b})
	requireDenied(t, err)
}

func TestScopeCatalogEmptyName(t *testing.T) {
	x := newCatalogScopeEnv(t)
	_, err := x.s.catalogs.GetCatalog(x.ctx(x.pa, "GetCatalog"), &catalogv1.GetCatalogRequest{})
	requireDenied(t, err)
	_, err = x.s.catalogs.DeleteCatalog(x.ctx(x.pa, "DeleteCatalog"), &catalogv1.DeleteCatalogRequest{})
	requireDenied(t, err)
	_, err = x.s.catalogs.UpdateVersions(x.ctx(x.pa, "UpdateVersions"), &catalogv1.UpdateVersionsRequest{ReferenceVersion: "9.9.9"})
	requireDenied(t, err)

	// Denials leave Mongo untouched.
	require.Equal(t, "2.0.0", x.stored(t, "lib-a").ReferenceVersion)
	require.Equal(t, "7.7.7", x.stored(t, "lib-b").ReferenceVersion)
	for _, n := range []string{"proj-a", "proj-b", "lib-a", "lib-b"} {
		require.True(t, x.exists(t, n))
	}

	_, err = x.s.catalogs.UpdateVersions(x.ctx(x.pa, "UpdateVersions"),
		&catalogv1.UpdateVersionsRequest{Name: "lib-b", ReferenceVersion: "9.9.9"})
	requireDenied(t, err)
	_, err = x.s.catalogs.UpdateDependencies(x.ctx(x.pa, "UpdateDependencies"),
		&catalogv1.UpdateDependenciesRequest{Name: "proj-b", DependenciesOut: []string{"svc-z"}})
	requireDenied(t, err)
	require.Equal(t, "7.7.7", x.stored(t, "lib-b").ReferenceVersion)
	require.Empty(t, x.stored(t, "proj-b").DependenciesOut)
}
