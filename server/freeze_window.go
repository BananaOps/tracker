package server

import (
	"context"
	"fmt"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/freeze/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
)

type FreezeWindow struct {
	v1alpha1.UnimplementedFreezeWindowServiceServer
	store store.FreezeWindowStoreClient
}

func NewFreezeWindow() *FreezeWindow {
	return &FreezeWindow{
		UnimplementedFreezeWindowServiceServer: v1alpha1.UnimplementedFreezeWindowServiceServer{},
		store:                                 *store.NewStoreFreezeWindow(config.ConfigDatabase.FreezeCollection),
	}
}

func (f *FreezeWindow) CreateFreezeWindow(
	ctx context.Context,
	i *v1alpha1.CreateFreezeWindowRequest,
) (*v1alpha1.CreateFreezeWindowResponse, error) {
	freeze := &v1alpha1.FreezeWindow{
		Title:       i.Title,
		Description: i.Description,
		Type:        i.Type,
		ScopeType:   i.ScopeType,
		ScopeIds:    i.ScopeIds,
		StartsAt:    i.StartsAt,
		EndsAt:      i.EndsAt,
		Timezone:    i.Timezone,
		CreatedBy:   i.CreatedBy,
		Active:      i.Active,
	}

	result, err := f.store.Create(ctx, freeze)
	if err != nil {
		return nil, err
	}

	return &v1alpha1.CreateFreezeWindowResponse{FreezeWindow: result}, nil
}

func (f *FreezeWindow) GetFreezeWindow(
	ctx context.Context,
	i *v1alpha1.GetFreezeWindowRequest,
) (*v1alpha1.GetFreezeWindowResponse, error) {
	result, err := f.store.Get(ctx, map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no freeze window found for id %s", i.Id)
	}
	return &v1alpha1.GetFreezeWindowResponse{FreezeWindow: result}, nil
}

func (f *FreezeWindow) UpdateFreezeWindow(
	ctx context.Context,
	i *v1alpha1.UpdateFreezeWindowRequest,
) (*v1alpha1.UpdateFreezeWindowResponse, error) {
	existing, err := f.store.Get(ctx, map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("no freeze window found for id %s", i.Id)
	}

	existing.Title = i.Title
	existing.Description = i.Description
	existing.Type = i.Type
	existing.ScopeType = i.ScopeType
	existing.ScopeIds = i.ScopeIds
	existing.StartsAt = i.StartsAt
	existing.EndsAt = i.EndsAt
	existing.Timezone = i.Timezone
	existing.CreatedBy = i.CreatedBy
	existing.Active = i.Active

	updated, err := f.store.Update(ctx, map[string]interface{}{"id": i.Id}, existing)
	if err != nil {
		return nil, fmt.Errorf("failed to update freeze window %s: %w", i.Id, err)
	}

	return &v1alpha1.UpdateFreezeWindowResponse{FreezeWindow: updated}, nil
}

func (f *FreezeWindow) DeleteFreezeWindow(
	ctx context.Context,
	i *v1alpha1.DeleteFreezeWindowRequest,
) (*v1alpha1.DeleteFreezeWindowResponse, error) {
	count, err := f.store.Delete(ctx, map[string]interface{}{"id": i.Id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete freeze window %s: %w", i.Id, err)
	}

	return &v1alpha1.DeleteFreezeWindowResponse{
		Message: "freeze window deleted",
		Id:      i.Id,
		Count:   count,
	}, nil
}

func (f *FreezeWindow) ListFreezeWindows(
	ctx context.Context,
	i *v1alpha1.ListFreezeWindowsRequest,
) (*v1alpha1.ListFreezeWindowsResponse, error) {
	windows, err := f.store.List(ctx)
	if err != nil {
		return nil, err
	}

	return &v1alpha1.ListFreezeWindowsResponse{
		FreezeWindows: windows,
		TotalCount:    uint32(len(windows)),
	}, nil
}
