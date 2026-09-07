// Package auth contains the transport-agnostic building blocks of Tracker
// authentication: permissions, principals, passwords, API keys and sessions.
package auth

import (
	"fmt"
	"sort"
	"strings"
)

// Permission is a right granted to a team, formatted as "domain:action".
type Permission string

const (
	PermEventRead    Permission = "event:read"
	PermEventWrite   Permission = "event:write"
	PermCatalogRead  Permission = "catalog:read"
	PermCatalogWrite Permission = "catalog:write"
	PermLockRead     Permission = "lock:read"
	PermLockWrite    Permission = "lock:write"
	PermLinksRead    Permission = "links:read"
	PermLinksWrite   Permission = "links:write"
	PermAccessManage Permission = "access:manage"

	// PermPublic and PermAuthenticated are pseudo permissions used only in the
	// authorization table. They can never be granted to a team.
	PermPublic        Permission = "public"
	PermAuthenticated Permission = "authenticated"
)

var allPermissions = []Permission{
	PermEventRead, PermEventWrite,
	PermCatalogRead, PermCatalogWrite,
	PermLockRead, PermLockWrite,
	PermLinksRead, PermLinksWrite,
	PermAccessManage,
}

// AllPermissions returns a copy of every grantable permission.
func AllPermissions() []Permission {
	out := make([]Permission, len(allPermissions))
	copy(out, allPermissions)
	return out
}

// IsValidPermission reports whether p is a grantable permission.
func IsValidPermission(p Permission) bool {
	for _, known := range allPermissions {
		if known == p {
			return true
		}
	}
	return false
}

// ParsePermissions parses a comma separated list such as "event:read,lock:write".
// Blank items are ignored. An unknown permission is an error.
func ParsePermissions(raw string) ([]Permission, error) {
	out := []Permission{}
	for _, part := range strings.Split(raw, ",") {
		p := Permission(strings.TrimSpace(part))
		if p == "" {
			continue
		}
		if !IsValidPermission(p) {
			return nil, fmt.Errorf("unknown permission %q", p)
		}
		out = append(out, p)
	}
	return out, nil
}

// PermissionSet is an unordered set of permissions.
type PermissionSet map[Permission]struct{}

// NewPermissionSet builds a set from the given permissions.
func NewPermissionSet(perms ...Permission) PermissionSet {
	s := PermissionSet{}
	s.Add(perms...)
	return s
}

// Has reports whether p is in the set.
func (s PermissionSet) Has(p Permission) bool {
	_, ok := s[p]
	return ok
}

// Add inserts permissions into the set.
func (s PermissionSet) Add(perms ...Permission) {
	for _, p := range perms {
		s[p] = struct{}{}
	}
}

// Slice returns the permissions sorted alphabetically.
func (s PermissionSet) Slice() []Permission {
	out := make([]Permission, 0, len(s))
	for p := range s {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}
