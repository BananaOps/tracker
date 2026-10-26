package server

import (
	"context"
	"testing"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const eventSvc = "/tracker.event.v1alpha1.EventService/"

type scopeEnv struct {
	s         *scopeServices
	a, b, e   string
	pa, pab   auth.Principal
	none, all auth.Principal
}

func newScopeEnv(t *testing.T) *scopeEnv {
	t.Helper()
	s := newScopeServices(t, scopeDB(t))
	return &scopeEnv{
		s: s, a: seedEvent(t, s, "svc-a"), b: seedEvent(t, s, "svc-b"), e: seedEvent(t, s, ""),
		pa: scopedPrincipal("svc-a"), pab: scopedPrincipal("svc-a", "svc-b"),
		none: scopedPrincipal(), all: allScopePrincipal(),
	}
}

func (x *scopeEnv) ctx(p auth.Principal, method string) context.Context {
	return scopeCtx(p, eventSvc+method)
}

func requireDenied(t *testing.T, err error) {
	t.Helper()
	require.Error(t, err)
	require.Equal(t, codes.PermissionDenied, status.Code(err), err.Error())
}

func scopeAttrs(service string) *eventv1.EventAttributes {
	return &eventv1.EventAttributes{
		Service: service, Type: eventv1.Type_incident, Status: eventv1.Status_open,
		Environment: eventv1.Environment_production, Priority: eventv1.Priority_P3,
		Source: "scope-test", Owner: "alice",
	}
}

func createReq(service string) *eventv1.CreateEventRequest {
	return &eventv1.CreateEventRequest{Title: "t", Attributes: scopeAttrs(service), Links: &eventv1.EventLinks{}}
}

func updateReq(id, service string) *eventv1.UpdateEventRequest {
	return &eventv1.UpdateEventRequest{Id: id, Title: "t2", Attributes: scopeAttrs(service), Links: &eventv1.EventLinks{}}
}

func (x *scopeEnv) stored(t *testing.T, id string) *eventv1.Event {
	t.Helper()
	e, err := x.s.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": id})
	require.NoError(t, err)
	return e
}

func (x *scopeEnv) countService(t *testing.T, service string) int {
	t.Helper()
	all, err := x.s.eventStore.List(context.Background(), auth.ScopeAll())
	require.NoError(t, err)
	n := 0
	for _, e := range all {
		if e.Attributes.Service == service {
			n++
		}
	}
	return n
}

func eventIDs(events []*eventv1.Event) []string {
	out := []string{}
	for _, e := range events {
		out = append(out, e.Metadata.Id)
	}
	return out
}

func TestCreateEventScope(t *testing.T) {
	x := newScopeEnv(t)
	_, err := x.s.events.CreateEvent(x.ctx(x.pa, "CreateEvent"), createReq("svc-a"))
	require.NoError(t, err)

	before := x.countService(t, "svc-b")
	_, err = x.s.events.CreateEvent(x.ctx(x.pa, "CreateEvent"), createReq("svc-b"))
	requireDenied(t, err)
	require.Equal(t, before, x.countService(t, "svc-b"))

	_, err = x.s.events.CreateEvent(x.ctx(x.pa, "CreateEvent"), createReq(""))
	requireDenied(t, err)
	_, err = x.s.events.CreateEvent(x.ctx(x.none, "CreateEvent"), createReq("svc-a"))
	requireDenied(t, err)

	_, err = x.s.events.CreateEvent(x.ctx(x.all, "CreateEvent"), createReq(""))
	require.NoError(t, err)
	_, err = x.s.events.CreateEvent(x.ctx(x.all, "CreateEvent"), createReq("svc-b"))
	require.NoError(t, err)
}

func TestGetEventScope(t *testing.T) {
	x := newScopeEnv(t)
	get := func(p auth.Principal, id string) error {
		_, err := x.s.events.GetEvent(x.ctx(p, "GetEvent"), &eventv1.GetEventRequest{Id: id})
		return err
	}
	require.NoError(t, get(x.pa, x.a))
	requireDenied(t, get(x.pa, x.b))
	requireDenied(t, get(x.pa, x.e))
	requireDenied(t, get(x.none, x.a))
	require.NoError(t, get(x.all, x.b))
	require.NoError(t, get(x.all, x.e))

	err := get(x.pa, "6f1c1c6e-2f0a-4b57-9d3a-1c2f3a4b5c6d")
	require.Error(t, err)
	require.NotEqual(t, codes.PermissionDenied, status.Code(err))
}

func TestListEventsScope(t *testing.T) {
	x := newScopeEnv(t)
	list := func(p auth.Principal) *eventv1.ListEventsResponse {
		r, err := x.s.events.ListEvents(x.ctx(p, "ListEvents"), &eventv1.ListEventsRequest{})
		require.NoError(t, err)
		return r
	}
	r := list(x.pa)
	require.ElementsMatch(t, []string{x.a}, eventIDs(r.Events))
	require.EqualValues(t, 1, r.TotalCount)
	require.ElementsMatch(t, []string{x.a, x.b}, eventIDs(list(x.pab).Events))
	require.Empty(t, list(x.none).Events)
	require.Len(t, list(x.all).Events, 3)
}

func TestSearchEventsScope(t *testing.T) {
	x := newScopeEnv(t)
	search := func(p auth.Principal, req *eventv1.SearchEventsRequest) []*eventv1.Event {
		r, err := x.s.events.SearchEvents(x.ctx(p, "SearchEvents"), req)
		require.NoError(t, err)
		return r.Events
	}
	req := &eventv1.SearchEventsRequest{Source: "scope-test"}
	require.ElementsMatch(t, []string{x.a}, eventIDs(search(x.pa, req)))
	require.Empty(t, search(x.pa, &eventv1.SearchEventsRequest{Source: "scope-test", Service: "svc-b"}))
	require.Empty(t, search(x.none, req))
	require.Len(t, search(x.all, req), 3)
}

func TestTodayEventsScope(t *testing.T) {
	x := newScopeEnv(t)
	today := func(p auth.Principal) []*eventv1.Event {
		r, err := x.s.events.TodayEvents(x.ctx(p, "TodayEvents"), &eventv1.TodayEventsRequest{})
		require.NoError(t, err)
		return r.Events
	}
	require.ElementsMatch(t, []string{x.a}, eventIDs(today(x.pa)))
	require.Empty(t, today(x.none))
	require.Len(t, today(x.all), 3)
}

func TestUpdateEventScope(t *testing.T) {
	x := newScopeEnv(t)
	update := func(p auth.Principal, id, service string) error {
		_, err := x.s.events.UpdateEvent(x.ctx(p, "UpdateEvent"), updateReq(id, service))
		return err
	}
	require.NoError(t, update(x.pa, x.a, "svc-a"))

	requireDenied(t, update(x.pa, x.b, "svc-b"))
	require.Equal(t, "seed svc-b", x.stored(t, x.b).Title)

	requireDenied(t, update(x.pa, x.a, "svc-b"))
	require.Equal(t, "svc-a", x.stored(t, x.a).Attributes.Service)

	requireDenied(t, update(x.pa, x.a, ""))
	require.Equal(t, "svc-a", x.stored(t, x.a).Attributes.Service)

	require.NoError(t, update(x.pab, x.a, "svc-b"))
	require.Equal(t, "svc-b", x.stored(t, x.a).Attributes.Service)

	requireDenied(t, update(x.pa, x.e, "svc-a"))
	require.Equal(t, "", x.stored(t, x.e).Attributes.Service)

	requireDenied(t, update(x.none, x.b, "svc-b"))

	require.NoError(t, update(x.all, x.b, "svc-a"))
	require.Equal(t, "svc-a", x.stored(t, x.b).Attributes.Service)
}

func TestDeleteEventsScope(t *testing.T) {
	x := newScopeEnv(t)
	del := func(p auth.Principal, id string) error {
		_, err := x.s.events.DeleteEvents(x.ctx(p, "DeleteEvents"), &eventv1.DeleteEventRequest{Id: id})
		return err
	}
	requireDenied(t, del(x.pa, x.b))
	require.Equal(t, "svc-b", x.stored(t, x.b).Attributes.Service)
	requireDenied(t, del(x.pa, x.e))
	require.NoError(t, del(x.pa, x.a))
	_, err := x.s.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": x.a})
	require.Error(t, err)
	require.NoError(t, del(x.pa, "6f1c1c6e-2f0a-4b57-9d3a-1c2f3a4b5c6d"))
	requireDenied(t, del(x.none, x.b))
	require.NoError(t, del(x.all, x.b))
	_, err = x.s.eventStore.Get(context.Background(), map[string]interface{}{"metadata.id": x.b})
	require.Error(t, err)
}

func TestAddChangelogEntryScope(t *testing.T) {
	x := newScopeEnv(t)
	add := func(p auth.Principal, id string) error {
		_, err := x.s.events.AddChangelogEntry(x.ctx(p, "AddChangelogEntry"), &eventv1.AddChangelogEntryRequest{
			Id:    id,
			Entry: &eventv1.ChangelogEntry{User: "alice", ChangeType: eventv1.ChangeType_commented, Comment: "c"},
		})
		return err
	}
	require.NoError(t, add(x.pa, x.a))
	before := len(x.stored(t, x.b).Changelog)
	requireDenied(t, add(x.pa, x.b))
	require.Len(t, x.stored(t, x.b).Changelog, before)
	requireDenied(t, add(x.pa, x.e))
	requireDenied(t, add(x.none, x.a))
}

func TestGetEventChangelogScope(t *testing.T) {
	x := newScopeEnv(t)
	get := func(p auth.Principal, id string) error {
		_, err := x.s.events.GetEventChangelog(x.ctx(p, "GetEventChangelog"), &eventv1.GetEventChangelogRequest{Id: id})
		return err
	}
	require.NoError(t, get(x.pa, x.a))
	requireDenied(t, get(x.pa, x.b))
	requireDenied(t, get(x.none, x.a))
	require.NoError(t, get(x.all, x.b))
}

func TestAddSlackIdScope(t *testing.T) {
	x := newScopeEnv(t)
	add := func(p auth.Principal, id string) error {
		_, err := x.s.events.AddSlackId(x.ctx(p, "AddSlackId"), &eventv1.AddSlackIdRequest{Id: id, SlackId: "S1"})
		return err
	}
	requireDenied(t, add(x.pa, x.b))
	require.Empty(t, x.stored(t, x.b).Metadata.SlackId)
	require.NoError(t, add(x.pa, x.a))
	requireDenied(t, add(x.none, x.e))
}

func statsDates() (string, string) {
	now := time.Now()
	return now.AddDate(0, 0, -1).Format("2006-01-02"), now.AddDate(0, 0, 1).Format("2006-01-02")
}

func TestGetEventStatsScope(t *testing.T) {
	x := newScopeEnv(t)
	start, end := statsDates()
	stats := func(p auth.Principal, service string) uint64 {
		r, err := x.s.events.GetEventStats(x.ctx(p, "GetEventStats"), &eventv1.GetEventStatsRequest{
			StartDate: start, EndDate: end, Source: "scope-test", Service: service,
		})
		require.NoError(t, err)
		return r.TotalCount
	}
	require.EqualValues(t, 1, stats(x.pa, ""))
	require.EqualValues(t, 2, stats(x.pab, ""))
	require.EqualValues(t, 0, stats(x.none, ""))
	require.EqualValues(t, 3, stats(x.all, ""))
	require.EqualValues(t, 0, stats(x.pa, "svc-b"))
}

func TestGetEventStatsByMonthScope(t *testing.T) {
	x := newScopeEnv(t)
	start, end := statsDates()
	stats := func(p auth.Principal) *eventv1.GetEventStatsByMonthResponse {
		r, err := x.s.events.GetEventStatsByMonth(x.ctx(p, "GetEventStatsByMonth"), &eventv1.GetEventStatsByMonthRequest{
			StartDate: start, EndDate: end, Source: "scope-test", GroupByService: true,
		})
		require.NoError(t, err)
		return r
	}
	r := stats(x.pa)
	require.Len(t, r.Stats, 1)
	require.Equal(t, "svc-a", r.Stats[0].Service)
	require.EqualValues(t, 1, r.TotalCount)
	require.Empty(t, stats(x.none).Stats)
	require.EqualValues(t, 3, stats(x.all).TotalCount)
}

func scopeDeniedCount(t *testing.T) float64 {
	t.Helper()
	families, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)
	for _, f := range families {
		if f.GetName() != "tracker_auth_requests_total" {
			continue
		}
		for _, m := range f.GetMetric() {
			labels := map[string]string{}
			for _, l := range m.GetLabel() {
				labels[l.GetName()] = l.GetValue()
			}
			if labels["principal"] == "user" && labels["result"] == "scope_denied" {
				return m.GetCounter().GetValue()
			}
		}
	}
	return 0
}

func TestScopeDenialIsCounted(t *testing.T) {
	x := newScopeEnv(t)
	before := scopeDeniedCount(t)
	_, err := x.s.events.GetEvent(x.ctx(x.pa, "GetEvent"), &eventv1.GetEventRequest{Id: x.b})
	requireDenied(t, err)
	require.Equal(t, before+1, scopeDeniedCount(t))
}
