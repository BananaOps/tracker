package server

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	loginMaxFailures = 5
	loginWindow      = time.Minute
	maxAuthBodyBytes = 4096
)

// AuthHTTP serves the cookie based endpoints that cannot be gRPC methods.
type AuthHTTP struct {
	users    *store.AuthUserStore
	sessions *auth.SessionManager
	limiter  *auth.LoginLimiter
	cfg      auth.Config
	logger   *slog.Logger
}

func NewAuthHTTP(users *store.AuthUserStore, sessions *auth.SessionManager, cfg auth.Config) *AuthHTTP {
	return &AuthHTTP{
		users:    users,
		sessions: sessions,
		limiter:  auth.NewLoginLimiter(loginMaxFailures, loginWindow),
		cfg:      cfg,
		logger:   slog.Default(),
	}
}

// Register mounts the endpoints on the gateway mux.
func (h *AuthHTTP) Register(mux *runtime.ServeMux) {
	routes := []struct {
		path    string
		handler runtime.HandlerFunc
	}{
		{"/api/v1alpha1/auth/login", h.handleLogin},
		{"/api/v1alpha1/auth/logout", h.handleLogout},
		{"/api/v1alpha1/auth/password", h.handleChangePassword},
	}
	for _, r := range routes {
		if err := mux.HandlePath(http.MethodPost, r.path, r.handler); err != nil {
			h.logger.Error("Failed to register auth route", "path", r.path, "error", err)
		}
	}
}

func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, v any) error {
	return json.NewDecoder(io.LimitReader(r.Body, maxAuthBodyBytes)).Decode(v)
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHTTP) handleLogin(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	// A cross-site form can POST here (the JSON decoder does not require a
	// preflighted Content-Type), which would let a third party site probe
	// passwords and plant a session cookie in the victim's browser. Reject
	// before any password work so the check costs nothing.
	if auth.IsCrossSite(r, h.cfg.PublicURL, h.cfg.TrustProxy) {
		h.logger.Warn("auth.login", "result", "cross_site", "origin", r.Header.Get("Origin"))
		writeJSONError(w, http.StatusForbidden, "cross-site login requests are refused")
		return
	}
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil || req.Username == "" || req.Password == "" {
		writeJSONError(w, http.StatusBadRequest, "username and password are required")
		return
	}
	ip := auth.ClientIP(r, h.cfg.TrustProxy)
	limitKey := strings.ToLower(req.Username) + "|" + ip
	if h.limiter.Blocked(limitKey) {
		h.logger.Warn("auth.login", "result", "rate_limited", "username", req.Username, "ip", ip)
		authz.AuthLogins.WithLabelValues(authz.LoginMethodLocal, authz.LoginRateLimited).Inc()
		writeJSONError(w, http.StatusTooManyRequests, "too many failed attempts, retry later")
		return
	}

	fail := func(reason string) {
		h.limiter.RecordFailure(limitKey)
		h.logger.Warn("auth.login", "result", "failure", "reason", reason, "username", req.Username, "ip", ip)
		authz.AuthLogins.WithLabelValues(authz.LoginMethodLocal, authz.LoginFailure).Inc()
		writeJSONError(w, http.StatusUnauthorized, "invalid credentials")
	}

	user, err := h.users.GetByUsername(r.Context(), req.Username)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			h.logger.Error("auth.login lookup failed", "error", err)
			writeJSONError(w, http.StatusInternalServerError, "internal error")
			return
		}
		auth.DummyVerify(req.Password)
		fail("unknown_user")
		return
	}
	if user.Source != store.UserSourceLocal || user.Disabled || user.PasswordHash == "" {
		auth.DummyVerify(req.Password)
		fail("not_eligible")
		return
	}
	ok, err := auth.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil || !ok {
		fail("bad_password")
		return
	}

	h.limiter.Reset(limitKey)
	if err := h.issueSession(w, user); err != nil {
		h.logger.Error("auth.login issue session failed", "error", err)
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if err := h.users.TouchLogin(r.Context(), user.ID, time.Now().UTC()); err != nil {
		h.logger.Error("auth.login touch failed", "error", err)
	}
	h.logger.Info("auth.login", "result", "success", "username", user.Username, "ip", ip)
	authz.AuthLogins.WithLabelValues(authz.LoginMethodLocal, authz.LoginSuccess).Inc()
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHTTP) issueSession(w http.ResponseWriter, user *store.User) error {
	token, expires, err := h.sessions.Issue(user.ID.Hex(), user.SessionVersion)
	if err != nil {
		return err
	}
	http.SetCookie(w, auth.SessionCookie(token, expires, h.cfg.CookieSecure))
	return nil
}

func (h *AuthHTTP) handleLogout(w http.ResponseWriter, _ *http.Request, _ map[string]string) {
	http.SetCookie(w, auth.ClearSessionCookie(h.cfg.CookieSecure))
	w.WriteHeader(http.StatusNoContent)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *AuthHTTP) handleChangePassword(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	p, ok := auth.FromContext(r.Context())
	if !ok || p.Kind != auth.KindUser {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req changePasswordRequest
	if err := decodeJSON(r, &req); err != nil || req.CurrentPassword == "" || req.NewPassword == "" {
		writeJSONError(w, http.StatusBadRequest, "currentPassword and newPassword are required")
		return
	}
	id, err := primitive.ObjectIDFromHex(p.UserID)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	user, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if user.Source != store.UserSourceLocal {
		writeJSONError(w, http.StatusBadRequest, "password is managed by the identity provider")
		return
	}
	ok, err = auth.VerifyPassword(user.PasswordHash, req.CurrentPassword)
	if err != nil || !ok {
		h.logger.Warn("auth.password", "result", "failure", "username", user.Username)
		writeJSONError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	if err := auth.ValidatePasswordPolicy(req.NewPassword); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	user.PasswordHash = hash
	user.MustChangePassword = false
	user.SessionVersion++
	if err := h.users.Update(r.Context(), user); err != nil {
		h.logger.Error("auth.password update failed", "error", err)
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if err := h.issueSession(w, user); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	h.logger.Info("auth.password", "result", "success", "username", user.Username)
	w.WriteHeader(http.StatusNoContent)
}
