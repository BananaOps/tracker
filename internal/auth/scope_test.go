package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScope(t *testing.T) {
	all := ScopeAll()
	assert.True(t, all.Allows("anything"))

	partial := ScopeOf("api", "web")
	assert.True(t, partial.Allows("api"))
	assert.False(t, partial.Allows("batch"))
	assert.Equal(t, []string{"api", "web"}, partial.ServiceList())

	union := partial.Union(ScopeOf("batch"))
	assert.True(t, union.Allows("batch"))
	assert.False(t, union.All)

	assert.True(t, partial.Union(all).All)
	assert.False(t, ScopeOf().Allows("api"), "empty scope allows nothing")
}
