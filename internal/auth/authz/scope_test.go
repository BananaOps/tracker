package authz

import (
	"context"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func scopeTestContext() context.Context {
	return grpc.NewContextWithServerTransportStream(context.Background(), fakeTransportStream{method: listEvents})
}

func withScope(scope auth.Scope) context.Context {
	return auth.WithPrincipal(scopeTestContext(), auth.Principal{Kind: auth.KindUser, Username: "alice", Scope: scope})
}

func TestScopeFromContext(t *testing.T) {
	empty := ScopeFromContext(scopeTestContext())
	assert.False(t, empty.All)
	assert.Empty(t, empty.ServiceList())

	anon := ScopeFromContext(auth.WithPrincipal(scopeTestContext(), auth.Anonymous(nil)))
	assert.True(t, anon.All)

	scoped := ScopeFromContext(withScope(auth.ScopeOf("svc-a")))
	assert.True(t, scoped.Allows("svc-a"))
	assert.False(t, scoped.Allows("svc-b"))
}

func TestRequireService(t *testing.T) {
	tests := []struct {
		name     string
		ctx      context.Context
		services []string
		denied   bool
		contains string
	}{
		{"all, service", withScope(auth.ScopeAll()), []string{"svc-a"}, false, ""},
		{"all, empty service", withScope(auth.ScopeAll()), []string{""}, false, ""},
		{"scoped, inside", withScope(auth.ScopeOf("svc-a")), []string{"svc-a"}, false, ""},
		{"scoped, outside", withScope(auth.ScopeOf("svc-a")), []string{"svc-b"}, true, "svc-b"},
		{"scoped, empty service", withScope(auth.ScopeOf("svc-a")), []string{""}, true, ""},
		{"scoped, case sensitive", withScope(auth.ScopeOf("svc-a")), []string{"SVC-A"}, true, "SVC-A"},
		{"scoped, one of two outside", withScope(auth.ScopeOf("svc-a")), []string{"svc-a", "svc-b"}, true, "svc-b"},
		{"scoped, both inside", withScope(auth.ScopeOf("svc-a", "svc-b")), []string{"svc-a", "svc-b"}, false, ""},
		{"empty scope", withScope(auth.ScopeOf()), []string{"svc-a"}, true, "svc-a"},
		{"no principal", scopeTestContext(), []string{"svc-a"}, true, "svc-a"},
		{"all, no argument", withScope(auth.ScopeAll()), nil, true, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := RequireService(tt.ctx, tt.services...)
			if !tt.denied {
				assert.NoError(t, err)
				return
			}
			assert.Equal(t, codes.PermissionDenied, status.Code(err))
			assert.Contains(t, err.Error(), tt.contains)
		})
	}
}

func TestRequireServiceCountsScopeDenials(t *testing.T) {
	denied := func() float64 {
		return testutil.ToFloat64(authRequests.WithLabelValues("user", ResultScopeDenied))
	}
	allowed := func() float64 {
		return testutil.ToFloat64(authRequests.WithLabelValues("user", "allowed"))
	}
	ctx := withScope(auth.ScopeOf("svc-a"))

	before, beforeAllowed := denied(), allowed()
	assert.Error(t, RequireService(ctx, "svc-b"))
	assert.Equal(t, before+1, denied())

	assert.NoError(t, RequireService(ctx, "svc-a"))
	assert.Equal(t, before+1, denied())
	assert.Equal(t, beforeAllowed, allowed())
}
