package integrations

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeRepoURL(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"scp-like uppercase host", "git@GitLab.Example.com:team/payments.git", "https://gitlab.example.com/team/payments"},
		{"ssh scheme with port", "ssh://git@gitlab.example.com:2222/team/payments.git", "https://gitlab.example.com/team/payments"},
		{"https trailing slash", "https://GitLab.Example.com/Team/Payments/", "https://gitlab.example.com/Team/Payments"},
		{"https git suffix and trailing slash", "https://gitlab.example.com/team/payments.git/", "https://gitlab.example.com/team/payments"},
		{"uppercase scheme", "HTTPS://gitlab.example.com/team/payments", "https://gitlab.example.com/team/payments"},
		{"credentials dropped", "https://oauth2:tok@gitlab.example.com/team/payments.git", "https://gitlab.example.com/team/payments"},
		{"custom port kept", "https://gitlab.example.com:8443/team/payments", "https://gitlab.example.com:8443/team/payments"},
		{"http scheme kept", "http://gitlab.local/team/payments", "http://gitlab.local/team/payments"},
		{"scp-like nested path with whitespace", "  git@host:group/sub/proj  ", "https://host/group/sub/proj"},
		{"empty", "", ""},
		{"not a url", "not a url", ""},
		{"unsupported scheme", "ftp://host/x", ""},
		{"no path", "https://gitlab.example.com", ""},
		{"root path only", "https://gitlab.example.com/", ""},
		{"explicit default https port dropped", "https://gitlab.example.com:443/team/payments", "https://gitlab.example.com/team/payments"},
		{"explicit default http port dropped", "http://gitlab.local:80/team/payments", "http://gitlab.local/team/payments"},
		{"non-default https port on http scheme kept", "http://gitlab.local:443/team/payments", "http://gitlab.local:443/team/payments"},
		{"uppercase git suffix", "https://gitlab.example.com/team/payments.GIT", "https://gitlab.example.com/team/payments"},
		{"mixed case git suffix", "https://gitlab.example.com/team/payments.Git", "https://gitlab.example.com/team/payments"},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, NormalizeRepoURL(tt.in))
		})
	}
}
