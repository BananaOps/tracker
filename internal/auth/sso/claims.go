// Package sso talks to an external OpenID Connect identity provider: it
// verifies id_tokens and extracts the claims Tracker keeps.
package sso

import (
	"fmt"
	"regexp"

	"github.com/bananaops/tracker/internal/auth"
)

// usernamePattern is what a claim value must match to be used as a
// username: it must start with an alphanumeric character, 2 to 64
// characters long overall.
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9@._+-]{1,63}$`)

// Claims is what Tracker keeps from a verified id_token.
type Claims struct {
	Issuer      string
	Subject     string
	Username    string // first valid of the configured claim then email, "" when none
	Email       string
	DisplayName string
	Groups      []string
	// GroupsPresent is true when the groups claim exists in the token, even
	// when it carries no usable group.
	GroupsPresent bool
}

// claimsFrom builds Claims from the raw id_token payload, using cfg to know
// which claim carries the username and the groups.
func claimsFrom(issuer, subject string, raw map[string]any, cfg auth.OIDCConfig) (Claims, error) {
	if subject == "" {
		return Claims{}, fmt.Errorf("%w: id_token has no subject", ErrClaims)
	}

	email := stringClaim(raw, "email")
	username := validUsername(stringClaim(raw, cfg.UsernameClaim))
	if username == "" {
		username = validUsername(email)
	}

	groups, present := groupsClaim(raw, cfg.GroupsClaim)

	return Claims{
		Issuer:        issuer,
		Subject:       subject,
		Username:      username,
		Email:         email,
		DisplayName:   displayName(raw, username),
		Groups:        groups,
		GroupsPresent: present,
	}, nil
}

// validUsername returns v when it matches usernamePattern, "" otherwise.
func validUsername(v string) string {
	if usernamePattern.MatchString(v) {
		return v
	}
	return ""
}

// displayName prefers the name claim, then given_name and family_name
// joined, then falls back to username.
func displayName(raw map[string]any, username string) string {
	if name := stringClaim(raw, "name"); name != "" {
		return name
	}

	given := stringClaim(raw, "given_name")
	family := stringClaim(raw, "family_name")
	switch {
	case given != "" && family != "":
		return given + " " + family
	case given != "":
		return given
	case family != "":
		return family
	}

	return username
}

// stringClaim returns raw[name] when it is a string, "" otherwise.
func stringClaim(raw map[string]any, name string) string {
	s, _ := raw[name].(string)
	return s
}

// groupsClaim reads a claim that is either a single string or an array of
// strings, deduplicating while keeping order and dropping non-string and
// empty entries. The second result is false only when the claim is absent.
func groupsClaim(raw map[string]any, name string) ([]string, bool) {
	v, ok := raw[name]
	if !ok {
		return nil, false
	}

	switch t := v.(type) {
	case string:
		if t == "" {
			return []string{}, true
		}
		return []string{t}, true
	case []any:
		seen := make(map[string]bool, len(t))
		out := make([]string, 0, len(t))
		for _, e := range t {
			s, ok := e.(string)
			if !ok || s == "" || seen[s] {
				continue
			}
			seen[s] = true
			out = append(out, s)
		}
		return out, true
	default:
		return nil, true
	}
}
