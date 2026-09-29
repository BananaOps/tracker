package server

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"time"
	"unicode/utf8"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/bananaops/tracker/internal/auth/identity"
	"github.com/bananaops/tracker/internal/auth/sso"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"golang.org/x/oauth2"
)

// Error codes carried by the /login?error= redirect. They are constants: a
// value received from the identity provider never reaches the redirect.
const (
	oidcErrDenied      = "oidc_denied"
	oidcErrState       = "oidc_state"
	oidcErrFailed      = "oidc_failed"
	oidcErrUnavailable = "oidc_unavailable"

	oidcExchangeTimeout = 15 * time.Second

	maxIdPErrorLength            = 64
	maxIdPErrorDescriptionLength = 200

	msgNotProvisioned = "Your identity provider account is not registered in Tracker. Ask a Tracker administrator for access."
	msgUserDisabled   = "Your Tracker account is disabled. Ask a Tracker administrator."
)

const oidcRefusalPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sign-in refused</title></head>
<body><h1>Sign-in refused</h1><p>%s</p><p><a href="/login">Back to sign in</a></p></body></html>
`

var errTransactionMissing = errors.New("oidc transaction cookie missing")

// OIDCHTTP serves the OpenID Connect login and callback routes.
type OIDCHTTP struct {
	users    *store.AuthUserStore
	teams    *store.AuthTeamStore
	sessions *auth.SessionManager
	provider sso.Provider
	codec    *sso.TransactionCodec
	cfg      auth.Config
	logger   *slog.Logger
	now      func() time.Time
}

func NewOIDCHTTP(users *store.AuthUserStore, teams *store.AuthTeamStore, sessions *auth.SessionManager, provider sso.Provider, codec *sso.TransactionCodec, cfg auth.Config) *OIDCHTTP {
	return &OIDCHTTP{
		users:    users,
		teams:    teams,
		sessions: sessions,
		provider: provider,
		codec:    codec,
		cfg:      cfg,
		logger:   slog.Default(),
		now:      time.Now,
	}
}

// Register mounts GET login and callback. Call it only when cfg.OIDC.Enabled().
func (h *OIDCHTTP) Register(mux *runtime.ServeMux) {
	routes := []struct {
		path    string
		handler runtime.HandlerFunc
	}{
		{auth.OIDCLoginPath, h.handleLogin},
		{auth.OIDCCallbackPath, h.handleCallback},
	}
	for _, r := range routes {
		if err := mux.HandlePath(http.MethodGet, r.path, authz.RequireHTTP(auth.PermPublic, r.handler)); err != nil {
			h.logger.Error("Failed to register OIDC route", "path", r.path, "error", err)
		}
	}
}

func (h *OIDCHTTP) count(result string) {
	authz.AuthLogins.WithLabelValues(authz.LoginMethodOIDC, result).Inc()
}

func (h *OIDCHTTP) handleLogin(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	w.Header().Set("Cache-Control", "no-store")

	tx, err := sso.NewTransaction(r.URL.Query().Get("redirect"), h.now())
	if err != nil {
		h.logger.Error("auth.login", "method", "oidc", "reason", "transaction_failed", "error", err)
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	target, err := h.provider.AuthCodeURL(r.Context(), tx.State, tx.Nonce, tx.Verifier)
	if err != nil {
		h.logger.Error("auth.login", "method", "oidc", "result", "failure", "reason", "provider_unavailable", "ip", auth.ClientIP(r, h.cfg.TrustProxy))
		h.count(authz.LoginFailure)
		h.redirectError(w, r, oidcErrUnavailable)
		return
	}
	value, err := h.codec.Encode(tx)
	if errors.Is(err, sso.ErrTransactionTooLarge) {
		// The redirect is what made it too big: drop it rather than fail.
		tx.Redirect = "/"
		value, err = h.codec.Encode(tx)
	}
	if err != nil {
		h.logger.Error("auth.login", "method", "oidc", "reason", "transaction_encode_failed", "error", err)
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	http.SetCookie(w, sso.TransactionCookie(value, h.cfg.CookieSecure))
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *OIDCHTTP) handleCallback(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	http.SetCookie(w, sso.ClearTransactionCookie(h.cfg.CookieSecure))

	ip := auth.ClientIP(r, h.cfg.TrustProxy)
	q := r.URL.Query()
	tx, txErr := h.readTransaction(r)

	if q.Get("error") != "" {
		h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "idp_error",
			"idp_error", truncate(q.Get("error"), maxIdPErrorLength),
			"idp_error_description", truncate(q.Get("error_description"), maxIdPErrorDescriptionLength),
			"ip", ip)
		if txErr == nil {
			h.count(authz.LoginFailure)
		}
		h.redirectError(w, r, oidcErrDenied)
		return
	}
	if txErr != nil {
		reason := "transaction_invalid"
		switch {
		case errors.Is(txErr, errTransactionMissing):
			reason = "transaction_missing"
		case errors.Is(txErr, sso.ErrTransactionExpired):
			reason = "transaction_expired"
		}
		h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", reason, "ip", ip)
		h.redirectError(w, r, oidcErrState)
		return
	}
	if subtle.ConstantTimeCompare([]byte(q.Get("state")), []byte(tx.State)) != 1 {
		h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "state_mismatch", "ip", ip)
		h.count(authz.LoginFailure)
		h.redirectError(w, r, oidcErrState)
		return
	}
	code := q.Get("code")
	if code == "" {
		h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "code_missing", "ip", ip)
		h.count(authz.LoginFailure)
		h.redirectError(w, r, oidcErrFailed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), oidcExchangeTimeout)
	defer cancel()
	claims, err := h.provider.Exchange(ctx, code, tx.Verifier, tx.Nonce)
	if err != nil {
		h.logExchangeError(err, ip)
		h.count(authz.LoginFailure)
		if errors.Is(err, sso.ErrUnavailable) {
			h.redirectError(w, r, oidcErrUnavailable)
			return
		}
		h.redirectError(w, r, oidcErrFailed)
		return
	}

	// Refuse before any write: resolving the user would create it or refresh
	// its profile and last login although the sync is then going to refuse.
	if h.cfg.OIDC.TeamSync && !claims.GroupsPresent {
		// Read-only lookup: the rule needs the memberships the user holds now.
		var existing *store.User
		found, err := h.users.GetByOIDCIdentity(ctx, claims.Issuer, claims.Subject)
		switch {
		case err == nil:
			existing = found
		case !errors.Is(err, store.ErrNotFound):
			h.logger.Error("auth.login", "method", "oidc", "result", "failure", "reason", "resolve_failed",
				"issuer", claims.Issuer, "subject", claims.Subject, "ip", ip, "error", err)
			h.count(authz.LoginFailure)
			h.redirectError(w, r, oidcErrFailed)
			return
		}
		if err := identity.CheckOIDCGroupsClaim(ctx, h.teams, existing, claims.GroupsPresent); err != nil {
			h.count(authz.LoginFailure)
			h.logSyncFailure(err, claims, ip)
			h.redirectError(w, r, oidcErrFailed)
			return
		}
	}

	// Only issuer and subject identify a user; the email claim is data, never
	// a key to find or link an account.
	user, created, err := identity.ResolveOIDCUser(ctx, h.users, identity.OIDCIdentity{
		Issuer:      claims.Issuer,
		Subject:     claims.Subject,
		Username:    claims.Username,
		Email:       claims.Email,
		DisplayName: claims.DisplayName,
	}, h.cfg.OIDC.UserProvisioning, h.now().UTC())
	if err != nil {
		h.count(authz.LoginFailure)
		switch {
		case errors.Is(err, identity.ErrOIDCNotProvisioned):
			h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "not_provisioned",
				"issuer", claims.Issuer, "subject", claims.Subject, "ip", ip)
			writeOIDCRefusal(w, msgNotProvisioned)
		case errors.Is(err, identity.ErrOIDCUserDisabled):
			h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "user_disabled",
				"issuer", claims.Issuer, "subject", claims.Subject, "ip", ip)
			writeOIDCRefusal(w, msgUserDisabled)
		case errors.Is(err, identity.ErrOIDCNoUsername), errors.Is(err, identity.ErrOIDCUsernameExhausted):
			h.logger.Warn("auth.login", "method", "oidc", "result", "failure", "reason", "username_unusable",
				"issuer", claims.Issuer, "subject", claims.Subject, "ip", ip)
			h.redirectError(w, r, oidcErrFailed)
		default:
			// Includes ErrOIDCInvalidIdentity and ErrOIDCNotOIDCUser: neither
			// should happen with a verified token, so they are errors.
			h.logger.Error("auth.login", "method", "oidc", "result", "failure", "reason", "resolve_failed",
				"issuer", claims.Issuer, "subject", claims.Subject, "ip", ip, "error", err)
			h.redirectError(w, r, oidcErrFailed)
		}
		return
	}

	var sync identity.TeamSyncResult
	if h.cfg.OIDC.TeamSync {
		sync, err = identity.SyncOIDCTeams(ctx, h.users, h.teams, user, claims.Groups, claims.GroupsPresent)
		if err != nil {
			h.count(authz.LoginFailure)
			h.logSyncFailure(err, claims, ip)
			h.redirectError(w, r, oidcErrFailed)
			return
		}
		if len(sync.Kept) > 0 {
			h.logger.Error("kept the last enabled administrator in Administrators",
				"event", "auth.oidc.sync", "username", user.Username, "teams", sync.Kept)
		}
	}

	if err := setSessionCookie(w, h.sessions, h.cfg.CookieSecure, user); err != nil {
		h.logger.Error("auth.login", "method", "oidc", "result", "failure", "reason", "session_failed", "username", user.Username, "error", err)
		h.count(authz.LoginFailure)
		h.redirectError(w, r, oidcErrFailed)
		return
	}
	h.logger.Info("auth.login", "method", "oidc", "result", "success", "username", user.Username,
		"created", created, "teams_added", sync.Added, "teams_removed", sync.Removed, "ip", ip)
	h.count(authz.LoginSuccess)
	http.Redirect(w, r, sso.SafeRedirect(tx.Redirect), http.StatusSeeOther)
}

// logSyncFailure logs a refused or failed team sync. The username is the one
// asserted by the token: the user may not exist yet.
func (h *OIDCHTTP) logSyncFailure(err error, claims sso.Claims, ip string) {
	if errors.Is(err, identity.ErrOIDCGroupsClaimMissing) {
		h.logger.Error("auth.oidc.sync", "method", "oidc", "result", "failure", "reason", "groups_claim_missing",
			"claim", h.cfg.OIDC.GroupsClaim, "username", claims.Username, "ip", ip)
		return
	}
	h.logger.Error("auth.oidc.sync", "method", "oidc", "result", "failure", "reason", "sync_failed",
		"username", claims.Username, "ip", ip, "error", err)
}

// readTransaction decrypts the transaction cookie and re-applies SafeRedirect
// to the stored redirect, whatever the codec accepted.
func (h *OIDCHTTP) readTransaction(r *http.Request) (sso.Transaction, error) {
	c, err := r.Cookie(sso.TransactionCookieName)
	if err != nil {
		return sso.Transaction{}, errTransactionMissing
	}
	tx, err := h.codec.Decode(c.Value)
	if err != nil {
		return sso.Transaction{}, fmt.Errorf("decode oidc transaction: %w", err)
	}
	tx.Redirect = sso.SafeRedirect(tx.Redirect)
	return tx, nil
}

// logExchangeError logs why the code exchange failed without ever printing
// the error text of a token endpoint failure: oauth2 embeds the raw response
// body in it, which may be HTML or carry tokens.
func (h *OIDCHTTP) logExchangeError(err error, ip string) {
	attrs := []any{"method", "oidc", "result", "failure", "ip", ip}
	var re *oauth2.RetrieveError
	switch {
	case errors.As(err, &re):
		attrs = append(attrs, "reason", "exchange_failed",
			"idp_error", truncate(re.ErrorCode, maxIdPErrorLength),
			"idp_error_description", truncate(re.ErrorDescription, maxIdPErrorDescriptionLength))
		if re.Response != nil {
			attrs = append(attrs, "status", re.Response.StatusCode)
		}
	case errors.Is(err, sso.ErrUnavailable):
		attrs = append(attrs, "reason", "provider_unavailable")
	case errors.Is(err, sso.ErrIDToken):
		attrs = append(attrs, "reason", "id_token_verification_failed")
	case errors.Is(err, sso.ErrClaims):
		attrs = append(attrs, "reason", "claims_unusable")
	default:
		attrs = append(attrs, "reason", "exchange_failed")
	}
	h.logger.Warn("auth.login", attrs...)
}

func (h *OIDCHTTP) redirectError(w http.ResponseWriter, r *http.Request, code string) {
	http.Redirect(w, r, "/login?error="+code, http.StatusSeeOther)
}

func writeOIDCRefusal(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Security-Policy", "default-src 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusForbidden)
	_, _ = fmt.Fprintf(w, oidcRefusalPage, html.EscapeString(message))
}

// truncate cuts s to at most n bytes on a rune boundary.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}
