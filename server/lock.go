package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/emptypb"
)

type Lock struct {
	v1alpha1.UnimplementedLockServiceServer
	store  store.LockStoreClient
	logger *slog.Logger
}

func NewLock() *Lock {
	return &Lock{
		UnimplementedLockServiceServer: v1alpha1.UnimplementedLockServiceServer{},
		store:                          *store.NewStoreLock(config.ConfigDatabase.LockCollection),
		logger:                         slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Lock) CreateLock(
	ctx context.Context,
	i *v1alpha1.CreateLockRequest,
) (*v1alpha1.CreateLockResponse, error) {

	var lock = &v1alpha1.Lock{
		Service: i.Service,
		Who:     i.Who,
	}

	var lockResult = &v1alpha1.CreateLockResponse{}
	var lockPresent = &v1alpha1.Lock{}
	var err error

	lockPresent, _ = e.store.Get(context.Background(), map[string]interface{}{"service": i.Service})
	//if err != fmt.Errorf("mongo: no documents in result") {
	//	return nil, err
	//}

	// check if lock is already present for service
	if len(lockPresent.Service) != 0 {
		e.logger.Error("service locking",
			"service", lockPresent.Service,
			"who", lockPresent.Who,
			"id", lockPresent.Id,
			"created_at", lockPresent.CreatedAt.AsTime(),
		)
		return nil, fmt.Errorf("service %s is already lock id %s", lockPresent.Service, lockPresent.Id)
	}

	lockResult.Lock, err = e.store.Create(context.Background(), lock)
	if err != nil {
		return nil, err
	}

	// log lock created to json format
	e.logger.Info("lock created",
		"service", lockResult.Lock.Service,
		"who", lockResult.Lock.Who,
		"id", lockResult.Lock.Id,
		"created_at", lockResult.Lock.CreatedAt.AsTime(),
	)

	return lockResult, nil
}

func (e *Lock) GetLock(
	ctx context.Context,
	i *v1alpha1.GetLockRequest,
) (*v1alpha1.GetLockResponse, error) {

	var lockResult = &v1alpha1.GetLockResponse{}
	var err error

	lockResult.Lock, err = e.store.Get(context.Background(), map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
	}
	return lockResult, nil
}

func (e *Lock) UnLock(
	ctx context.Context,
	i *v1alpha1.UnLockRequest,
) (*emptypb.Empty, error) {

	var lockResult = &v1alpha1.GetLockResponse{}
	var err error

	lockResult.Lock, err = e.store.Get(context.Background(), map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
	}

	_, err = e.store.Unlock(context.Background(), map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("error to unlock id %s", i.Id)
	}

	// log lock delete to json format
	e.logger.Info("lock delete",
		"service", lockResult.Lock.Service,
		"who", lockResult.Lock.Who,
		"id", lockResult.Lock.Id,
	)

	return &emptypb.Empty{}, nil
}

func (e *Lock) ListLocks(
	ctx context.Context,
	i *v1alpha1.ListLocksRequest,
) (*v1alpha1.ListLocksResponse, error) {

	var LocksResult = &v1alpha1.ListLocksResponse{}
	var err error

	LocksResult.Locks, err = e.store.List(context.Background())
	if err != nil {
		return nil, err
	}
	LocksResult.TotalCount = uint32(len(LocksResult.Locks))

	return LocksResult, nil
}
