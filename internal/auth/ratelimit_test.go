package auth

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestLoginLimiter(t *testing.T) {
	l := NewLoginLimiter(3, time.Minute)
	now := time.Now()
	l.Now = func() time.Time { return now }

	assert.False(t, l.Blocked("alice|1.1.1.1"))
	l.RecordFailure("alice|1.1.1.1")
	l.RecordFailure("alice|1.1.1.1")
	assert.False(t, l.Blocked("alice|1.1.1.1"))
	l.RecordFailure("alice|1.1.1.1")
	assert.True(t, l.Blocked("alice|1.1.1.1"))
	assert.False(t, l.Blocked("bob|1.1.1.1"), "keys are independent")

	now = now.Add(61 * time.Second)
	assert.False(t, l.Blocked("alice|1.1.1.1"), "failures expire with the window")

	l.RecordFailure("alice|1.1.1.1")
	l.RecordFailure("alice|1.1.1.1")
	l.RecordFailure("alice|1.1.1.1")
	assert.True(t, l.Blocked("alice|1.1.1.1"))
	l.Reset("alice|1.1.1.1")
	assert.False(t, l.Blocked("alice|1.1.1.1"))
}

func TestLoginLimiterSweepsExpiredKeys(t *testing.T) {
	l := NewLoginLimiter(3, time.Minute)
	now := time.Now()
	l.Now = func() time.Time { return now }

	// An attacker varying the username creates one key per attempt.
	for i := 0; i < 500; i++ {
		l.RecordFailure(fmt.Sprintf("user%d|203.0.113.9", i))
	}
	assert.Equal(t, 500, l.size())

	// Neither the insertion budget nor the sweep delay is reached yet.
	now = now.Add(30 * time.Second)
	l.RecordFailure("late|203.0.113.9")
	assert.Equal(t, 501, l.size(), "no sweep before the sweep interval")

	// Past the sweep interval, every key whose failures left the window goes.
	now = now.Add(2 * time.Minute)
	l.RecordFailure("fresh|203.0.113.9")
	assert.Equal(t, 1, l.size(), "only the key recorded just now survives")

	// Blocked sweeps too, so a read only workload cannot leak either.
	now = now.Add(2 * time.Minute)
	assert.False(t, l.Blocked("someone|203.0.113.9"))
	assert.Equal(t, 0, l.size())
}

// size is the number of tracked keys, exposed to the tests only so the
// production type carries no unused method.
func (l *LoginLimiter) size() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.failures)
}
