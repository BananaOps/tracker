package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAnonymousPrincipal(t *testing.T) {
	p := Anonymous([]Permission{PermEventRead})
	assert.False(t, p.IsAuthenticated())
	assert.True(t, p.Has(PermEventRead))
	assert.False(t, p.Has(PermEventWrite))
	assert.True(t, p.Scope.All)
	assert.Equal(t, "anonymous", p.Username)
}

func TestPrincipalContext(t *testing.T) {
	_, ok := FromContext(context.Background())
	assert.False(t, ok)

	p := Principal{Kind: KindUser, UserID: "42", Username: "alice", Permissions: NewPermissionSet(PermLockRead)}
	ctx := WithPrincipal(context.Background(), p)
	got, ok := FromContext(ctx)
	assert.True(t, ok)
	assert.Equal(t, "alice", got.Username)
	assert.True(t, got.IsAuthenticated())
}
