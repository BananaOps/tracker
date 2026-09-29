package sso

import (
	"net/url"
	"strings"
)

const maxRedirectLength = 1024

// SafeRedirect returns raw when it is a local absolute path, "/" otherwise.
// It is the server side twin of the web safeRedirect helper and blocks open
// redirects such as //evil.example or /\evil.example.
func SafeRedirect(raw string) string {
	if raw == "" || len(raw) > maxRedirectLength || raw[0] != '/' ||
		strings.HasPrefix(raw, "//") || strings.ContainsRune(raw, '\\') {
		return "/"
	}
	for _, r := range raw {
		if r < 0x20 || r == 0x7f {
			return "/"
		}
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "" || u.Host != "" || u.User != nil {
		return "/"
	}
	return raw
}
