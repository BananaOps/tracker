package auth

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAPIKey(t *testing.T) {
	k, err := GenerateAPIKey()
	require.NoError(t, err)
	assert.Regexp(t, regexp.MustCompile(`^trk_[a-z0-9]{8}_[A-Za-z0-9_-]{43}$`), k.Secret)
	assert.Len(t, k.Prefix, 8)
	assert.Equal(t, HashAPIKey(k.Secret), k.Hash)
	assert.True(t, APIKeyMatches(k.Hash, k.Secret))
	assert.False(t, APIKeyMatches(k.Hash, k.Secret+"x"))

	prefix, ok := ParseAPIKeyPrefix(k.Secret)
	assert.True(t, ok)
	assert.Equal(t, k.Prefix, prefix)

	other, err := GenerateAPIKey()
	require.NoError(t, err)
	assert.NotEqual(t, k.Secret, other.Secret)
}

func TestParseAPIKeyPrefixRejectsMalformed(t *testing.T) {
	for _, s := range []string{"", "trk_", "trk_short_abc", "trk_abcdefgh", "trk_abcdefgh_", "abc_abcdefgh_secret", "eyJhbGciOi"} {
		_, ok := ParseAPIKeyPrefix(s)
		assert.False(t, ok, s)
	}
	assert.True(t, IsAPIKey("trk_anything"))
	assert.False(t, IsAPIKey("eyJhbGciOi"))
}
