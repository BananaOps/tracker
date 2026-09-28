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
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	catalogCacheTTL          = 60 * time.Second
	catalogRetryAfterFailure = 5 * time.Second
	claimPollInterval        = 100 * time.Millisecond
	claimPollTimeout         = 2 * time.Second
	staleClaimAfter          = 30 * time.Second
	maxConvergeAttempts      = 3
	integrationLockResource  = "deployment"
	outcomeRecorded          = "recorded"
	outcomeLockConflict      = "lock_conflict"
	outcomeDuplicate         = "duplicate"
	outcomeStale             = "stale"
)

// setEventIDRetryDelays are the waits between SetEventID attempts, after the
// first one: 3 retries, 4 attempts in total.
var setEventIDRetryDelays = [...]time.Duration{50 * time.Millisecond, 100 * time.Millisecond, 200 * time.Millisecond}

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
	Revert(ctx context.Context, key string, prev *store.IntegrationDeployment, status string, rank int, at time.Time) error
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
// whole catalog. A reload is single-flighted: while one caller reloads, the
// others get the previous snapshot immediately instead of waiting on it or
// on the exclusive lock. A successful reload is valid for ttl; a failed one
// keeps the previous snapshot and is retried after catalogRetryAfterFailure
// rather than the full ttl.
type serviceResolver struct {
	catalog CatalogLister
	ttl     time.Duration
	now     func() time.Time
	logger  *slog.Logger

	mu         sync.Mutex
	loading    bool
	nextReload time.Time
	entries    []catalogEntry
}

// snapshot returns the current catalog snapshot, triggering at most one
// concurrent reload. The reload itself runs outside the lock, against a
// context detached from the caller's request so that request cancellation
// never aborts a reload other callers rely on.
func (r *serviceResolver) snapshot() []catalogEntry {
	r.mu.Lock()
	if (!r.nextReload.IsZero() && r.now().Before(r.nextReload)) || r.loading {
		entries := r.entries
		r.mu.Unlock()
		return entries
	}
	r.loading = true
	r.mu.Unlock()

	r.reload()

	r.mu.Lock()
	entries := r.entries
	r.mu.Unlock()
	return entries
}

// reload calls the catalog once and installs the result, or keeps the
// previous snapshot and schedules a quick retry on failure.
func (r *serviceResolver) reload() {
	reloadCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	catalogs, err := r.catalog.List(reloadCtx)

	r.mu.Lock()
	defer r.mu.Unlock()
	r.loading = false
	if err != nil {
		r.logger.Error("integration: catalog reload failed, keeping the previous snapshot", "error", err)
		r.nextReload = r.now().Add(catalogRetryAfterFailure)
		return
	}

	entries := make([]catalogEntry, 0, len(catalogs))
	for _, c := range catalogs {
		if c == nil || c.Name == "" {
			continue
		}
		entries = append(entries, catalogEntry{name: c.Name, repository: integrations.NormalizeRepoURL(c.Repository)})
	}
	r.entries = entries
	r.nextReload = r.now().Add(r.ttl)
}

