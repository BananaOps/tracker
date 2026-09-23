package server

import (
	"context"
	"reflect"
	"testing"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Every RPC of the three existing services must refuse an anonymous caller
// without permissions before touching the database. The services are built
// with nil stores on purpose: reaching the store would panic.
func TestExistingServicesAreGuarded(t *testing.T) {
	services := []struct {
		name string
		impl any
		desc grpc.ServiceDesc
	}{
		{"EventService", &Event{}, eventv1.EventService_ServiceDesc},
		{"CatalogService", &Catalog{}, catalogv1.CatalogService_ServiceDesc},
		{"LockService", &Lock{}, lockv1.LockService_ServiceDesc},
	}
	for _, svc := range services {
		v := reflect.ValueOf(svc.impl)
		for _, m := range svc.desc.Methods {
			method := v.MethodByName(m.MethodName)
			if !method.IsValid() {
				t.Errorf("%s.%s not implemented", svc.name, m.MethodName)
				continue
			}
			full := "/" + svc.desc.ServiceName + "/" + m.MethodName
			ctx := grpc.NewContextWithServerTransportStream(context.Background(), fakeTransportStream{method: full})
			ctx = auth.WithPrincipal(ctx, auth.Anonymous(nil))
			req := reflect.New(method.Type().In(1).Elem())
			out := method.Call([]reflect.Value{reflect.ValueOf(ctx), req})
			err, _ := out[1].Interface().(error)
			assert.Equal(t, codes.Unauthenticated, status.Code(err), "%s.%s must call authz.Authorize first", svc.name, m.MethodName)
		}
	}
}
