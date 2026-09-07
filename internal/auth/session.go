package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// SessionSecretLength is the minimum HMAC secret size in bytes.
const SessionSecretLength = 32

// ErrInvalidSession is returned for any token that cannot be trusted.
var ErrInvalidSession = errors.New("invalid session")

// SessionManager issues and verifies HS256 session tokens.
type SessionManager struct {
	secret []byte
	ttl    time.Duration
	// Now is overridable in tests.
	Now func() time.Time
}

// Session is the verified content of a token.
type Session struct {
	UserID         string
	SessionVersion int
	ExpiresAt      time.Time
}

type sessionClaims struct {
	jwt.RegisteredClaims
	SessionVersion int `json:"sv"`
}

// NewSessionManager validates the secret and TTL.
func NewSessionManager(secret []byte, ttl time.Duration) (*SessionManager, error) {
	if len(secret) < SessionSecretLength {
		return nil, fmt.Errorf("session secret must be at least %d bytes", SessionSecretLength)
	}
	if ttl <= 0 {
		return nil, errors.New("session ttl must be positive")
	}
	return &SessionManager{secret: secret, ttl: ttl, Now: time.Now}, nil
}

// TTL returns the configured session lifetime.
func (m *SessionManager) TTL() time.Duration { return m.ttl }

// Issue signs a token for the user.
func (m *SessionManager) Issue(userID string, sessionVersion int) (string, time.Time, error) {
	now := m.Now()
	expires := now.Add(m.ttl)
	claims := sessionClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expires),
		},
		SessionVersion: sessionVersion,
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign session: %w", err)
	}
	return token, expires, nil
}

// Verify parses and validates a token.
func (m *SessionManager) Verify(token string) (Session, error) {
	var claims sessionClaims
	parsed, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidSession
		}
		return m.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithTimeFunc(m.Now), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid || claims.Subject == "" {
		return Session{}, ErrInvalidSession
	}
	return Session{
		UserID:         claims.Subject,
		SessionVersion: claims.SessionVersion,
		ExpiresAt:      claims.ExpiresAt.Time,
	}, nil
}
