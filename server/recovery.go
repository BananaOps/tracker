package server

import (
	"context"
	"log/slog"
	"runtime/debug"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// RecoverUnary turns a panic in a unary gRPC handler into an Internal error.
// grpc-go does not recover handler panics: without it a single malformed
// request stops the whole process. The HTTP gateway is covered by net/http,
// which recovers per connection.
func RecoverUnary() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				err = recovered(info.FullMethod, r)
			}
		}()
		return handler(ctx, req)
	}
}

// RecoverStream is the streaming counterpart of RecoverUnary.
func RecoverStream() grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) (err error) {
		defer func() {
			if r := recover(); r != nil {
				err = recovered(info.FullMethod, r)
			}
		}()
		return handler(srv, ss)
	}
}

func recovered(method string, r any) error {
	slog.Error("panic in gRPC handler", "method", method, "panic", r, "stack", string(debug.Stack()))
	return status.Error(codes.Internal, "internal error")
}
