package store

import (
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
)

func TestServiceFilter(t *testing.T) {
	all := ServiceFilter(auth.ScopeAll(), "service")
	assert.NotNil(t, all)
	assert.Len(t, all, 0)

	assert.Equal(t,
		bson.D{{Key: "attributes.service", Value: bson.D{{Key: "$in", Value: []string{"a", "b"}}}}},
		ServiceFilter(auth.ScopeOf("b", "a"), "attributes.service"))

	// An empty scope must produce a non-nil empty slice: "$in: null" is rejected by MongoDB.
	want := bson.D{{Key: "name", Value: bson.D{{Key: "$in", Value: []string{}}}}}
	assert.Equal(t, want, ServiceFilter(auth.ScopeOf(), "name"))
	assert.Equal(t, want, ServiceFilter(auth.Scope{}, "name"))
}
