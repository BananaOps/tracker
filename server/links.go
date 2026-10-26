package server

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"go.mongodb.org/mongo-driver/mongo"
)

var linksStore *store.LinksStoreClient

func initLinksStore() {
	if linksStore == nil {
		linksStore = store.NewStoreLinks("links")
	}
}

// RegisterLinksHandler registers CRUD endpoints for custom links.
func RegisterLinksHandler(mux *runtime.ServeMux) {
	initLinksStore()

	// GET /api/links
	if err := mux.HandlePath("GET", "/api/links", authz.RequireHTTP(auth.PermLinksRead, handleListLinks)); err != nil {
		slog.Error("Failed to register GET /api/links", "error", err)
	}
	// POST /api/links
	if err := mux.HandlePath("POST", "/api/links", authz.RequireHTTP(auth.PermLinksWrite, handleCreateLink)); err != nil {
		slog.Error("Failed to register POST /api/links", "error", err)
	}
	// PUT /api/links/{id}
	if err := mux.HandlePath("PUT", "/api/links/{id}", authz.RequireHTTP(auth.PermLinksWrite, handleUpdateLink)); err != nil {
		slog.Error("Failed to register PUT /api/links/{id}", "error", err)
	}
	// DELETE /api/links/{id}
	if err := mux.HandlePath("DELETE", "/api/links/{id}", authz.RequireHTTP(auth.PermLinksWrite, handleDeleteLink)); err != nil {
		slog.Error("Failed to register DELETE /api/links/{id}", "error", err)
	}
}

func handleListLinks(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	items, err := linksStore.List(r.Context())
	if err != nil {
		slog.Error("Failed to list links", "error", err)
		http.Error(w, `{"error":"failed to list links"}`, http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []*store.LinkItem{}
	}
	jsonResponse(w, items)
}

func handleCreateLink(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	var item store.LinkItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if msg := validateLink(&item); msg != "" {
		http.Error(w, `{"error":"`+msg+`"}`, http.StatusBadRequest)
		return
	}
	created, err := linksStore.Create(r.Context(), &item)
	if err != nil {
		slog.Error("Failed to create link", "error", err)
		http.Error(w, `{"error":"failed to create link"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	jsonResponse(w, created)
}

func handleUpdateLink(w http.ResponseWriter, r *http.Request, params map[string]string) {
	id := params["id"]
	if id == "" {
		http.Error(w, `{"error":"missing id"}`, http.StatusBadRequest)
		return
	}
	var item store.LinkItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if msg := validateLink(&item); msg != "" {
		http.Error(w, `{"error":"`+msg+`"}`, http.StatusBadRequest)
		return
	}
	updated, err := linksStore.Update(r.Context(), id, &item)
	if code := linkErrorStatus(err); code != 0 {
		http.Error(w, `{"error":"`+http.StatusText(code)+`"}`, code)
		return
	}
	if err != nil {
		slog.Error("Failed to update link", "id", id, "error", err)
		http.Error(w, `{"error":"failed to update link"}`, http.StatusInternalServerError)
		return
	}
	jsonResponse(w, updated)
}

func handleDeleteLink(w http.ResponseWriter, r *http.Request, params map[string]string) {
	id := params["id"]
	if id == "" {
		http.Error(w, `{"error":"missing id"}`, http.StatusBadRequest)
		return
	}
	err := linksStore.Delete(r.Context(), id)
	if code := linkErrorStatus(err); code != 0 {
		http.Error(w, `{"error":"`+http.StatusText(code)+`"}`, code)
		return
	}
	if err != nil {
		slog.Error("Failed to delete link", "id", id, "error", err)
		http.Error(w, `{"error":"failed to delete link"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// validateLink checks a link before it is stored and returns the reason it is
// refused, or "". The URL is rendered as a clickable link for every user, so
// only http and https are accepted: a javascript: URL would run in the
// browser of whoever clicks it.
func validateLink(item *store.LinkItem) string {
	if strings.TrimSpace(item.Name) == "" || strings.TrimSpace(item.URL) == "" {
		return "name and url are required"
	}
	u, err := url.Parse(strings.TrimSpace(item.URL))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "url must be an absolute http or https URL"
	}
	if strings.TrimSpace(item.Group) == "" {
		item.Group = "Custom"
	}
	return ""
}

// linkErrorStatus maps the client errors of the links store to an HTTP
// status, or 0 for any other error.
func linkErrorStatus(err error) int {
	switch {
	case errors.Is(err, store.ErrInvalidLinkID):
		return http.StatusBadRequest
	case errors.Is(err, mongo.ErrNoDocuments):
		return http.StatusNotFound
	}
	return 0
}

func jsonResponse(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
	}
}
