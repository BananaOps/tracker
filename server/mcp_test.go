package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// headerTransport adds fixed headers to every request of an MCP client.
type headerTransport struct{ header http.Header }

func (h headerTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	r = r.Clone(r.Context())
	for k, v := range h.header {
		r.Header[k] = v
	}
	return http.DefaultTransport.RoundTrip(r)
}

// newMCPE2E serves the MCP endpoint behind the real auth middleware, on the
// services and identities of a scope e2e fixture: team A (service-a) with
// alice and key A, team B (service-b) with bob, and a global key.
func newMCPE2E(t *testing.T) (*scopeE2E, string) {
	t.Helper()
	h := newScopeE2E(t, nil)
	h.setup(t)
	mux := runtime.NewServeMux()
	require.NoError(t, RegisterMCPHandler(mux, h.s.events, h.s.catalogs, h.s.locks))
	srv := httptest.NewServer(auth.HTTPMiddleware(h.f.resolver, h.f.cfg)(mux))
	t.Cleanup(srv.Close)
	return h, srv.URL + MCPPath
}

func mcpSession(t *testing.T, endpoint string, header http.Header) *mcp.ClientSession {
	t.Helper()
	client := mcp.NewClient(&mcp.Implementation{Name: "tracker-test", Version: "test"}, nil)
	session, err := client.Connect(context.Background(), &mcp.StreamableClientTransport{
		Endpoint:   endpoint,
		HTTPClient: &http.Client{Transport: headerTransport{header: header}},
	}, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = session.Close() })
	return session
}

func apiKeyHeader(key string) http.Header {
	return http.Header{"Authorization": {"Bearer " + key}}
}

// callTool calls a tool and decodes its JSON text content.
func callTool(t *testing.T, s *mcp.ClientSession, name string, args map[string]any) (map[string]any, *mcp.CallToolResult) {
	t.Helper()
	res, err := s.CallTool(context.Background(), &mcp.CallToolParams{Name: name, Arguments: args})
	require.NoError(t, err)
	require.NotEmpty(t, res.Content)
	text := res.Content[0].(*mcp.TextContent).Text
	if res.IsError {
		return nil, res
	}
	var out map[string]any
	require.NoError(t, json.Unmarshal([]byte(text), &out), text)
	return out, res
}

func toolError(res *mcp.CallToolResult) string {
	if res == nil || !res.IsError {
		return ""
	}
	return res.Content[0].(*mcp.TextContent).Text
}

func listedServices(t *testing.T, out map[string]any, key string, service func(map[string]any) string) []string {
	t.Helper()
	var services []string
	items, _ := out[key].([]any)
	for _, it := range items {
		services = append(services, service(it.(map[string]any)))
	}
	return services
}

func eventService(e map[string]any) string {
	attrs, _ := e["attributes"].(map[string]any)
	s, _ := attrs["service"].(string)
	return s
}

func fieldString(name string) func(map[string]any) string {
	return func(m map[string]any) string { s, _ := m[name].(string); return s }
}

func TestMCPListsReadOnlyTools(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	res, err := mcpSession(t, endpoint, apiKeyHeader(h.keyGlobal)).ListTools(context.Background(), nil)
	require.NoError(t, err)

	var names []string
	for _, tool := range res.Tools {
		names = append(names, tool.Name)
		require.NotNil(t, tool.Annotations, tool.Name)
		assert.True(t, tool.Annotations.ReadOnlyHint, tool.Name)
	}
	assert.ElementsMatch(t, []string{
		"list_events", "today_events", "search_events", "get_event",
		"list_catalog", "get_catalog_service", "list_locks", "get_lock",
	}, names)
}

