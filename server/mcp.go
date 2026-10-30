package server

import (
	"context"
	"fmt"
	"net/http"
	"runtime/debug"
	"sort"
	"strings"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// MCPPath is where the Model Context Protocol endpoint is served.
const MCPPath = "/mcp"

const (
	mcpDefaultPerPage = 10
	mcpMaxPerPage     = 100
)

// RegisterMCPHandler serves read-only Tracker tools to AI agents over the
// Model Context Protocol (Streamable HTTP) at MCPPath.
//
// The handler is stateless: every MCP request is handled within its own HTTP
// request, whose context carries the principal resolved by
// auth.HTTPMiddleware. Tools call the services in process under the name of
// the matching RPC, so permissions, the per-service team scope and the forced
// password change apply exactly as on the REST API.
func RegisterMCPHandler(mux *runtime.ServeMux, events *Event, catalogs *Catalog, locks *Lock) error {
	srv := newMCPServer(events, catalogs, locks)
	h := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return srv }, &mcp.StreamableHTTPOptions{
		Stateless:    true,
		JSONResponse: true,
	})
	for _, method := range []string{http.MethodPost, http.MethodGet, http.MethodDelete} {
		if err := mux.HandlePath(method, MCPPath, func(w http.ResponseWriter, r *http.Request, _ map[string]string) {
			// A refused credential is reported before the MCP exchange, so
			// that clients surface an authentication error instead of tools
			// that all fail.
			if p, ok := auth.FromContext(r.Context()); ok && p.CredentialRejected {
				w.Header().Set("WWW-Authenticate", `Bearer realm="tracker"`)
				http.Error(w, "invalid or expired credentials", http.StatusUnauthorized)
				return
			}
			h.ServeHTTP(w, r)
		}); err != nil {
			return err
		}
	}
	return nil
}

