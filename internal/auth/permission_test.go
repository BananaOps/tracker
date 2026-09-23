package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParsePermissions(t *testing.T) {
	perms, err := ParsePermissions(" event:read, catalog:write ,, ")
	require.NoError(t, err)
	assert.Equal(t, []Permission{PermEventRead, PermCatalogWrite}, perms)

	perms, err = ParsePermissions("")
	require.NoError(t, err)
	assert.Empty(t, perms)

	_, err = ParsePermissions("event:read,bogus")
	assert.EqualError(t, err, `unknown permission "bogus"`)
}

func TestPermissionSet(t *testing.T) {
	s := NewPermissionSet(PermLockWrite, PermEventRead)
	assert.True(t, s.Has(PermEventRead))
	assert.False(t, s.Has(PermEventWrite))
	s.Add(PermEventWrite)
	assert.True(t, s.Has(PermEventWrite))
	assert.Equal(t, []Permission{PermEventRead, PermEventWrite, PermLockWrite}, s.Slice())
}

func TestAllPermissionsIsACopy(t *testing.T) {
	all := AllPermissions()
	all[0] = "tampered"
	assert.True(t, IsValidPermission(PermEventRead))
	assert.False(t, IsValidPermission(PermPublic), "pseudo permissions are not grantable")
}
