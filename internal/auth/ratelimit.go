package auth

import (
	"sync"
	"time"
)

const (
	// sweepEveryInsertions and sweepInterval bound the memory of the limiter:
	// whichever comes first triggers a full pass over the map.
	sweepEveryInsertions = 1000
	sweepInterval        = time.Minute
)

// LoginLimiter blocks a key after too many failures inside a sliding window.
// It is in-memory and per process, which is enough to slow down online guessing.
type LoginLimiter struct {
	mu          sync.Mutex
	maxFailures int
	window      time.Duration
	failures    map[string][]time.Time
	// insertions counts the failures recorded since the last sweep, and
	// lastSweep dates that sweep. See maybeSweep.
	insertions int
	lastSweep  time.Time
	// Now is overridable in tests.
	Now func() time.Time
}

// NewLoginLimiter creates a limiter allowing maxFailures per window.
func NewLoginLimiter(maxFailures int, window time.Duration) *LoginLimiter {
	return &LoginLimiter{maxFailures: maxFailures, window: window, failures: map[string][]time.Time{}, Now: time.Now}
}

// Blocked reports whether the key has reached the failure budget.
func (l *LoginLimiter) Blocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.Now()
	l.prune(key, now)
	l.maybeSweep(now)
	return len(l.failures[key]) >= l.maxFailures
}

// RecordFailure adds a failed attempt for the key.
func (l *LoginLimiter) RecordFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.Now()
	l.prune(key, now)
	l.failures[key] = append(l.failures[key], now)
	l.insertions++
	l.maybeSweep(now)
}

// Reset forgets the failures of the key, after a successful login.
func (l *LoginLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, key)
}

// prune drops the failures of one key that left the window, and removes the
// key entirely when nothing is left. The caller holds the lock.
func (l *LoginLimiter) prune(key string, now time.Time) {
	kept := l.failures[key][:0]
	for _, at := range l.failures[key] {
		if now.Sub(at) < l.window {
			kept = append(kept, at)
		}
	}
	if len(kept) == 0 {
		delete(l.failures, key)
		return
	}
	l.failures[key] = kept
}

// maybeSweep prunes every key, not just the one being looked at. Without it
// the map only ever shrinks for keys somebody retries, so a caller varying
// the username or the IP grows it without bound. The caller holds the lock.
func (l *LoginLimiter) maybeSweep(now time.Time) {
	if l.lastSweep.IsZero() {
		l.lastSweep = now
		return
	}
	if l.insertions < sweepEveryInsertions && now.Sub(l.lastSweep) < sweepInterval {
		return
	}
	l.insertions = 0
	l.lastSweep = now
	for key := range l.failures {
		l.prune(key, now)
	}
}
