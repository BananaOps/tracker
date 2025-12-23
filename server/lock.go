package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	eventv1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	v1alpha1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Lock struct {
	v1alpha1.UnimplementedLockServiceServer
	store      store.LockStoreClient
	eventStore *store.EventStoreClient
	logger     *slog.Logger
}

func NewLock() *Lock {
	return &Lock{
		UnimplementedLockServiceServer: v1alpha1.UnimplementedLockServiceServer{},
		store:                          *store.NewStoreLock(config.ConfigDatabase.LockCollection),
		eventStore:                     store.NewStoreEvent(config.ConfigDatabase.EventCollection),
		logger:                         slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Lock) CreateLock(
	ctx context.Context,
	i *v1alpha1.CreateLockRequest,
) (*v1alpha1.CreateLockResponse, error) {

	var lock = &v1alpha1.Lock{
		Service:     i.Service,
		Who:         i.Who,
		Environment: i.Environment,
		Resource:    i.Resource,
		EventId:     i.EventId,
	}

	var lockResult = &v1alpha1.CreateLockResponse{}
	var err error

	// Check if lock is already present for service + environment + resource
	filter := map[string]interface{}{
		"service":     i.Service,
		"environment": i.Environment,
		"resource":    i.Resource,
	}

	lockPresent, _ := e.store.Get(context.Background(), filter)

	// check if lock is already present
	if len(lockPresent.Service) != 0 {
		e.logger.Error("service locking",
			"service", lockPresent.Service,
			"environment", lockPresent.Environment,
			"resource", lockPresent.Resource,
			"who", lockPresent.Who,
			"id", lockPresent.Id,
			"event_id", lockPresent.EventId,
			"created_at", lockPresent.CreatedAt.AsTime(),
		)
		return nil, fmt.Errorf("service %s is already locked for %s in %s by %s (lock_id: %s, event_id: %s)",
			lockPresent.Service, lockPresent.Resource, lockPresent.Environment,
			lockPresent.Who, lockPresent.Id, lockPresent.EventId)
	}

	lockResult.Lock, err = e.store.Create(context.Background(), lock)
	if err != nil {
		return nil, err
	}

	// Si un event_id est fourni, ajouter une entrée dans le changelog de l'événement
	if lockResult.Lock.EventId != "" {
		event, err := e.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": lockResult.Lock.EventId})
		if err == nil {
			// Ajouter l'entrée "locked" dans le changelog
			entry := &eventv1alpha1.ChangelogEntry{
				Timestamp:  timestamppb.Now(),
				User:       lockResult.Lock.Who,
				ChangeType: eventv1alpha1.ChangeType_locked,
				Comment:    fmt.Sprintf("Service locked in %s", lockResult.Lock.Environment),
			}

			if event.Changelog == nil {
				event.Changelog = []*eventv1alpha1.ChangelogEntry{}
			}
			event.Changelog = append(event.Changelog, entry)

			// Mettre à jour l'événement
			_, err = e.eventStore.Update(context.Background(), map[string]interface{}{"metadata.id": lockResult.Lock.EventId}, event)
			if err != nil {
				e.logger.Warn("failed to update event changelog for lock", "error", err, "event_id", lockResult.Lock.EventId)
			}
		}
	}

	// log lock created to json format
	e.logger.Info("lock created",
		"service", lockResult.Lock.Service,
		"environment", lockResult.Lock.Environment,
		"resource", lockResult.Lock.Resource,
		"who", lockResult.Lock.Who,
		"id", lockResult.Lock.Id,
		"event_id", lockResult.Lock.EventId,
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

func (e *Lock) UpdateLock(
	ctx context.Context,
	i *v1alpha1.UpdateLockRequest,
) (*v1alpha1.UpdateLockResponse, error) {

	// Retrieve existing lock by id
	existing, err := e.store.Get(ctx, map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no lock found in tracker for id %s", i.Id)
	}

	// Update fields only if provided (non-empty)
	if i.Service != "" {
		existing.Service = i.Service
	}
	if i.Who != "" {
		existing.Who = i.Who
	}
	if i.Environment != "" {
		existing.Environment = i.Environment
	}
	if i.Resource != "" {
		existing.Resource = i.Resource
	}
	if i.EventId != "" {
		existing.EventId = i.EventId
	}

	// Persist update
	updated, err := e.store.Update(ctx, map[string]interface{}{"id": i.Id}, existing)
	if err != nil {
		return nil, fmt.Errorf("failed to update lock %s: %w", i.Id, err)
	}

	e.logger.Info("lock updated",
		"id", updated.Id,
		"service", updated.Service,
		"environment", updated.Environment,
		"resource", updated.Resource,
		"who", updated.Who,
		"event_id", updated.EventId,
	)

	return &v1alpha1.UpdateLockResponse{Lock: updated}, nil
}

func (e *Lock) UnLock(
	ctx context.Context,
	i *v1alpha1.UnLockRequest,
) (*v1alpha1.UnLockResponse, error) {

	var lockResult = &v1alpha1.GetLockResponse{}
	var err error

	lockResult.Lock, err = e.store.Get(context.Background(), map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no event found in tracker for id %s", i.Id)
	}

	// Si un event_id est fourni, ajouter une entrée dans le changelog de l'événement
	if lockResult.Lock.EventId != "" {
		event, err := e.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": lockResult.Lock.EventId})
		if err == nil {
			// Ajouter l'entrée "unlocked" dans le changelog
			entry := &eventv1alpha1.ChangelogEntry{
				Timestamp:  timestamppb.Now(),
				User:       lockResult.Lock.Who,
				ChangeType: eventv1alpha1.ChangeType_unlocked,
				Comment:    fmt.Sprintf("Service unlocked in %s", lockResult.Lock.Environment),
			}

			if event.Changelog == nil {
				event.Changelog = []*eventv1alpha1.ChangelogEntry{}
			}
			event.Changelog = append(event.Changelog, entry)

			// Mettre à jour l'événement
			_, err = e.eventStore.Update(context.Background(), map[string]interface{}{"metadata.id": lockResult.Lock.EventId}, event)
			if err != nil {
				e.logger.Warn("failed to update event changelog for unlock", "error", err, "event_id", lockResult.Lock.EventId)
			}
		}
	}

	var countUnLock int64

	countUnLock, err = e.store.Unlock(context.Background(), map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("error to unlock id %s", i.Id)
	}

	// log lock delete to json format
	e.logger.Info("lock deleted",
		"service", lockResult.Lock.Service,
		"who", lockResult.Lock.Who,
		"id", lockResult.Lock.Id,
	)

	var UnLockResult = &v1alpha1.UnLockResponse{
		Message: "lock deleted",
		Id:      i.Id,
		Count:   countUnLock,
	}

	return UnLockResult, nil
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

// UnlockByEventId libère un lock associé à un event_id
func (e *Lock) UnlockByEventId(ctx context.Context, eventId string) error {
	if eventId == "" {
		return nil // Pas de lock à libérer
	}

	lock, err := e.store.Get(ctx, map[string]interface{}{"event_id": eventId})
	if err != nil {
		// Lock n'existe pas, ce n'est pas une erreur
		return nil
	}

	if lock.Id == "" {
		return nil // Pas de lock trouvé
	}

	_, err = e.store.Unlock(ctx, map[string]interface{}{"id": lock.Id})
	if err != nil {
		e.logger.Error("failed to unlock by event_id",
			"event_id", eventId,
			"lock_id", lock.Id,
			"error", err,
		)
		return err
	}

	e.logger.Info("lock released by event_id",
		"event_id", eventId,
		"lock_id", lock.Id,
		"service", lock.Service,
		"environment", lock.Environment,
		"resource", lock.Resource,
	)

	return nil
}