func newMCPServer(events *Event, catalogs *Catalog, locks *Lock) *mcp.Server {
	version := "dev"
	if info, ok := debug.ReadBuildInfo(); ok && info.Main.Version != "" {
		version = info.Main.Version
	}
	srv := mcp.NewServer(&mcp.Implementation{Name: "tracker", Title: "Tracker", Version: version}, nil)
	readOnly := &mcp.ToolAnnotations{ReadOnlyHint: true}

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_events",
		Description: "List Tracker events (deployments, operations, drifts, incidents, RPA usage), newest first. Optional filters narrow the list.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpListEventsInput) (*mcp.CallToolResult, any, error) {
		search := &eventv1.SearchEventsRequest{Service: in.Service}
		if err := parseEnum(in.Type, eventv1.Type_value, "type", func(v int32) { search.Type = eventv1.Type(v) }); err != nil {
			return nil, nil, err
		}
		if err := parseEnum(in.Status, eventv1.Status_value, "status", func(v int32) { search.Status = eventv1.Status(v) }); err != nil {
			return nil, nil, err
		}
		if search.Service == "" && search.Type == 0 && search.Status == 0 {
			// Unfiltered: let the store page the collection, newest first,
			// instead of loading every event.
			perPage, page := in.bounds()
			r, err := events.ListEvents(rpcContext(ctx, eventv1.EventService_ListEvents_FullMethodName), &eventv1.ListEventsRequest{
				PerPage: wrapperspb.UInt32(uint32(perPage)), // #nosec G115 -- bounded by mcpMaxPerPage
				Page:    wrapperspb.Int32(int32(page)),      // #nosec G115 -- a page number never reaches 2^31
			})
			if err != nil {
				return nil, nil, err
			}
			return protoResult(r)
		}
		r, err := events.SearchEvents(rpcContext(ctx, eventv1.EventService_SearchEvents_FullMethodName), search)
		if err != nil {
			return nil, nil, err
		}
		return eventPage(r.Events, in.mcpPage)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "today_events",
		Description: "List the Tracker events starting today, newest first.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpPage) (*mcp.CallToolResult, any, error) {
		r, err := events.TodayEvents(rpcContext(ctx, eventv1.EventService_TodayEvents_FullMethodName), &eventv1.TodayEventsRequest{})
		if err != nil {
			return nil, nil, err
		}
		return eventPage(r.Events, in)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "search_events",
		Description: "Search Tracker events by source, type, priority, status, service, environment and start date range, newest first. At least one filter is required.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpSearchEventsInput) (*mcp.CallToolResult, any, error) {
		req := &eventv1.SearchEventsRequest{Source: in.Source, Service: in.Service, StartDate: in.StartDate, EndDate: in.EndDate}
		for _, e := range []struct {
			value, field string
			values       map[string]int32
			set          func(int32)
		}{
			{in.Type, "type", eventv1.Type_value, func(v int32) { req.Type = eventv1.Type(v) }},
			{in.Priority, "priority", eventv1.Priority_value, func(v int32) { req.Priority = eventv1.Priority(v) }},
			{in.Status, "status", eventv1.Status_value, func(v int32) { req.Status = eventv1.Status(v) }},
			{in.Environment, "environment", eventv1.Environment_value, func(v int32) { req.Environment = eventv1.Environment(v) }},
		} {
			if err := parseEnum(e.value, e.values, e.field, e.set); err != nil {
				return nil, nil, err
			}
		}
		r, err := events.SearchEvents(rpcContext(ctx, eventv1.EventService_SearchEvents_FullMethodName), req)
		if err != nil {
			return nil, nil, err
		}
		return eventPage(r.Events, in.mcpPage)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_event",
		Description: "Get one Tracker event by its id or by its Slack message id.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpEventIDInput) (*mcp.CallToolResult, any, error) {
		r, err := events.GetEvent(rpcContext(ctx, eventv1.EventService_GetEvent_FullMethodName), &eventv1.GetEventRequest{Id: in.EventID})
		if err != nil {
			return nil, nil, err
		}
		return protoResult(r)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_catalog",
		Description: "List the services, modules, libraries and containers of the Tracker catalog, by name.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpPage) (*mcp.CallToolResult, any, error) {
		r, err := catalogs.ListCatalogs(rpcContext(ctx, catalogv1.CatalogService_ListCatalogs_FullMethodName), &catalogv1.ListCatalogsRequest{})
		if err != nil {
			return nil, nil, err
		}
		list := r.Catalogs
		sort.SliceStable(list, func(i, j int) bool { return list[i].GetName() < list[j].GetName() })
		page, total := paginate(list, in)
		return protoResult(&catalogv1.ListCatalogsResponse{Catalogs: page, TotalCount: total})
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_catalog_service",
		Description: "Get one catalog entry by its name, with its versions, dependencies and links.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpServiceNameInput) (*mcp.CallToolResult, any, error) {
		r, err := catalogs.GetCatalog(rpcContext(ctx, catalogv1.CatalogService_GetCatalog_FullMethodName), &catalogv1.GetCatalogRequest{Name: in.ServiceName})
		if err != nil {
			return nil, nil, err
		}
		return protoResult(r)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_locks",
		Description: "List the active Tracker locks with their service, environment, resource and owner.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpPage) (*mcp.CallToolResult, any, error) {
		r, err := locks.ListLocks(rpcContext(ctx, lockv1.LockService_ListLocks_FullMethodName), &lockv1.ListLocksRequest{})
		if err != nil {
			return nil, nil, err
		}
		page, total := paginate(r.Locks, in)
		return protoResult(&lockv1.ListLocksResponse{Locks: page, TotalCount: total})
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_lock",
		Description: "Get one Tracker lock by its id.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in mcpLockIDInput) (*mcp.CallToolResult, any, error) {
		r, err := locks.GetLock(rpcContext(ctx, lockv1.LockService_GetLock_FullMethodName), &lockv1.GetLockRequest{Id: in.LockID})
		if err != nil {
			return nil, nil, err
		}
		return protoResult(r)
	})

	return srv
}

type mcpPage struct {
	PerPage int `json:"per_page,omitempty" jsonschema:"number of items per page, default 10, at most 100"`
	Page    int `json:"page,omitempty" jsonschema:"page number starting at 1, default 1"`
}

