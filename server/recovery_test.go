package server

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestRecoverUnaryTurnsAPanicIntoAnInternalError(t *testing.T) {
	info := &grpc.UnaryServerInfo{FullMethod: "/tracker.event.v1alpha1.EventService/CreateEvent"}
	resp, err := RecoverUnary()(context.Background(), nil, info, func(context.Context, any) (any, error) {
		var p *struct{ field string }
		return p.field, nil // nil dereference
	})
	assert.Nil(t, resp)
	assert.Equal(t, codes.Internal, status.Code(err))
}

func TestRecoverUnaryPassesThroughResults(t *testing.T) {
	info := &grpc.UnaryServerInfo{FullMethod: "/m"}
	resp, err := RecoverUnary()(context.Background(), nil, info, func(context.Context, any) (any, error) {
		return "ok", status.Error(codes.NotFound, "nope")
	})
	assert.Equal(t, "ok", resp)
	assert.Equal(t, codes.NotFound, status.Code(err))
}

func TestRecoverStreamTurnsAPanicIntoAnInternalError(t *testing.T) {
	info := &grpc.StreamServerInfo{FullMethod: "/m"}
	err := RecoverStream()(nil, nil, info, func(any, grpc.ServerStream) error { panic("boom") })
	assert.Equal(t, codes.Internal, status.Code(err))
}
