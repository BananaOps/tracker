package server

import (
	"context"
	"log/slog"
	"os"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	store "github.com/bananaops/tracker/internal/stores"
)

type Lock struct {
	v1alpha1.UnimplementedLockServiceServer
	store  store.MongoClient
	logger *slog.Logger
}

func NewLock() *Lock {
	return &Lock{
		UnimplementedLockServiceServer: v1alpha1.UnimplementedLockServiceServer{},
		store:                          store.NewClient(),
		logger:                         slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Lock) CreateLock(
	ctx context.Context,
	i *v1alpha1.CreateLockRequest,
) (*v1alpha1.CreateLockResponse, error) {

	var LockResult = &v1alpha1.CreateLockResponse{}

	return LockResult, nil
}

func (e *Lock) GetLock(
	ctx context.Context,
	i *v1alpha1.GetLockRequest,
) (*v1alpha1.GetLockResponse, error) {

	var LockResult = &v1alpha1.GetLockResponse{}

	return LockResult, nil
}

func (e *Lock) UnLock(
	ctx context.Context,
	i *v1alpha1.UnLockRequest,
) (*v1alpha1.UnLockResponse, error) {

	var LocksResult = &v1alpha1.UnLockResponse{}

	return LocksResult, nil
}

func (e *Lock) ListLocks(
	ctx context.Context,
	i *v1alpha1.ListLocksRequest,
) (*v1alpha1.ListLocksResponse, error) {

	var LocksResult = &v1alpha1.ListLocksResponse{}

	return LocksResult, nil
}
