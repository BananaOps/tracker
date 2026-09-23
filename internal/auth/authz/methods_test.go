package authz

import (
	"fmt"
	"strings"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"

	_ "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	_ "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	_ "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	_ "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
)

const (
	PermPublicAlias        = auth.PermPublic
	PermAuthenticatedAlias = auth.PermAuthenticated
)

func isGrantable(p auth.Permission) bool { return auth.IsValidPermission(p) }

func registeredMethods() map[string]struct{} {
	out := map[string]struct{}{}
	protoregistry.GlobalFiles.RangeFiles(func(fd protoreflect.FileDescriptor) bool {
		if !strings.HasPrefix(string(fd.Package()), "tracker.") {
			return true
		}
		services := fd.Services()
		for i := 0; i < services.Len(); i++ {
			svc := services.Get(i)
			methods := svc.Methods()
			for j := 0; j < methods.Len(); j++ {
				out[fmt.Sprintf("/%s/%s", svc.FullName(), methods.Get(j).Name())] = struct{}{}
			}
		}
		return true
	})
	return out
}

func TestEveryRPCMethodIsMapped(t *testing.T) {
	registered := registeredMethods()
	assert.NotEmpty(t, registered)
	for name := range registered {
		_, ok := MethodPermissions[name]
		assert.True(t, ok, "RPC %s has no entry in authz.MethodPermissions", name)
	}
}

func TestEveryTableEntryIsARegisteredRPC(t *testing.T) {
	registered := registeredMethods()
	for name := range MethodPermissions {
		_, ok := registered[name]
		assert.True(t, ok, "authz.MethodPermissions entry %s does not match any RPC (typo?)", name)
	}
}

func TestTableOnlyContainsGrantableOrPseudoPermissions(t *testing.T) {
	for name, perm := range MethodPermissions {
		if perm == PermPublicAlias || perm == PermAuthenticatedAlias {
			continue
		}
		assert.True(t, isGrantable(perm), "%s maps to unknown permission %q", name, perm)
	}
}
