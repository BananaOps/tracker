// Package authz decides whether a principal may call a method. It is the only
// place where permissions are checked, whatever the transport.
package authz

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var authRequests = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "tracker_auth_requests_total",
		Help: "Authorization decisions by principal kind and result",
	},
	[]string{"principal", "result"},
)

// AuthLogins counts login attempts. The method label names the authentication
// method (local for now, oidc once it lands) and the result label is one of
// LoginSuccess, LoginFailure or LoginRateLimited. Malformed bodies, cross-site
// refusals and internal errors are not login attempts and are not counted.
// It is exported so the login handler, which lives in the server package, can
// increment it and tests can read it back.
var AuthLogins = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "tracker_auth_logins_total",
		Help: "Login attempts by authentication method and result",
	},
	[]string{"method", "result"},
)

// Values of the AuthLogins labels.
const (
	LoginMethodLocal = "local"
	LoginSuccess     = "success"
	LoginFailure     = "failure"
	LoginRateLimited = "rate_limited"
)

func init() {
	prometheus.MustRegister(authRequests, AuthLogins)
}

// MethodFromContext returns the full RPC method name, on gRPC or through the
// gateway. runtime.RPCMethod is tried first: the generated *.pb.gw.go code
// (HandlerServer mode) injects a dummy runtime.ServerTransportStream into the
// context purely to let grpc.SendHeader/SetTrailer work outside of a real
// gRPC server, and that stream's Method() always returns "". Since
// grpc.Method(ctx) reports ok=true as soon as any transport stream is
// present, checking it first would silently treat every gateway request as
// having no method, denying it as unauthorized. grpc.Method is used only as
// a fallback, and only when it actually returns a non-empty name.
func MethodFromContext(ctx context.Context) string {
	if m, ok := runtime.RPCMethod(ctx); ok {
		return m
	}
	if m, ok := grpc.Method(ctx); ok && m != "" {
		return m
	}
	return ""
}

// Authorize checks the current principal against the current RPC method.
// Call it as the first statement of every service method.
func Authorize(ctx context.Context) error {
	p, ok := auth.FromContext(ctx)
	if !ok {
		p = auth.Anonymous(nil)
	}
	method := MethodFromContext(ctx)
	err := Check(p, method)
	observe(p, method, err)
	return err
}

// Check is the pure decision for a principal and a method.
func Check(p auth.Principal, method string) error {
	perm, ok := MethodPermissions[method]
	if !ok {
		slog.Error("authz: method not in permission table, denying", "method", method)
		return status.Error(codes.PermissionDenied, "method not authorized")
	}
	return CheckPermission(p, perm)
}

// CheckPermission is the pure decision for a principal and a permission.
func CheckPermission(p auth.Principal, perm auth.Permission) error {
	switch perm {
	case auth.PermPublic:
		return nil
	case auth.PermAuthenticated:
		if p.IsAuthenticated() {
			return nil
		}
		return status.Error(codes.Unauthenticated, "authentication required")
	}
	if p.Has(perm) {
		return nil
	}
	if !p.IsAuthenticated() {
		return status.Error(codes.Unauthenticated, "authentication required")
	}
	return status.Errorf(codes.PermissionDenied, "permission %s required", perm)
}

// RequireHTTP guards a grpc-gateway custom handler with a permission.
func RequireHTTP(perm auth.Permission, next runtime.HandlerFunc) runtime.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request, params map[string]string) {
		p, ok := auth.FromContext(r.Context())
		if !ok {
			p = auth.Anonymous(nil)
		}
		err := CheckPermission(p, perm)
		observe(p, r.Method+" "+r.URL.Path, err)
		if err != nil {
			code := http.StatusForbidden
			if status.Code(err) == codes.Unauthenticated {
				code = http.StatusUnauthorized
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(code)
			_, _ = w.Write([]byte(`{"error":"` + status.Convert(err).Message() + `"}`))
			return
		}
		next(w, r, params)
	}
}

func observe(p auth.Principal, method string, err error) {
	result := "allowed"
	if err != nil {
		result = "denied"
		if status.Code(err) == codes.Unauthenticated {
			result = "unauthenticated"
		}
		slog.Warn("authz denied", "method", method, "principal", p.Username, "kind", p.Kind, "reason", status.Convert(err).Message())
	}
	authRequests.WithLabelValues(string(p.Kind), result).Inc()
}
