package authz

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const listEvents = "/tracker.event.v1alpha1.EventService/ListEvents"

const getAuthConfig = "/tracker.auth.v1alpha1.AuthService/GetAuthConfig"

// fakeTransportStream is a minimal grpc.ServerTransportStream, as used by a
// real gRPC server for a direct (non-gateway) call.
type fakeTransportStream struct{ method string }

func (s fakeTransportStream) Method() string             { return s.method }
func (fakeTransportStream) SetHeader(metadata.MD) error  { return nil }
func (fakeTransportStream) SendHeader(metadata.MD) error { return nil }
func (fakeTransportStream) SetTrailer(metadata.MD) error { return nil }

// TestMethodFromContextThroughGRPC covers a direct gRPC call: the real
// transport stream reports the real method name.
func TestMethodFromContextThroughGRPC(t *testing.T) {
	ctx := grpc.NewContextWithServerTransportStream(context.Background(), fakeTransportStream{method: listEvents})
	assert.Equal(t, listEvents, MethodFromContext(ctx))
}

// TestMethodFromContextThroughGateway mirrors exactly what the generated
// *.pb.gw.go code does in HandlerServer mode (see for example
// RegisterAuthServiceHandlerServer in generated/proto/auth/v1alpha1/auth.pb.gw.go):
// it injects a dummy runtime.ServerTransportStream purely to let
// grpc.SendHeader/SetTrailer work outside of a real gRPC server, then
// annotates the context with the real RPC method name via
// runtime.AnnotateIncomingContext. runtime.ServerTransportStream.Method()
// always returns "", so grpc.Method(ctx) must not be trusted just because it
// reports ok=true.
func TestMethodFromContextThroughGateway(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1alpha1/auth/config", nil)
	ctx := grpc.NewContextWithServerTransportStream(context.Background(), &runtime.ServerTransportStream{})
	mux := runtime.NewServeMux()
	annotated, err := runtime.AnnotateIncomingContext(ctx, mux, req, getAuthConfig, runtime.WithHTTPPathPattern("/api/v1alpha1/auth/config"))
	require.NoError(t, err)

	assert.Equal(t, getAuthConfig, MethodFromContext(annotated))

	err = Authorize(auth.WithPrincipal(annotated, auth.Anonymous(nil)))
	assert.NoError(t, err, "GetAuthConfig is public")
}

func TestCheck(t *testing.T) {
	anon := auth.Anonymous(nil)
	reader := auth.Principal{Kind: auth.KindUser, Username: "r", Permissions: auth.NewPermissionSet(auth.PermEventRead)}

	assert.Equal(t, codes.Unauthenticated, status.Code(Check(anon, listEvents)))
	assert.NoError(t, Check(reader, listEvents))
	assert.Equal(t, codes.PermissionDenied, status.Code(Check(reader, "/tracker.event.v1alpha1.EventService/CreateEvent")))
	assert.Equal(t, codes.PermissionDenied, status.Code(Check(reader, "/tracker.nope.v1/Svc/Method")), "unmapped method is denied")

	anonReader := auth.Anonymous([]auth.Permission{auth.PermEventRead})
	assert.NoError(t, Check(anonReader, listEvents))

	assert.NoError(t, Check(anon, "/tracker.auth.v1alpha1.AuthService/GetAuthConfig"), "public")
	assert.NoError(t, Check(anon, "/tracker.auth.v1alpha1.AuthService/Me"), "public")
	assert.Equal(t, codes.Unauthenticated, status.Code(Check(anon, "/tracker.auth.v1alpha1.AuthService/ListUsers")))
	assert.Equal(t, codes.PermissionDenied, status.Code(Check(reader, "/tracker.auth.v1alpha1.AuthService/ListUsers")))
}

func TestAuthorizeWithoutPrincipalIsAnonymous(t *testing.T) {
	err := Authorize(context.Background())
	assert.Equal(t, codes.PermissionDenied, status.Code(err), "no method in context: unmapped, denied")
}

func TestRequireHTTP(t *testing.T) {
	called := false
	h := RequireHTTP(auth.PermLinksWrite, func(w http.ResponseWriter, r *http.Request, _ map[string]string) { called = true })

	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/api/links", nil), nil)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.False(t, called)

	ctx := auth.WithPrincipal(context.Background(), auth.Principal{Kind: auth.KindUser, Permissions: auth.NewPermissionSet(auth.PermLinksRead)})
	rec = httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/api/links", nil).WithContext(ctx), nil)
	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.False(t, called)

	ctx = auth.WithPrincipal(context.Background(), auth.Principal{Kind: auth.KindUser, Permissions: auth.NewPermissionSet(auth.PermLinksWrite)})
	rec = httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/api/links", nil).WithContext(ctx), nil)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.True(t, called)
}
