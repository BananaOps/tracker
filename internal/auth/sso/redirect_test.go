package sso

import (
	"strings"
	"testing"
)

func TestSafeRedirect(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: "/"},
		{name: "root", in: "/", want: "/"},
		{name: "simple path", in: "/locks", want: "/locks"},
		{name: "path with query and fragment", in: "/events?service=api&tab=1#top", want: "/events?service=api&tab=1#top"},
		{name: "encoded local path", in: "/%2F%2Fevil.example", want: "/%2F%2Fevil.example"},
		{name: "protocol relative", in: "//evil.example", want: "/"},
		{name: "triple slash", in: "///evil.example", want: "/"},
		{name: "backslash escape", in: "/\\evil.example", want: "/"},
		{name: "embedded backslash", in: "/a\\b", want: "/"},
		{name: "absolute url", in: "https://evil.example", want: "/"},
		{name: "no leading slash", in: "evil.example", want: "/"},
		{name: "javascript scheme", in: "javascript:alert(1)", want: "/"},
		{name: "header injection", in: "/ok\r\nSet-Cookie: x=1", want: "/"},
		{name: "tab control char", in: "/tab\there", want: "/"},
		{name: "leading space", in: " /locks", want: "/"},
		{name: "too long", in: "/" + strings.Repeat("a", 1024), want: "/"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := SafeRedirect(tc.in); got != tc.want {
				t.Fatalf("SafeRedirect(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}
