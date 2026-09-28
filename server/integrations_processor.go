package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	catalogCacheTTL         = 60 * time.Second
	claimPollInterval       = 100 * time.Millisecond
	claimPollTimeout        = 2 * time.Second
	staleClaimAfter         = 30 * time.Second
	integrationLockResource = "deployment"
	outcomeRecorded         = "recorded"
	outcomeLockConflict     = "lock_conflict"
	outcomeDuplicate        = "duplicate"
	outcomeStale            = "stale"
)

// errClaimPending signals that a correlation was claimed but the Tracker
// event it will point to is not recorded yet (either still being created, or
// abandoned and dropped).
var errClaimPending = errors.New("deployment creation still in progress")

// DeploymentStore is the subset of IntegrationDeploymentStore the processor
// needs, narrowed for testing.
type DeploymentStore interface {
	Claim(ctx context.Context, key, source, status string, at time.Time, rank int) (bool, *store.IntegrationDeployment, error)
	Advance(ctx context.Context, key, status string, at time.Time, rank int) (bool, *store.IntegrationDeployment, error)
	SetEventID(ctx context.Context, key, eventID string) error
	Revert(ctx context.Context, key string, prev *store.IntegrationDeployment, at time.Time) error
	Delete(ctx context.Context, key string) error
	Get(ctx context.Context, key string) (*store.IntegrationDeployment, error)
}

// CatalogLister is the subset of CatalogStoreClient the service resolver
// needs, narrowed for testing.
type CatalogLister interface {
	List(ctx context.Context) ([]*catalogv1.Catalog, error)
}

// ProcessResult reports what Process did with one observation.
type ProcessResult struct {
	Outcome string
	EventID string
}

type catalogEntry struct{ name, repository string }

// serviceResolver keeps a snapshot of (name, normalized repository) for the
// whole catalog, reloaded at most once per ttl. A failed reload keeps the
// previous snapshot.
type serviceResolver struct {
	catalog CatalogLister
	ttl     time.Duration
	now     func() time.Time
	logger  *slog.Logger

	mu       sync.RWMutex
	loadedAt time.Time
	entries  []catalogEntry
}

// snapshot returns the current catalog snapshot, reloading it when it is
// older than ttl. At most one reload happens per ttl, whether it succeeds or
// fails.
func (r *serviceResolver) snapshot(ctx context.Context) []catalogEntry {
	r.mu.RLock()
	if !r.loadedAt.IsZero() && r.now().Sub(r.loadedAt) < r.ttl {
		entries := r.entries
		r.mu.RUnlock()
		return entries
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.loadedAt.IsZero() && r.now().Sub(r.loadedAt) < r.ttl {
		return r.entries
	}

	catalogs, err := r.catalog.List(ctx)
	r.loadedAt = r.now()
	if err != nil {
		r.logger.Error("integration: catalog reload failed, keeping the previous snapshot", "error", err)
		return r.entries
	}

	entries := make([]catalogEntry, 0, len(catalogs))
	for _, c := range catalogs {
		if c == nil || c.Name == "" {
			continue
		}
		entries = append(entries, catalogEntry{name: c.Name, repository: integrations.NormalizeRepoURL(c.Repository)})
	}
	r.entries = entries
	return r.entries
}

// Resolve matches hint's repository URLs against the catalog first, then its
// name, and falls back to the name unchanged.
func (r *serviceResolver) Resolve(ctx context.Context, hint integrations.ServiceHint) string {
	entries := r.snapshot(ctx)
	for _, url := range hint.RepositoryURLs {
		if url == "" {
			continue
		}
		for _, e := range entries {
			if e.repository != "" && e.repository == url {
				return e.name
			}
		}
	}
	for _, e := range entries {
		if e.name == hint.Name {
			return e.name
		}
	}
	return hint.Name
}

// IntegrationProcessor turns a normalized deployment observation into one
// Tracker event, claiming the correlation key so that concurrent
// notifications of the same deployment agree on a single event.
type IntegrationProcessor struct {
	events   *Event
	store    DeploymentStore
	services *serviceResolver
	logger   *slog.Logger

	pollInterval time.Duration
	pollTimeout  time.Duration
	staleClaim   time.Duration
	now          func() time.Time
}

func NewIntegrationProcessor(events *Event, deployments DeploymentStore, catalog CatalogLister, logger *slog.Logger) *IntegrationProcessor {
	return &IntegrationProcessor{
		events:       events,
		store:        deployments,
		services:     &serviceResolver{catalog: catalog, ttl: catalogCacheTTL, now: time.Now, logger: logger},
		logger:       logger,
		pollInterval: claimPollInterval,
		pollTimeout:  claimPollTimeout,
		staleClaim:   staleClaimAfter,
		now:          time.Now,
	}
}

// Process claims obs's correlation key, then creates or updates the Tracker
// event it correlates to.
func (p *IntegrationProcessor) Process(ctx context.Context, obs integrations.Observation) (ProcessResult, error) {
	status := obs.Status.String()
	rank := integrations.Rank(obs.Status)
	created, doc, err := p.store.Claim(ctx, obs.Key, obs.Source, status, obs.At, rank)
	if err != nil {
		return ProcessResult{}, fmt.Errorf("claim deployment: %w", err)
	}
	if created {
		return p.create(ctx, obs)
	}
	if doc.EventID == "" {
		if p.now().Sub(doc.CreatedAt) > p.staleClaim {
			p.logger.Error("integration: dropping an abandoned claim", "key", obs.Key)
			if err := p.store.Delete(ctx, obs.Key); err != nil {
				p.logger.Error("integration: cannot drop the abandoned claim", "key", obs.Key, "error", err)
			}
			return ProcessResult{}, errClaimPending
		}
		if _, err = p.waitForEventID(ctx, obs.Key); err != nil {
			return ProcessResult{}, err
		}
	}
	applied, state, err := p.store.Advance(ctx, obs.Key, status, obs.At, rank)
	if err != nil {
		return ProcessResult{}, fmt.Errorf("advance deployment: %w", err)
	}
	if !applied {
		outcome := outcomeStale
		if state.Status == status && state.LastEventAt.Equal(store.NormalizeEventTime(obs.At)) {
			outcome = outcomeDuplicate
		}
		return ProcessResult{Outcome: outcome, EventID: state.EventID}, nil
	}
	return p.update(ctx, obs, state)
}

// waitForEventID polls the claim until it carries an event id, the poll
// timeout elapses (errClaimPending), or the context is done.
func (p *IntegrationProcessor) waitForEventID(ctx context.Context, key string) (*store.IntegrationDeployment, error) {
	deadline := p.now().Add(p.pollTimeout)
	for {
		timer := time.NewTimer(p.pollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}

		doc, err := p.store.Get(ctx, key)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return nil, errClaimPending
			}
			return nil, err
		}
		if doc.EventID != "" {
			return doc, nil
		}
		if p.now().After(deadline) {
			return nil, errClaimPending
		}
	}
}

