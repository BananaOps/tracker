package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery")
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=2$"))

	ok, err := VerifyPassword(hash, "correct horse battery")
	require.NoError(t, err)
	assert.True(t, ok)

	ok, err = VerifyPassword(hash, "wrong horse battery!")
	require.NoError(t, err)
	assert.False(t, ok)

	other, err := HashPassword("correct horse battery")
	require.NoError(t, err)
	assert.NotEqual(t, hash, other, "salt must be random")
}

func TestPasswordPolicy(t *testing.T) {
	assert.ErrorIs(t, ValidatePasswordPolicy("short"), ErrPasswordPolicy)
	assert.ErrorIs(t, ValidatePasswordPolicy(strings.Repeat("x", 129)), ErrPasswordPolicy)
	assert.NoError(t, ValidatePasswordPolicy("exactly12chr"))
	_, err := HashPassword("short")
	assert.ErrorIs(t, err, ErrPasswordPolicy)
}

func TestVerifyPasswordRejectsGarbage(t *testing.T) {
	_, err := VerifyPassword("not-a-phc-string", "whatever-password")
	assert.Error(t, err)
	_, err = VerifyPassword("$bcrypt$foo", "whatever-password")
	assert.Error(t, err)
}

func TestDummyVerifyDoesNotPanic(t *testing.T) {
	DummyVerify("anything")
}
