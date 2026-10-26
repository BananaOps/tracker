package authz

import (
	"context"
	"log/slog"

	"github.com/bananaops/tracker/internal/auth"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ResultScopeDenied is the result label of tracker_auth_requests_total for a
// request refused because its target service is outside the caller's scope.
const ResultScopeDenied = "scope_denied"

// ScopeFromContext returns the service scope of the current principal. A
// context without principal gets an empty restricted scope: it sees nothing.
func ScopeFromContext(ctx context.Context) auth.Scope {
	p, ok := auth.FromContext(ctx)
	if !ok {
		return auth.ScopeOf()
	}
	return p.Scope
}

// RequireService refuses the request unless every given service is inside
// the scope of the current principal. Call it right after Authorize, with
// the service of the target object, and for an update with both the stored
// and the new service. An empty service is only allowed with an unrestricted
// scope. Service names are compared exactly, case included.
func RequireService(ctx context.Context, services ...string) error {
	p, ok := auth.FromContext(ctx)
	if !ok {
		p = auth.Principal{Kind: auth.KindAnonymous, Username: "anonymous", Scope: auth.ScopeOf()}
	}
	if len(services) == 0 {
		return denyScope(ctx, p, "")
	}
	for _, service := range services {
		if !p.Scope.Allows(service) {
			return denyScope(ctx, p, service)
		}
	}
	return nil
}

func denyScope(ctx context.Context, p auth.Principal, service string) error {
	authRequests.WithLabelValues(string(p.Kind), ResultScopeDenied).Inc()
	slog.Warn("authz denied", "method", MethodFromContext(ctx), "principal", p.Username, "kind", p.Kind, "reason", "service outside scope", "service", service)
	if service == "" {
		return status.Error(codes.PermissionDenied, "objects without a service require an unrestricted scope")
	}
	return status.Errorf(codes.PermissionDenied, "service %q is outside your scope", service)
}