// create resolves the service, creates the Tracker event and records its id
// on the claim. A failure at either step drops the claim so a later
// notification can retry from scratch.
func (p *IntegrationProcessor) create(ctx context.Context, obs integrations.Observation) (ProcessResult, error) {
	service := p.services.Resolve(ctx, obs.Service)
	ev := newIntegrationEvent(obs, service)
	created, conflict, err := p.events.createEvent(ctx, ev, obs.User, obs.Comment, lockObserve)
	if err != nil {
		if delErr := p.store.Delete(ctx, obs.Key); delErr != nil {
			p.logger.Error("integration: cannot drop the claim after a failed event creation", "key", obs.Key, "error", delErr)
		}
		return ProcessResult{}, fmt.Errorf("create event: %w", err)
	}
	if err := p.store.SetEventID(ctx, obs.Key, created.Metadata.Id); err != nil {
		p.logger.Error("integration: cannot record the event id for the claim", "key", obs.Key, "eventId", created.Metadata.Id, "error", err)
		if delErr := p.store.Delete(ctx, obs.Key); delErr != nil {
			p.logger.Error("integration: cannot drop the claim after a failed event id update", "key", obs.Key, "error", delErr)
		}
		return ProcessResult{}, err
	}
	return ProcessResult{Outcome: outcomeFor(conflict), EventID: created.Metadata.Id}, nil
}

func newIntegrationEvent(obs integrations.Observation, service string) *eventv1.Event {
	attrs := &eventv1.EventAttributes{
		Message:     obs.Message,
		Source:      obs.Source,
		Type:        eventv1.Type_deployment,
		Priority:    eventv1.Priority_P3,
		Impact:      false,
		Environment: obs.Environment,
		Owner:       obs.Owner,
		Service:     service,
		Status:      obs.Status,
		StartDate:   timestamppb.New(obs.At),
	}
	if obs.Terminal {
		attrs.EndDate = timestamppb.New(obs.At)
	}
	return &eventv1.Event{
		Title:      obs.Title(service),
		Attributes: attrs,
		Links:      &eventv1.EventLinks{},
		Metadata:   &eventv1.EventMetadata{},
	}
}