type mcpListEventsInput struct {
	mcpPage
	Type    string `json:"type,omitempty" jsonschema:"event type: deployment, operation, drift, incident or rpa_usage"`
	Service string `json:"service,omitempty" jsonschema:"service name"`
	Status  string `json:"status,omitempty" jsonschema:"status, for example start, success, failure, open, close, done, in_progress"`
}

type mcpSearchEventsInput struct {
	mcpPage
	Source      string `json:"source,omitempty" jsonschema:"event source, for example github-actions or manual"`
	Type        string `json:"type,omitempty" jsonschema:"event type: deployment, operation, drift, incident or rpa_usage"`
	Priority    string `json:"priority,omitempty" jsonschema:"priority: P1 to P5"`
	Status      string `json:"status,omitempty" jsonschema:"status, for example start, success, failure, open, close, done, in_progress"`
	Service     string `json:"service,omitempty" jsonschema:"service name"`
	Environment string `json:"environment,omitempty" jsonschema:"environment: development, integration, TNR, UAT, recette, preproduction, production or mco"`
	StartDate   string `json:"start_date,omitempty" jsonschema:"events starting at or after this date, YYYY-MM-DD or RFC 3339"`
	EndDate     string `json:"end_date,omitempty" jsonschema:"events starting at or before this date, YYYY-MM-DD or RFC 3339"`
}

type mcpEventIDInput struct {
	EventID string `json:"event_id" jsonschema:"event id, or the Slack message id of the event"`
}

type mcpServiceNameInput struct {
	ServiceName string `json:"service_name" jsonschema:"catalog entry name"`
}

type mcpLockIDInput struct {
	LockID string `json:"lock_id" jsonschema:"lock id"`
}

// mcpTransportStream names the RPC a tool stands for, so that
// authz.MethodFromContext finds it as it would on the gRPC server.
type mcpTransportStream struct{ method string }

func (s mcpTransportStream) Method() string             { return s.method }
func (mcpTransportStream) SetHeader(metadata.MD) error  { return nil }
func (mcpTransportStream) SendHeader(metadata.MD) error { return nil }
func (mcpTransportStream) SetTrailer(metadata.MD) error { return nil }

func rpcContext(ctx context.Context, fullMethod string) context.Context {
	return grpc.NewContextWithServerTransportStream(ctx, mcpTransportStream{method: fullMethod})
}

// parseEnum maps the name of an enum value, as written in the protos, to its
// number. An empty name leaves the filter unset.
func parseEnum(name string, values map[string]int32, field string, set func(int32)) error {
	if name == "" {
		return nil
	}
	v, ok := values[name]
	if !ok || v == 0 {
		return fmt.Errorf("unknown %s %q", field, name)
	}
	set(v)
	return nil
}

// bounds returns the page size and number asked for, defaulted and capped.
func (p mcpPage) bounds() (perPage, page int) {
	perPage = p.PerPage
	if perPage <= 0 {
		perPage = mcpDefaultPerPage
	}
	if perPage > mcpMaxPerPage {
		perPage = mcpMaxPerPage
	}
	return perPage, max(p.Page, 1)
}

func paginate[T any](items []T, p mcpPage) ([]T, uint32) {
	perPage, page := p.bounds()
	total := uint32(len(items)) // #nosec G115 -- a list never holds 2^32 items
	start := (page - 1) * perPage
	if start >= len(items) {
		return []T{}, total
	}
	end := min(start+perPage, len(items))
	return items[start:end], total
}

// eventPage sorts events newest first and returns the requested page.
func eventPage(events []*eventv1.Event, p mcpPage) (*mcp.CallToolResult, any, error) {
	sort.SliceStable(events, func(i, j int) bool {
		return events[i].GetMetadata().GetCreatedAt().AsTime().After(events[j].GetMetadata().GetCreatedAt().AsTime())
	})
	page, total := paginate(events, p)
	return protoResult(&eventv1.ListEventsResponse{Events: page, TotalCount: total})
}

// protoResult renders a response as the REST API would: camelCase fields and
// enum names.
func protoResult(m proto.Message) (*mcp.CallToolResult, any, error) {
	b, err := protojson.Marshal(m)
	if err != nil {
		return nil, nil, err
	}
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: strings.TrimSpace(string(b))}}}, nil, nil
}
