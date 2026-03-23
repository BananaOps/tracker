package server

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"gopkg.in/yaml.v3"
)

// HomerLink represents a quick link from Homer's top-level links section
type HomerLink struct {
	Name   string `yaml:"name" json:"name"`
	URL    string `yaml:"url" json:"url"`
	Icon   string `yaml:"icon,omitempty" json:"icon,omitempty"`
	Target string `yaml:"target,omitempty" json:"target,omitempty"`
}

// HomerServiceItem represents a single item inside a Homer service group
type HomerServiceItem struct {
	Name     string `yaml:"name" json:"name"`
	URL      string `yaml:"url" json:"url"`
	Subtitle string `yaml:"subtitle,omitempty" json:"subtitle,omitempty"`
	Logo     string `yaml:"logo,omitempty" json:"logo,omitempty"`
	Icon     string `yaml:"icon,omitempty" json:"icon,omitempty"`
	Tag      string `yaml:"tag,omitempty" json:"tag,omitempty"`
	Keywords string `yaml:"keywords,omitempty" json:"keywords,omitempty"`
	Target   string `yaml:"target,omitempty" json:"target,omitempty"`
}

// HomerServiceGroup represents a group of services in Homer
type HomerServiceGroup struct {
	Name  string             `yaml:"name" json:"name"`
	Icon  string             `yaml:"icon,omitempty" json:"icon,omitempty"`
	Items []HomerServiceItem `yaml:"items" json:"items"`
}

// HomerConfig is the parsed Homer config.yml structure
type HomerConfig struct {
	Links    []HomerLink         `yaml:"links"`
	Services []HomerServiceGroup `yaml:"services"`
}

// HomerLinksResponse is what we return to the frontend
type HomerLinksResponse struct {
	Links    []HomerLink         `json:"links"`
	Services []HomerServiceGroup `json:"services"`
}

var homerHTTPClient = &http.Client{Timeout: 10 * time.Second}

// FetchHomerLinks fetches and parses a Homer dashboard config.yml
func FetchHomerLinks(homerURL string) (*HomerLinksResponse, error) {
	configURL := fmt.Sprintf("%s/assets/config.yml", homerURL)

	resp, err := homerHTTPClient.Get(configURL) //nolint:noctx
	if err != nil {
		return nil, fmt.Errorf("failed to fetch homer config from %s: %w", configURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("homer config returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read homer config body: %w", err)
	}

	var cfg HomerConfig
	if err := yaml.Unmarshal(body, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse homer config YAML: %w", err)
	}

	return &HomerLinksResponse{
		Links:    cfg.Links,
		Services: cfg.Services,
	}, nil
}

// RegisterHomerHandler registers the /api/homer-links endpoint on the given mux.
// No-op if homerURL is empty.
func RegisterHomerHandler(mux *runtime.ServeMux, homerURL string) {
	if homerURL == "" {
		return
	}

	err := mux.HandlePath("GET", "/api/homer-links", func(w http.ResponseWriter, r *http.Request, _ map[string]string) {
		result, fetchErr := FetchHomerLinks(homerURL)
		if fetchErr != nil {
			slog.Error("Failed to fetch Homer links", "error", fetchErr)
			http.Error(w, `{"error":"failed to fetch homer links"}`, http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=60")
		if encErr := json.NewEncoder(w).Encode(result); encErr != nil {
			slog.Error("Failed to encode homer links response", "error", encErr)
		}
	})
	if err != nil {
		slog.Error("Failed to register /api/homer-links handler", "error", err)
	}
}