func TestMCPTeamKeySeesOnlyItsScope(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, apiKeyHeader(h.keyA))

	out, res := callTool(t, s, "list_events", nil)
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-a"}, listedServices(t, out, "events", eventService))

	out, res = callTool(t, s, "today_events", nil)
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-a"}, listedServices(t, out, "events", eventService))

	out, res = callTool(t, s, "search_events", map[string]any{"type": "incident"})
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-a"}, listedServices(t, out, "events", eventService))

	out, res = callTool(t, s, "list_locks", nil)
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-a"}, listedServices(t, out, "locks", fieldString("service")))

	out, res = callTool(t, s, "list_catalog", nil)
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-a"}, listedServices(t, out, "catalogs", fieldString("name")))

	out, res = callTool(t, s, "get_event", map[string]any{"event_id": h.evA})
	require.Empty(t, toolError(res))
	assert.Equal(t, "service-a", eventService(out["event"].(map[string]any)))

	for name, args := range map[string]map[string]any{
		"get_event":           {"event_id": h.evB},
		"get_lock":            {"lock_id": h.lockB},
		"get_catalog_service": {"service_name": "service-b"},
	} {
		_, res := callTool(t, s, name, args)
		assert.Contains(t, toolError(res), `service "service-b" is outside your scope`, name)
	}
	_, res = callTool(t, s, "get_event", map[string]any{"event_id": h.evNone})
	assert.Contains(t, toolError(res), "require an unrestricted scope")
}

func TestMCPSessionUserSeesOnlyItsScope(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, http.Header{"Cookie": {h.bob.String()}})

	out, res := callTool(t, s, "list_events", nil)
	require.Empty(t, toolError(res))
	assert.Equal(t, []string{"service-b"}, listedServices(t, out, "events", eventService))
}

func TestMCPGlobalKeySeesEverything(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, http.Header{auth.APIKeyHeader: {h.keyGlobal}})

	out, res := callTool(t, s, "list_events", nil)
	require.Empty(t, toolError(res))
	assert.ElementsMatch(t, []string{"service-a", "service-b", ""}, listedServices(t, out, "events", eventService))

	_, res = callTool(t, s, "get_lock", map[string]any{"lock_id": h.lockB})
	assert.Empty(t, toolError(res))
}

func TestMCPListEventsPagesUnfilteredList(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, apiKeyHeader(h.keyGlobal))

	first, res := callTool(t, s, "list_events", map[string]any{"per_page": 2})
	require.Empty(t, toolError(res))
	second, res := callTool(t, s, "list_events", map[string]any{"per_page": 2, "page": 2})
	require.Empty(t, toolError(res))

	assert.Len(t, listedServices(t, first, "events", eventService), 2)
	assert.Len(t, listedServices(t, second, "events", eventService), 1)
	assert.EqualValues(t, 3, first["totalCount"])
	assert.ElementsMatch(t, []string{"service-a", "service-b", ""},
		append(listedServices(t, first, "events", eventService), listedServices(t, second, "events", eventService)...))
}

func TestMCPAnonymousFollowsAnonymousPermissions(t *testing.T) {
	_, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, nil)

	// The fixture grants no anonymous permission.
	_, res := callTool(t, s, "list_events", nil)
	assert.NotEmpty(t, toolError(res))
}

func TestMCPRejectsInvalidCredentials(t *testing.T) {
	_, endpoint := newMCPE2E(t)
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.Header.Set("Authorization", "Bearer trk_not-a-valid-key")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Contains(t, resp.Header.Get("WWW-Authenticate"), "Bearer")
}

func TestMCPRejectsUnknownEnumValues(t *testing.T) {
	h, endpoint := newMCPE2E(t)
	s := mcpSession(t, endpoint, apiKeyHeader(h.keyGlobal))

	_, res := callTool(t, s, "search_events", map[string]any{"environment": "prod"})
	assert.Contains(t, toolError(res), `unknown environment "prod"`)
}

func TestPaginate(t *testing.T) {
	items := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}

	page, total := paginate(items, mcpPage{})
	assert.Equal(t, []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, page)
	assert.Equal(t, uint32(12), total)

	page, _ = paginate(items, mcpPage{PerPage: 5, Page: 3})
	assert.Equal(t, []int{11, 12}, page)

	page, _ = paginate(items, mcpPage{PerPage: 5, Page: 4})
	assert.Empty(t, page)

	page, _ = paginate(items, mcpPage{PerPage: 1000})
	assert.Len(t, page, 12, "per_page is capped, not rejected")
}
