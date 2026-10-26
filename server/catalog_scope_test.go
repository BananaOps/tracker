package server

import (
	"context"
	"testing"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/protobuf/encoding/protojson"
)

const catalogSvc = "/tracker.catalog.v1alpha1.CatalogService/"

type catalogScopeEnv struct {
	s                    *scopeServices
	pa, ponly, none, all auth.Principal
}

func newCatalogScopeEnv(t *testing.T) *catalogScopeEnv {
	t.Helper()
	s := newScopeServices(t, scopeDB(t))
	seedCatalog(t, s, &catalogv1.Catalog{
		Name: "proj-a", Type: catalogv1.Type_project,
		DependenciesOut: []string{"svc-b"}, DependenciesIn: []string{"svc-c"},
		UsedDeliverables: []*catalogv1.UsedDeliverable{
			{Name: "lib-a", VersionUsed: "1.0.0"}, {Name: "lib-b", VersionUsed: "0.9.0"},
		},
	})
	seedCatalog(t, s, &catalogv1.Catalog{
		Name: "proj-b", Type: catalogv1.Type_project,
		UsedDeliverables: []*catalogv1.UsedDeliverable{{Name: "lib-b", VersionUsed: "0.9.0"}},
	})
	seedCatalog(t, s, &catalogv1.Catalog{Name: "lib-a", Type: catalogv1.Type_package, ReferenceVersion: "2.0.0", LatestVersion: "2.1.0"})
	seedCatalog(t, s, &catalogv1.Catalog{Name: "lib-b", Type: catalogv1.Type_package, ReferenceVersion: "7.7.7", LatestVersion: "8.8.8"})
	return &catalogScopeEnv{
		s:     s,
		pa:    scopedPrincipal("proj-a", "lib-a"),
		ponly: scopedPrincipal("proj-a"),
		none:  scopedPrincipal(),
		all:   allScopePrincipal(),
	}
}

func (x *catalogScopeEnv) ctx(p auth.Principal, method string) context.Context {
	return scopeCtx(p, catalogSvc+method)
}

func (x *catalogScopeEnv) stored(t *testing.T, name string) *catalogv1.Catalog {
	t.Helper()
	c, err := x.s.catalogs.store.Get(context.Background(), map[string]interface{}{"name": name})
	require.NoError(t, err)
	return c
}

func (x *catalogScopeEnv) exists(t *testing.T, name string) bool {
	t.Helper()
	_, err := x.s.catalogs.store.Get(context.Background(), map[string]interface{}{"name": name})
	if err == mongo.ErrNoDocuments {
		return false
	}
	require.NoError(t, err)
	return true
}

func TestListCatalogsScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	list := func(p auth.Principal) *catalogv1.ListCatalogsResponse {
		r, err := x.s.catalogs.ListCatalogs(x.ctx(p, "ListCatalogs"), &catalogv1.ListCatalogsRequest{})
		require.NoError(t, err)
		return r
	}
	r := list(x.pa)
	names := []string{}
	for _, c := range r.Catalogs {
		names = append(names, c.Name)
	}
	require.ElementsMatch(t, []string{"proj-a", "lib-a"}, names)
	require.EqualValues(t, 2, r.TotalCount)
	require.Empty(t, list(x.none).Catalogs)
	require.Len(t, list(x.all).Catalogs, 4)
}

func TestGetCatalogScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	get := func(p auth.Principal, name string) (*catalogv1.GetCatalogResponse, error) {
		return x.s.catalogs.GetCatalog(x.ctx(p, "GetCatalog"), &catalogv1.GetCatalogRequest{Name: name})
	}
	r, err := get(x.pa, "proj-a")
	require.NoError(t, err)
	require.Equal(t, []string{"svc-b"}, r.Catalog.DependenciesOut)
	require.Equal(t, []string{"svc-c"}, r.Catalog.DependenciesIn)
	require.Len(t, r.Catalog.UsedDeliverables, 2)

	_, err = get(x.pa, "proj-b")
	requireDenied(t, err)
	_, err = get(x.pa, "lib-b")
	requireDenied(t, err)
	_, err = get(x.pa, "ghost")
	requireDenied(t, err)
	_, err = get(x.none, "proj-a")
	requireDenied(t, err)
	_, err = get(x.all, "lib-b")
	require.NoError(t, err)
}

func TestCreateUpdateCatalogScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	put := func(p auth.Principal, name string) error {
		_, err := x.s.catalogs.CreateUpdateCatalog(x.ctx(p, "CreateUpdateCatalog"),
			&catalogv1.CreateUpdateCatalogRequest{Name: name, Owner: "o", Version: "1"})
		return err
	}
	require.NoError(t, put(x.pa, "proj-a"))
	requireDenied(t, put(x.pa, "new-svc"))
	require.False(t, x.exists(t, "new-svc"))
	requireDenied(t, put(x.pa, "proj-b"))
	require.Len(t, x.stored(t, "proj-b").UsedDeliverables, 1)
	requireDenied(t, put(x.none, "proj-a"))
	require.NoError(t, put(x.all, "new-svc"))
	require.True(t, x.exists(t, "new-svc"))

	err := put(x.pa, "")
	require.Error(t, err)
	require.Contains(t, err.Error(), "name is required")
}

func TestDeleteCatalogScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	del := func(p auth.Principal, name string) error {
		_, err := x.s.catalogs.DeleteCatalog(x.ctx(p, "DeleteCatalog"), &catalogv1.DeleteCatalogRequest{Name: name})
		return err
	}
	requireDenied(t, del(x.pa, "proj-b"))
	require.True(t, x.exists(t, "proj-b"))
	require.NoError(t, del(x.pa, "lib-a"))
	require.False(t, x.exists(t, "lib-a"))
	requireDenied(t, del(x.none, "proj-a"))
	require.True(t, x.exists(t, "proj-a"))
	require.NoError(t, del(x.all, "proj-b"))
	require.False(t, x.exists(t, "proj-b"))
}

func TestUpdateVersionsScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	upd := func(p auth.Principal, name string) error {
		_, err := x.s.catalogs.UpdateVersions(x.ctx(p, "UpdateVersions"),
			&catalogv1.UpdateVersionsRequest{Name: name, ReferenceVersion: "3.0.0"})
		return err
	}
	require.NoError(t, upd(x.pa, "lib-a"))
	require.Equal(t, "3.0.0", x.stored(t, "lib-a").ReferenceVersion)
	requireDenied(t, upd(x.pa, "lib-b"))
	require.Equal(t, "7.7.7", x.stored(t, "lib-b").ReferenceVersion)
	requireDenied(t, upd(x.none, "lib-a"))
}

func TestUpdateDependenciesScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	upd := func(p auth.Principal, name string) error {
		_, err := x.s.catalogs.UpdateDependencies(x.ctx(p, "UpdateDependencies"),
			&catalogv1.UpdateDependenciesRequest{Name: name, DependenciesOut: []string{"svc-z"}})
		return err
	}
	require.NoError(t, upd(x.pa, "proj-a"))
	require.Equal(t, []string{"svc-z"}, x.stored(t, "proj-a").DependenciesOut)
	require.Empty(t, x.stored(t, "proj-b").DependenciesOut)
	requireDenied(t, upd(x.pa, "proj-b"))
	require.Empty(t, x.stored(t, "proj-b").DependenciesOut)
	requireDenied(t, upd(x.none, "proj-a"))
}

func TestGetVersionComplianceScope(t *testing.T) {
	x := newCatalogScopeEnv(t)
	comp := func(p auth.Principal) *catalogv1.GetVersionComplianceResponse {
		r, err := x.s.catalogs.GetVersionCompliance(x.ctx(p, "GetVersionCompliance"), &catalogv1.GetVersionComplianceRequest{})
		require.NoError(t, err)
		return r
	}
	dump := func(r *catalogv1.GetVersionComplianceResponse) string {
		b, err := protojson.Marshal(r)
		require.NoError(t, err)
		return string(b)
	}

	r := comp(x.pa)
	require.Len(t, r.Projects, 1)
	require.Equal(t, "proj-a", r.Projects[0].ProjectName)
	require.Len(t, r.Projects[0].Deliverables, 1)
	d := r.Projects[0].Deliverables[0]
	require.Equal(t, "lib-a", d.Name)
	require.Equal(t, "1.0.0", d.CurrentVersion)
	require.Equal(t, "2.0.0", d.ReferenceVersion)
	require.True(t, d.IsOutdated)
	require.EqualValues(t, 1, r.Projects[0].TotalCount)
	require.EqualValues(t, 1, r.Projects[0].OutdatedCount)
	require.EqualValues(t, 1, r.Summary.TotalProjects)
	require.Len(t, r.Summary.DeliverableStats, 1)
	require.Equal(t, "lib-a", r.Summary.DeliverableStats[0].Name)
	require.EqualValues(t, 1, r.Summary.DeliverableStats[0].ProjectsUsing)
	out := dump(r)
	for _, leak := range []string{"lib-b", "proj-b", "7.7.7", "8.8.8"} {
		require.NotContains(t, out, leak)
	}

	r = comp(x.ponly)
	require.Len(t, r.Projects, 1)
	require.Equal(t, "proj-a", r.Projects[0].ProjectName)
	require.Empty(t, r.Projects[0].Deliverables)
	require.EqualValues(t, 0, r.Projects[0].TotalCount)
	out = dump(r)
	require.NotContains(t, out, "2.0.0")
	require.NotContains(t, out, "7.7.7")

	r = comp(x.none)
	require.Empty(t, r.Projects)
	require.EqualValues(t, 0, r.Summary.TotalProjects)

	r = comp(x.all)
	require.Len(t, r.Projects, 2)
	var using int32 = -1
	for _, s := range r.Summary.DeliverableStats {
		if s.Name == "lib-b" {
			using = s.ProjectsUsing
		}
	}
	require.EqualValues(t, 2, using)
}
