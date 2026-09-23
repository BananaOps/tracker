package auth

import "sort"

// Scope restricts a principal to a set of catalog services.
// All=true means every service, including ones that do not exist yet.
type Scope struct {
	All      bool
	Services map[string]struct{}
}

// ScopeAll returns an unrestricted scope.
func ScopeAll() Scope {
	return Scope{All: true, Services: map[string]struct{}{}}
}

// ScopeOf returns a scope restricted to the given services.
func ScopeOf(services ...string) Scope {
	s := Scope{Services: make(map[string]struct{}, len(services))}
	for _, svc := range services {
		s.Services[svc] = struct{}{}
	}
	return s
}

// Allows reports whether the service is inside the scope.
func (s Scope) Allows(service string) bool {
	if s.All {
		return true
	}
	_, ok := s.Services[service]
	return ok
}

// Union returns a scope allowing everything s or o allows.
func (s Scope) Union(o Scope) Scope {
	if s.All || o.All {
		return ScopeAll()
	}
	out := ScopeOf()
	for svc := range s.Services {
		out.Services[svc] = struct{}{}
	}
	for svc := range o.Services {
		out.Services[svc] = struct{}{}
	}
	return out
}

// ServiceList returns the explicitly allowed services, sorted.
func (s Scope) ServiceList() []string {
	out := make([]string, 0, len(s.Services))
	for svc := range s.Services {
		out = append(out, svc)
	}
	sort.Strings(out)
	return out
}
