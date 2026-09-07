package auth

import (
	"bytes"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testSecret() []byte { return bytes.Repeat([]byte{7}, 32) }

func TestSessionRoundTrip(t *testing.T) {
	m, err := NewSessionManager(testSecret(), time.Hour)
	require.NoError(t, err)
	now := time.Date(2026, 9, 5, 10, 0, 0, 0, time.UTC)
	m.Now = func() time.Time { return now }

	token, expires, err := m.Issue("user-1", 3)
	require.NoError(t, err)
	assert.Equal(t, now.Add(time.Hour), expires)

	s, err := m.Verify(token)
	require.NoError(t, err)
	assert.Equal(t, "user-1", s.UserID)
	assert.Equal(t, 3, s.SessionVersion)
	assert.Equal(t, expires.Unix(), s.ExpiresAt.Unix())
}

func TestSessionExpired(t *testing.T) {
	m, _ := NewSessionManager(testSecret(), time.Hour)
	now := time.Now()
	m.Now = func() time.Time { return now }
	token, _, _ := m.Issue("user-1", 1)
	m.Now = func() time.Time { return now.Add(2 * time.Hour) }
	_, err := m.Verify(token)
	assert.ErrorIs(t, err, ErrInvalidSession)
}

func TestSessionWrongSecret(t *testing.T) {
	a, _ := NewSessionManager(testSecret(), time.Hour)
	b, _ := NewSessionManager(bytes.Repeat([]byte{9}, 32), time.Hour)
	token, _, _ := a.Issue("user-1", 1)
	_, err := b.Verify(token)
	assert.ErrorIs(t, err, ErrInvalidSession)
	_, err = a.Verify("garbage")
	assert.ErrorIs(t, err, ErrInvalidSession)
}

func TestSessionManagerValidation(t *testing.T) {
	_, err := NewSessionManager([]byte("short"), time.Hour)
	assert.Error(t, err)
	_, err = NewSessionManager(testSecret(), 0)
	assert.Error(t, err)
}
