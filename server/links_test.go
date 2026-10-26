package server

import (
	"fmt"
	"net/http"
	"testing"

	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/mongo"
)

func TestValidateLink(t *testing.T) {
	for _, c := range []struct {
		url string
		ok  bool
	}{
		{"https://grafana.example.com/d/abc", true},
		{"http://intranet:8080", true},
		{"  https://example.com  ", true},
		{"javascript:alert(document.cookie)", false},
		{"JavaScript:alert(1)", false},
		{"data:text/html,<script>alert(1)</script>", false},
		{"//evil.example.com", false},
		{"grafana.example.com", false},
		{"https://", false},
	} {
		item := store.LinkItem{Name: "n", URL: c.url}
		assert.Equal(t, c.ok, validateLink(&item) == "", c.url)
	}

	item := store.LinkItem{Name: " ", URL: "https://example.com"}
	assert.NotEmpty(t, validateLink(&item), "name is required")

	item = store.LinkItem{Name: "n", URL: "https://example.com"}
	assert.Empty(t, validateLink(&item))
	assert.Equal(t, "Custom", item.Group, "the default group is applied")
}

func TestLinkErrorStatus(t *testing.T) {
	assert.Equal(t, http.StatusBadRequest, linkErrorStatus(fmt.Errorf("%w x: y", store.ErrInvalidLinkID)))
	assert.Equal(t, http.StatusNotFound, linkErrorStatus(fmt.Errorf("failed: %w", mongo.ErrNoDocuments)))
	assert.Zero(t, linkErrorStatus(fmt.Errorf("network")))
	assert.Zero(t, linkErrorStatus(nil))
}
