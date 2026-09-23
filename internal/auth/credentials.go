package auth

import (
	"net"
	"net/http"
	"strings"
	"time"

	"google.golang.org/grpc/metadata"
)

const (
	// SessionCookieName carries the session token for the SPA.
	SessionCookieName = "tracker_session"
	// APIKeyHeader carries an API key.
	APIKeyHeader = "X-Api-Key" // #nosec G101 -- header name, not a credential
)

// Credentials are the raw secrets found on a request, before any lookup.
type Credentials struct {
	APIKey       string
	SessionToken string
	// FromCookie is true when the session token came from the browser cookie
	// rather than an explicit header. Only that source is ambient, so only
	// that source needs the cross-site guard. See IsCrossSite.
	FromCookie bool
}

// Empty reports whether no credential was presented.
func (c Credentials) Empty() bool { return c.APIKey == "" && c.SessionToken == "" }

// CredentialsFromHTTP extracts credentials in priority order:
// X-Api-Key header, Authorization bearer, session cookie.
func CredentialsFromHTTP(r *http.Request) Credentials {
	if v := strings.TrimSpace(r.Header.Get(APIKeyHeader)); v != "" {
		return Credentials{APIKey: v}
	}
	if c, ok := fromBearer(r.Header.Get("Authorization")); ok {
		return c
	}
	if ck, err := r.Cookie(SessionCookieName); err == nil && ck.Value != "" {
		return Credentials{SessionToken: ck.Value, FromCookie: true}
	}
	return Credentials{}
}

// CredentialsFromMetadata extracts credentials from gRPC metadata.
func CredentialsFromMetadata(md metadata.MD) Credentials {
	first := func(key string) string {
		if v := md.Get(key); len(v) > 0 {
			return strings.TrimSpace(v[0])
		}
		return ""
	}
	if v := first("x-api-key"); v != "" {
		return Credentials{APIKey: v}
	}
	if c, ok := fromBearer(first("authorization")); ok {
		return c
	}
	return Credentials{}
}

func fromBearer(header string) (Credentials, bool) {
	const prefix = "bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return Credentials{}, false
	}
	token := strings.TrimSpace(header[len(prefix):])
	if token == "" {
		return Credentials{}, false
	}
	if IsAPIKey(token) {
		return Credentials{APIKey: token}, true
	}
	return Credentials{SessionToken: token}, true
}

// SessionCookie builds the cookie carrying a session token.
func SessionCookie(token string, expires time.Time, secure bool) *http.Cookie {
	// Secure follows AUTH_COOKIE_SECURE or an https AUTH_PUBLIC_URL; a plain
	// http deployment cannot set it or the browser drops the cookie.
	return &http.Cookie{ // #nosec G124 -- Secure is configuration driven, HttpOnly and SameSite are set
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
	}
}

// ClearSessionCookie builds the cookie that removes the session.
func ClearSessionCookie(secure bool) *http.Cookie {
	return &http.Cookie{ // #nosec G124 -- Secure is configuration driven, HttpOnly and SameSite are set
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	}
}

// ClientIP returns the peer address, honouring X-Forwarded-For only when the
// deployment declares a trusted reverse proxy.
//
// The LAST entry of the header is used, not the first. Every mainstream
// ingress (nginx $proxy_add_x_forwarded_for, Traefik, HAProxy) appends the
// address it saw to whatever the client sent, so the last entry is the only
// one the trusted proxy wrote. Reading the first entry would let a client
// forge X-Forwarded-For and get a fresh rate limiting key on every request,
// which defeats the per (username, IP) login limit.
func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			for i := len(parts) - 1; i >= 0; i-- {
				if ip := strings.TrimSpace(parts[i]); ip != "" {
					return ip
				}
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
