package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Catalog struct {
	v1alpha1.UnimplementedCatalogServiceServer
	store  *store.CatalogStoreClient
	logger *slog.Logger
}

func NewCatalog() *Catalog {
	return &Catalog{
		UnimplementedCatalogServiceServer: v1alpha1.UnimplementedCatalogServiceServer{},
		store:                             store.NewStoreCatalog(config.ConfigDatabase.CatalogCollection),
		logger:                            slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Catalog) CreateUpdateCatalog(
	ctx context.Context,
	i *v1alpha1.CreateUpdateCatalogRequest,
) (*v1alpha1.CreateUpdateCatalogResponse, error) {

	// Validation des champs requis
	if i.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if i.Owner == "" {
		return nil, fmt.Errorf("owner is required")
	}
	if i.Version == "" {
		return nil, fmt.Errorf("version is required")
	}

	// Get existing catalog to preserve version fields if they exist
	existingCatalog, _ := e.store.Get(ctx, map[string]interface{}{"name": i.Name})

	var catalog = &v1alpha1.Catalog{
		Name:                  i.Name,
		Type:                  i.Type,
		Languages:             i.Languages,
		Owner:                 i.Owner,
		Version:               i.Version,
		Link:                  i.Link,
		Description:           i.Description,
		Repository:            i.Repository,
		DependenciesIn:        i.DependenciesIn,
		DependenciesOut:       i.DependenciesOut,
		Sla:                   i.Sla,
		Platform:              i.Platform,
		UsedDeliverables:      i.UsedDeliverables,
		CommunicationChannels: i.CommunicationChannels,
		DashboardLinks:        i.DashboardLinks,
		VulnerabilitySummary:  i.VulnerabilitySummary,
	}

	// Preserve existing version fields if updating
	if existingCatalog != nil {
		catalog.AvailableVersions = existingCatalog.AvailableVersions
		catalog.LatestVersion = existingCatalog.LatestVersion
		catalog.ReferenceVersion = existingCatalog.ReferenceVersion
	}

	catalog.UpdatedAt = timestamppb.Now()

	var catalogResult = &v1alpha1.CreateUpdateCatalogResponse{}
	var err error
	var logMessage = "catalog updated"

	// check entry exist in catalog colection
	_, err = e.store.Get(ctx, map[string]interface{}{"name": i.Name})
	if err != nil {
		catalog.CreatedAt = timestamppb.Now()
		logMessage = "catalog created"
		e.logger.Info("catalog not found, creating new one", "name", i.Name)
	}

	catalogResult.Catalog, err = e.store.Update(ctx, map[string]interface{}{"name": i.Name}, catalog)
	if err != nil {
		e.logger.Error("failed to update catalog", "error", err, "name", i.Name)
		return nil, fmt.Errorf("failed to update catalog %s: %w", i.Name, err)
	}

	// log catalog to json format
	e.logger.Info(logMessage,
		"name", catalogResult.Catalog.Name,
		"type", catalogResult.Catalog.Type.String(),
		"languages", catalogResult.Catalog.Languages.String(),
		"owner", catalogResult.Catalog.Owner,
		"version", catalogResult.Catalog.Version,
		"link", catalogResult.Catalog.Link,
		"description", catalogResult.Catalog.Description,
		"repository", catalogResult.Catalog.Repository,
		"dependencies_in", catalogResult.Catalog.DependenciesIn,
		"dependencies_out", catalogResult.Catalog.DependenciesOut,
		"sla", catalogResult.Catalog.Sla,
		"platform", catalogResult.Catalog.Platform.String(),
		"created_at", catalogResult.Catalog.CreatedAt.AsTime(),
		"updated_at", catalogResult.Catalog.UpdatedAt.AsTime(),
	)

	return catalogResult, nil
}

func (e *Catalog) GetCatalog(
	ctx context.Context,
	i *v1alpha1.GetCatalogRequest,
) (*v1alpha1.GetCatalogResponse, error) {

	var catalogResult = &v1alpha1.GetCatalogResponse{}
	var err error

	catalogResult.Catalog, err = e.store.Get(context.Background(), map[string]interface{}{"name": i.Name})
	if err != nil {
		return nil, fmt.Errorf("no catalog found in tracker for id %s", i.Name)
	}
	return catalogResult, nil
}

func (e *Catalog) ListCatalogs(
	ctx context.Context,
	i *v1alpha1.ListCatalogsRequest,
) (*v1alpha1.ListCatalogsResponse, error) {

	var catalogsResult = &v1alpha1.ListCatalogsResponse{}
	var err error

	catalogsResult.Catalogs, err = e.store.List(context.Background())
	if err != nil {
		return nil, err
	}
	catalogsResult.TotalCount = uint32(len(catalogsResult.Catalogs))

	return catalogsResult, nil
}

func (e *Catalog) DeleteCatalog(
	ctx context.Context,
	i *v1alpha1.DeleteCatalogRequest,
) (*v1alpha1.DeleteCatalogResponse, error) {

	var catalogResult = &v1alpha1.DeleteCatalogResponse{}

	err := e.store.Delete(context.Background(), map[string]interface{}{"name": i.Name})
	if err != nil {
		return nil, err
	}

	return catalogResult, nil
}

func (e *Catalog) GetVersionCompliance(
	ctx context.Context,
	i *v1alpha1.GetVersionComplianceRequest,
) (*v1alpha1.GetVersionComplianceResponse, error) {

	var response = &v1alpha1.GetVersionComplianceResponse{}
	var projectCompliances []*v1alpha1.ProjectCompliance

	// Get all catalogs
	catalogs, err := e.store.List(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to list catalogs: %w", err)
	}

	// Create maps for quick lookup
	deliverableMap := make(map[string]*v1alpha1.Catalog)
	projectMap := make(map[string]*v1alpha1.Catalog)

	// Separate deliverables and projects
	for _, catalog := range catalogs {
		switch catalog.Type {
		case v1alpha1.Type_package, v1alpha1.Type_chart,
			v1alpha1.Type_container, v1alpha1.Type_module:
			deliverableMap[catalog.Name] = catalog
		case v1alpha1.Type_project:
			projectMap[catalog.Name] = catalog
		}
	}

	// Statistics for summary
	totalProjects := len(projectMap)
	compliantProjects := 0
	deliverableStats := make(map[string]*v1alpha1.DeliverableComplianceStats)

	// For each project, check its used deliverables against reference versions
	for _, project := range projectMap {
		var deliverableUsages []*v1alpha1.DeliverableUsage
		outdatedCount := 0
		totalCount := 0

		if project.UsedDeliverables != nil {
			for _, usedDeliverable := range project.UsedDeliverables {
				deliverable, exists := deliverableMap[usedDeliverable.Name]
				if !exists {
					continue // Skip if deliverable not found in catalog
				}

				totalCount++

				// Use the actual version specified in UsedDeliverable
				currentVersion := usedDeliverable.VersionUsed
				isOutdated := deliverable.ReferenceVersion != "" && currentVersion != deliverable.ReferenceVersion
				isLatest := deliverable.LatestVersion != "" && currentVersion == deliverable.LatestVersion

				if isOutdated {
					outdatedCount++
				}

				usage := &v1alpha1.DeliverableUsage{
					Name:             usedDeliverable.Name,
					Type:             deliverable.Type,
					CurrentVersion:   currentVersion,
					LatestVersion:    deliverable.LatestVersion,
					ReferenceVersion: deliverable.ReferenceVersion,
					IsOutdated:       isOutdated,
					IsLatest:         isLatest,
				}

				deliverableUsages = append(deliverableUsages, usage)

				// Update deliverable stats
				if _, exists := deliverableStats[usedDeliverable.Name]; !exists {
					deliverableStats[usedDeliverable.Name] = &v1alpha1.DeliverableComplianceStats{
						Name:             usedDeliverable.Name,
						Type:             deliverable.Type,
						ProjectsUsing:    0,
						ProjectsOutdated: 0,
						LatestVersion:    deliverable.LatestVersion,
						ReferenceVersion: deliverable.ReferenceVersion,
					}
				}
				deliverableStats[usedDeliverable.Name].ProjectsUsing++
				if isOutdated {
					deliverableStats[usedDeliverable.Name].ProjectsOutdated++
				}
			}
		}

		compliancePercentage := float32(0)
		if totalCount > 0 {
			compliancePercentage = float32(totalCount-outdatedCount) / float32(totalCount) * 100
		}

		if outdatedCount == 0 {
			compliantProjects++
		}

		projectCompliance := &v1alpha1.ProjectCompliance{
			ProjectName:          project.Name,
			Deliverables:         deliverableUsages,
			OutdatedCount:        int32(outdatedCount),
			TotalCount:           int32(totalCount),
			CompliancePercentage: compliancePercentage,
		}

		projectCompliances = append(projectCompliances, projectCompliance)
	}

	// Build summary
	overallCompliance := float32(0)
	if totalProjects > 0 {
		overallCompliance = float32(compliantProjects) / float32(totalProjects) * 100
	}

	var deliverableStatsList []*v1alpha1.DeliverableComplianceStats
	for _, stats := range deliverableStats {
		deliverableStatsList = append(deliverableStatsList, stats)
	}

	summary := &v1alpha1.ComplianceSummary{
		TotalProjects:               int32(totalProjects),
		CompliantProjects:           int32(compliantProjects),
		NonCompliantProjects:        int32(totalProjects - compliantProjects),
		OverallCompliancePercentage: overallCompliance,
		DeliverableStats:            deliverableStatsList,
	}

	response.Projects = projectCompliances
	response.Summary = summary

	e.logger.Info("version compliance check completed",
		"total_projects", totalProjects,
		"compliant_projects", compliantProjects,
		"deliverables_available", len(deliverableMap),
		"overall_compliance", overallCompliance,
	)

	return response, nil
}

func (e *Catalog) UpdateVersions(
	ctx context.Context,
	i *v1alpha1.UpdateVersionsRequest,
) (*v1alpha1.UpdateVersionsResponse, error) {

	e.logger.Info("🔧 Updating versions for service",
		"name", i.Name,
		"available_versions", i.AvailableVersions,
		"latest_version", i.LatestVersion,
		"reference_version", i.ReferenceVersion,
	)

	// Get existing catalog
	existingCatalog, err := e.store.Get(ctx, map[string]interface{}{"name": i.Name})
	if err != nil {
		e.logger.Error("failed to get catalog for version update", "error", err, "name", i.Name)
		return nil, fmt.Errorf("catalog %s not found: %w", i.Name, err)
	}

	// Update only version fields
	existingCatalog.AvailableVersions = i.AvailableVersions
	existingCatalog.LatestVersion = i.LatestVersion
	existingCatalog.ReferenceVersion = i.ReferenceVersion
	existingCatalog.UpdatedAt = timestamppb.Now()

	// Save updated catalog
	updatedCatalog, err := e.store.Update(ctx, map[string]interface{}{"name": i.Name}, existingCatalog)
	if err != nil {
		e.logger.Error("failed to update catalog versions", "error", err, "name", i.Name)
		return nil, fmt.Errorf("failed to update versions for catalog %s: %w", i.Name, err)
	}

	e.logger.Info("✅ Successfully updated versions",
		"name", updatedCatalog.Name,
		"available_versions", updatedCatalog.AvailableVersions,
		"latest_version", updatedCatalog.LatestVersion,
		"reference_version", updatedCatalog.ReferenceVersion,
	)

	return &v1alpha1.UpdateVersionsResponse{
		Catalog: updatedCatalog,
	}, nil
}