// update applies obs to the event already correlated with the claim. A lock
// conflict is recorded as a changelog comment and never fails the request;
// only a store or Tracker write failure does, and then the claim is reverted
// to its previous state so a later notification can retry.
func (p *IntegrationProcessor) update(ctx context.Context, obs integrations.Observation, prev *store.IntegrationDeployment) (ProcessResult, error) {
	fail := func(err error) (ProcessResult, error) {
		if revertErr := p.store.Revert(ctx, obs.Key, prev, obs.At); revertErr != nil {
			p.logger.Error("integration: cannot revert the claim after a failed event update", "key", obs.Key, "eventId", prev.EventID, "error", revertErr)
		}
		return ProcessResult{}, err
	}

	current, err := p.events.store.Get(ctx, map[string]interface{}{"metadata.id": prev.EventID})
	if err != nil {
		return fail(err)
	}

	service := current.Attributes.Service
	environment := current.Attributes.Environment.String()

	var conflict *lockConflict
	comment := obs.Comment
	takeLock := obs.Status == eventv1.Status_start && current.Attributes.Status != eventv1.Status_start
	if takeLock {
		if held := p.events.lockService.findLock(ctx, service, environment, integrationLockResource); held != nil {
			conflict = &lockConflict{Who: held.Who}
			takeLock = false
			comment = lockConflictComment(service, environment, held.Who)
		}
	}

	next := nextIntegrationEvent(current, obs)

	if _, err := p.events.updateEvent(ctx, current, next, map[string]interface{}{"metadata.id": prev.EventID}, obs.User, comment, obs.At); err != nil {
		return fail(err)
	}

	if takeLock {
		lockID, c, err := p.events.observeLock(ctx, service, environment, integrationLockResource, obs.User, true)
		if err != nil {
			p.logger.Warn("integration: cannot take lock after status change", "key", obs.Key, "eventId", prev.EventID, "error", err)
		} else if c != nil {
			conflict = c
			p.logger.Warn("integration: lock conflict while taking lock after status change", "key", obs.Key, "eventId", prev.EventID, "who", c.Who)
		} else if lockID != "" {
			if _, err := p.events.lockService.updateLock(ctx, &lockv1.UpdateLockRequest{Id: lockID, EventId: prev.EventID}); err != nil {
				p.logger.Warn("integration: cannot link lock to event", "key", obs.Key, "eventId", prev.EventID, "lockId", lockID, "error", err)
			}
		}
	}

	if obs.Terminal {
		if err := p.events.lockService.UnlockByEventId(ctx, prev.EventID); err != nil {
			p.logger.Warn("integration: cannot release lock for terminal status", "key", obs.Key, "eventId", prev.EventID, "error", err)
		}
	}

	return ProcessResult{Outcome: outcomeFor(conflict), EventID: prev.EventID}, nil
}

// nextIntegrationEvent builds the requested state for updateEvent: current
// copied field by field, with the observed status and, for a terminal
// status, an end date.
func nextIntegrationEvent(current *eventv1.Event, obs integrations.Observation) *eventv1.Event {
	attrs := &eventv1.EventAttributes{
		Message:       current.Attributes.Message,
		Source:        current.Attributes.Source,
		Type:          current.Attributes.Type,
		Priority:      current.Attributes.Priority,
		RelatedId:     current.Attributes.RelatedId,
		Service:       current.Attributes.Service,
		Status:        obs.Status,
		Environment:   current.Attributes.Environment,
		Impact:        current.Attributes.Impact,
		StartDate:     current.Attributes.StartDate,
		EndDate:       current.Attributes.EndDate,
		Owner:         current.Attributes.Owner,
		StakeHolders:  current.Attributes.StakeHolders,
		Notification:  current.Attributes.Notification,
		Notifications: current.Attributes.Notifications,
	}
	if obs.Terminal {
		attrs.EndDate = timestamppb.New(obs.At)
	}

	links := &eventv1.EventLinks{}
	if current.Links != nil {
		links.PullRequestLink = current.Links.PullRequestLink
		links.Ticket = current.Links.Ticket
	}

	return &eventv1.Event{
		Title:      current.Title,
		Attributes: attrs,
		Links:      links,
		Metadata: &eventv1.EventMetadata{
			SlackId:   current.Metadata.SlackId,
			CreatedAt: current.Metadata.CreatedAt,
			Duration:  current.Metadata.Duration,
			Id:        current.Metadata.Id,
		},
	}
}

func outcomeFor(conflict *lockConflict) string {
	if conflict != nil {
		return outcomeLockConflict
	}
	return outcomeRecorded
}
