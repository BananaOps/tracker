package sso

import (
	"errors"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
)

func defaultTestOIDCConfig() auth.OIDCConfig {
	return auth.OIDCConfig{
		GroupsClaim:   "groups",
		UsernameClaim: "preferred_username",
	}
}

func TestClaimsFromUsername(t *testing.T) {
	cases := []struct {
		name string
		raw  map[string]any
		want string
	}{
		{
			name: "preferred username",
			raw:  map[string]any{"preferred_username": "alice", "email": "a@x.io"},
			want: "alice",
		},
		{
			name: "email fallback",
			raw:  map[string]any{"email": "alice@example.com"},
			want: "alice@example.com",
		},
		{
			name: "invalid preferred falls back to email",
			raw:  map[string]any{"preferred_username": "bad name!", "email": "a@x.io"},
			want: "a@x.io",
		},
		{
			name: "none",
			raw:  map[string]any{},
			want: "",
		},
		{
			name: "preferred not a string",
			raw:  map[string]any{"preferred_username": 42, "email": "a@x.io"},
			want: "a@x.io",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := claimsFrom("https://issuer.example", "sub-1", tc.raw, defaultTestOIDCConfig())
			if err != nil {
				t.Fatalf("claimsFrom: %v", err)
			}
			if got.Username != tc.want {
				t.Fatalf("Username = %q, want %q", got.Username, tc.want)
			}
		})
	}
}

func TestClaimsFromGroups(t *testing.T) {
	cases := []struct {
		name          string
		raw           map[string]any
		cfg           *auth.OIDCConfig
		wantGroups    []string
		wantPresent   bool
		checkGroupLen bool // when true, also assert len(Groups) == len(wantGroups) for the empty-slice case
	}{
		{
			name:        "array deduplicated",
			raw:         map[string]any{"groups": []any{"a", "b", "a"}},
			wantGroups:  []string{"a", "b"},
			wantPresent: true,
		},
		{
			name:        "single string",
			raw:         map[string]any{"groups": "a"},
			wantGroups:  []string{"a"},
			wantPresent: true,
		},
		{
			name:        "mixed types filtered",
			raw:         map[string]any{"groups": []any{"a", 3, nil, ""}},
			wantGroups:  []string{"a"},
			wantPresent: true,
		},
		{
			name:        "absent",
			raw:         map[string]any{},
			wantGroups:  nil,
			wantPresent: false,
		},
		{
			name:          "empty array",
			raw:           map[string]any{"groups": []any{}},
			wantGroups:    []string{},
			wantPresent:   true,
			checkGroupLen: true,
		},
		{
			name:        "custom claim",
			cfg:         &auth.OIDCConfig{GroupsClaim: "roles", UsernameClaim: "preferred_username"},
			raw:         map[string]any{"roles": []any{"x"}},
			wantGroups:  []string{"x"},
			wantPresent: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := defaultTestOIDCConfig()
			if tc.cfg != nil {
				cfg = *tc.cfg
			}
			got, err := claimsFrom("https://issuer.example", "sub-1", tc.raw, cfg)
			if err != nil {
				t.Fatalf("claimsFrom: %v", err)
			}
			if got.GroupsPresent != tc.wantPresent {
				t.Fatalf("GroupsPresent = %v, want %v", got.GroupsPresent, tc.wantPresent)
			}
			if tc.checkGroupLen {
				if len(got.Groups) != len(tc.wantGroups) {
					t.Fatalf("Groups = %v, want length %d", got.Groups, len(tc.wantGroups))
				}
				return
			}
			if !equalStrings(got.Groups, tc.wantGroups) {
				t.Fatalf("Groups = %v, want %v", got.Groups, tc.wantGroups)
			}
		})
	}
}

func TestClaimsFromDisplayName(t *testing.T) {
	cases := []struct {
		name string
		raw  map[string]any
		want string
	}{
		{
			name: "name claim",
			raw:  map[string]any{"name": "Alice A"},
			want: "Alice A",
		},
		{
			name: "given plus family name",
			raw:  map[string]any{"given_name": "Alice", "family_name": "Example"},
			want: "Alice Example",
		},
		{
			name: "falls back to username",
			raw:  map[string]any{"preferred_username": "alice"},
			want: "alice",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := claimsFrom("https://issuer.example", "sub-1", tc.raw, defaultTestOIDCConfig())
			if err != nil {
				t.Fatalf("claimsFrom: %v", err)
			}
			if got.DisplayName != tc.want {
				t.Fatalf("DisplayName = %q, want %q", got.DisplayName, tc.want)
			}
		})
	}
}

func TestClaimsFromEmptySubject(t *testing.T) {
	_, err := claimsFrom("https://issuer.example", "", map[string]any{}, defaultTestOIDCConfig())
	if !errors.Is(err, ErrClaims) {
		t.Fatalf("err = %v, want ErrClaims", err)
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
