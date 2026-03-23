package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
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
	if err := mux.HandlePath("GET", "/api/links", handleListLinks); err != nil {
		slog.Error("Failed to register GET /api/links", "error", err)
	}
	// POST /api/links
	if err := mux.HandlePath("POST", "/api/links", handleCreateLink); err != nil {
		slog.Error("Failed to register POST /api/links", "error", err)
	}
	// PUT /api/links/{id}
	if err := mux.HandlePath("PUT", "/api/links/{id}", handleUpdateLink); err != nil {
		slog.Error("Failed to register PUT /api/links/{id}", "error", err)
	}
	// DELETE /api/links/{id}
	if err := mux.HandlePath("DELETE", "/api/links/{id}", handleDeleteLink); err != nil {
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
	if strings.TrimSpace(item.Name) == "" || strings.TrimSpace(item.URL) == "" {
		http.Error(w, `{"error":"name and url are required"}`, http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(item.Group) == "" {
		item.Group = "Custom"
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
	updated, err := linksStore.Update(r.Context(), id, &item)
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
	if err := linksStore.Delete(r.Context(), id); err != nil {
		slog.Error("Failed to delete link", "id", id, "error", err)
		http.Error(w, `{"error":"failed to delete link"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func jsonResponse(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
	}
}