// Resolve matches hint's repository URLs against the catalog first, then its
// name, and falls back to the name unchanged.
func (r *serviceResolver) Resolve(_ context.Context, hint integrations.ServiceHint) string {
	entries := r.snapshot()
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

// setEventIDWithRetry retries SetEventID after a transient failure, waiting
// setEventIDRetryDelays between attempts (4 attempts in total).
func (p *IntegrationProcessor) setEventIDWithRetry(ctx context.Context, key, eventID string) error {
	var err error
	for attempt := 0; ; attempt++ {
		if err = p.store.SetEventID(ctx, key, eventID); err == nil {
			return nil
		}
		if attempt >= len(setEventIDRetryDelays) {
			return err
		}
		p.logger.Warn("integration: retrying SetEventID", "key", key, "eventId", eventID, "attempt", attempt+1, "error", err)
		timer := time.NewTimer(setEventIDRetryDelays[attempt])
		select {
		case <-ctx.Done():
			timer.Stop()
			return err
		case <-timer.C:
		}
	}
}

// create resolves the service, creates the Tracker event and records its id
// on the claim. A failure creating the event drops the claim so a later
// notification can retry from scratch. A failure recording the event id,
// even after retrying, instead compensates: the event and any lock it holds
// are removed before the claim is dropped, so nothing is left orphaned.
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

	if err := p.setEventIDWithRetry(ctx, obs.Key, created.Metadata.Id); err != nil {
		p.logger.Error("integration: giving up recording the event id for the claim, compensating", "key", obs.Key, "eventId", created.Metadata.Id, "error", err)
		if unlockErr := p.events.lockService.UnlockByEventId(ctx, created.Metadata.Id); unlockErr != nil {
			p.logger.Error("integration: cannot release the lock for the orphaned event", "eventId", created.Metadata.Id, "error", unlockErr)
		}
		if delErr := p.events.store.Delete(ctx, map[string]interface{}{"metadata.id": created.Metadata.Id}); delErr != nil {
			p.logger.Error("integration: cannot delete the orphaned event", "eventId", created.Metadata.Id, "error", delErr)
		}
		if delErr := p.store.Delete(ctx, obs.Key); delErr != nil {
			p.logger.Error("integration: cannot drop the claim after a failed event id update", "key", obs.Key, "error", delErr)
		}
		return ProcessResult{}, err
	}

	// A lock taken while creating the event may already be stale by the time
	// the claim carries the event id: re-read it and release the lock right
	// away if it has gone terminal, same as the update path.
	if shouldCreateLock(eventv1.Type_deployment, obs.Status) {
		if reread, rerr := p.store.Get(ctx, obs.Key); rerr != nil {
			p.logger.Warn("integration: cannot re-read claim after creating event", "key", obs.Key, "eventId", created.Metadata.Id, "error", rerr)
		} else if terminalStatus(reread.Status) {
			if err := p.events.lockService.UnlockByEventId(ctx, created.Metadata.Id); err != nil {
				p.logger.Warn("integration: cannot release lock taken for an already terminal claim", "key", obs.Key, "eventId", created.Metadata.Id, "error", err)
			}
		}
	}

	p.converge(ctx, obs.Key, created.Metadata.Id, obs.Status, obs.At, integrations.Rank(obs.Status))

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
// to its previous state so a later notification can retry. The result
// reported to the caller always reflects this request's own observation,
// even though converge (called last) may keep advancing the event if a
// concurrent observation has already moved the claim further.
func (p *IntegrationProcessor) update(ctx context.Context, obs integrations.Observation, prev *store.IntegrationDeployment) (ProcessResult, error) {
	status := obs.Status.String()
	rank := integrations.Rank(obs.Status)

	fail := func(err error) (ProcessResult, error) {
		if revertErr := p.store.Revert(ctx, obs.Key, prev, status, rank, obs.At); revertErr != nil {
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
	// takeLock is derived from the claim state read before this Advance
	// (prev), never from the event's current status: converge can rewrite
	// the event to a later claim state concurrently, which would otherwise
	// make this decision flicker.
	takeLock := obs.Status == eventv1.Status_start && prev.Status != eventv1.Status_start.String() && !terminalStatus(prev.Status)
	if takeLock {
		if held := p.events.lockService.findLock(ctx, service, environment, integrationLockResource); held != nil {
			conflict = &lockConflict{Who: held.Who}
			takeLock = false
			comment = lockConflictComment(service, environment, held.Who)
		}
	}

	next := nextIntegrationEvent(current, obs.Status, obs.At, obs.Terminal)

	if _, err := p.events.updateEvent(ctx, current, next, map[string]interface{}{"metadata.id": prev.EventID}, obs.User, comment, obs.At); err != nil {
		return fail(err)
	}

	if takeLock {
		// The lock is created with the event id already attached, in the
		// same write: there is no separate attach step, and so no window
		// where the lock exists without pointing at the event it guards.
		lockID, c, err := p.events.observeLock(ctx, service, environment, integrationLockResource, obs.User, prev.EventID, true)
		if err != nil {
			p.logger.Warn("integration: cannot take lock after status change", "key", obs.Key, "eventId", prev.EventID, "error", err)
		} else if c != nil {
			conflict = c
			p.logger.Warn("integration: lock conflict while taking lock after status change", "key", obs.Key, "eventId", prev.EventID, "who", c.Who)
		} else if lockID != "" {
			// A concurrent, later observation may have already brought the
			// claim to a terminal status while this lock was being taken:
			// release it right away rather than leave it stuck.
			reread, rerr := p.store.Get(ctx, obs.Key)
			if rerr != nil {
				p.logger.Warn("integration: cannot re-read claim after taking lock, releasing it", "key", obs.Key, "eventId", prev.EventID, "lockId", lockID, "error", rerr)
				if _, unlockErr := p.events.lockService.store.Unlock(ctx, map[string]interface{}{"id": lockID}); unlockErr != nil {
					p.logger.Warn("integration: cannot release lock after a failed re-read", "key", obs.Key, "eventId", prev.EventID, "lockId", lockID, "error", unlockErr)
				}
			} else if terminalStatus(reread.Status) {
				if err := p.events.lockService.UnlockByEventId(ctx, prev.EventID); err != nil {
					p.logger.Warn("integration: cannot release lock taken for an already terminal claim", "key", obs.Key, "eventId", prev.EventID, "error", err)
				}
			}
		}
	}

	if obs.Terminal {
		if err := p.events.lockService.UnlockByEventId(ctx, prev.EventID); err != nil {
			p.logger.Warn("integration: cannot release lock for terminal status", "key", obs.Key, "eventId", prev.EventID, "error", err)
		}
	}

	p.converge(ctx, obs.Key, prev.EventID, obs.Status, obs.At, rank)

	return ProcessResult{Outcome: outcomeFor(conflict), EventID: prev.EventID}, nil
}

// converge re-reads the claim after a successful event write for key and, if
// a concurrent observation has since moved it further (a race this
// processor resolves without any per-key mutex or Mongo lease), re-applies
// the claim's own state to the event so the two never stay diverged. It
// repeats the re-read/re-apply up to maxConvergeAttempts times in total. It
// never changes the ProcessResult reported for this request's own
// observation: any failure here is logged and swallowed.
func (p *IntegrationProcessor) converge(ctx context.Context, key, eventID string, appliedStatus eventv1.Status, appliedAt time.Time, appliedRank int) {
	status := appliedStatus.String()
	at := store.NormalizeEventTime(appliedAt)
	rank := appliedRank

	for i := 0; i < maxConvergeAttempts; i++ {
		claim, err := p.store.Get(ctx, key)
		if err != nil {
			p.logger.Warn("integration: cannot re-read claim to converge", "key", key, "eventId", eventID, "error", err)
			return
		}
		if claim.Status == status && claim.LastEventAt.Equal(at) && claim.Rank == rank {
			return
		}

		claimStatus, ok := parseStatus(claim.Status)
		if !ok {
			p.logger.Warn("integration: unknown claim status while converging", "key", key, "eventId", eventID, "status", claim.Status)
			return
		}
		terminal := integrations.IsTerminal(claimStatus)

		current, err := p.events.store.Get(ctx, map[string]interface{}{"metadata.id": eventID})
		if err != nil {
			p.logger.Warn("integration: cannot read event to converge", "key", key, "eventId", eventID, "error", err)
			return
		}
		next := nextIntegrationEvent(current, claimStatus, claim.LastEventAt, terminal)
		if _, err := p.events.updateEvent(ctx, current, next, map[string]interface{}{"metadata.id": eventID}, "system", "", claim.LastEventAt); err != nil {
			p.logger.Warn("integration: cannot converge event to claim state", "key", key, "eventId", eventID, "error", err)
			return
		}
		if terminal {
			if err := p.events.lockService.UnlockByEventId(ctx, eventID); err != nil {
				p.logger.Warn("integration: cannot release lock while converging", "key", key, "eventId", eventID, "error", err)
			}
		}

		status, at, rank = claim.Status, claim.LastEventAt, claim.Rank
	}
}

// nextIntegrationEvent builds the requested state for updateEvent: current
// copied field by field, with status and, for a terminal status, an end
// date set to at (the existing start date is kept either way).
func nextIntegrationEvent(current *eventv1.Event, status eventv1.Status, at time.Time, terminal bool) *eventv1.Event {
	attrs := &eventv1.EventAttributes{
		Message:       current.Attributes.Message,
		Source:        current.Attributes.Source,
		Type:          current.Attributes.Type,
		Priority:      current.Attributes.Priority,
		RelatedId:     current.Attributes.RelatedId,
		Service:       current.Attributes.Service,
		Status:        status,
		Environment:   current.Attributes.Environment,
		Impact:        current.Attributes.Impact,
		StartDate:     current.Attributes.StartDate,
		EndDate:       current.Attributes.EndDate,
		Owner:         current.Attributes.Owner,
		StakeHolders:  current.Attributes.StakeHolders,
		Notification:  current.Attributes.Notification,
		Notifications: current.Attributes.Notifications,
	}
	if terminal {
		attrs.EndDate = timestamppb.New(at)
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

// parseStatus turns a claim's stored status string back into eventv1.Status.
// ok is false for a string that names no known status.
func parseStatus(status string) (s eventv1.Status, ok bool) {
	val, known := eventv1.Status_value[status]
	return eventv1.Status(val), known
}

// terminalStatus reports whether a claim's stored status string names a
// terminal eventv1.Status. An unrecognized string is treated as not terminal.
func terminalStatus(status string) bool {
	s, ok := parseStatus(status)
	return ok && integrations.IsTerminal(s)
}
