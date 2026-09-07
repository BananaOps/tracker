package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsCrossSite(t *testing.T) {
	cases := []struct {
		name       string
		secFetch   string
		origin     string
		forwarded  string
		host       string
		publicURL  string
		trustProxy bool
		want       bool
	}{
		{name: "no header at all is a non browser client", want: false},
		{name: "sec-fetch-site cross-site", secFetch: "cross-site", want: true},
		{name: "sec-fetch-site same-origin", secFetch: "same-origin", want: false},
		{name: "sec-fetch-site same-site", secFetch: "same-site", want: false},
		{name: "sec-fetch-site none", secFetch: "none", want: false},
		{name: "sec-fetch-site wins over a matching origin", secFetch: "cross-site", origin: "http://example.com", host: "example.com", want: true},
		{name: "unknown sec-fetch-site value fails closed", secFetch: "future-value", want: true},
		{
			name: "origin matching the public url", origin: "https://tracker.example.com",
			publicURL: "https://tracker.example.com", host: "internal:8080", want: false,
		},
		{
			name: "origin not matching the public url", origin: "https://evil.example.net",
			publicURL: "https://tracker.example.com", host: "internal:8080", want: true,
		},
		{
			name: "public url with a trailing slash still matches", origin: "https://tracker.example.com",
			publicURL: "https://tracker.example.com/", host: "internal:8080", want: false,
		},
		{name: "origin matching the request host", origin: "http://example.com:8080", host: "example.com:8080", want: false},
		{name: "origin not matching the request host", origin: "http://evil.example.net", host: "example.com:8080", want: true},
		{name: "origin null is cross-site", origin: "null", host: "example.com", want: true},
		{
			name: "forwarded proto is honoured behind a trusted proxy", origin: "https://example.com",
			forwarded: "https", host: "example.com", trustProxy: true, want: false,
		},
		{
			name: "forwarded proto is ignored without a trusted proxy", origin: "https://example.com",
			forwarded: "https", host: "example.com", want: true,
		},

		// An explicit default port means the same origin as no port at all.
		{
			name: "explicit 443 in the public url matches a bare origin", origin: "https://tracker.example.com",
			publicURL: "https://tracker.example.com:443", host: "internal:8080", want: false,
		},
		{
			name: "explicit 443 in the origin matches a bare public url", origin: "https://tracker.example.com:443",
			publicURL: "https://tracker.example.com", host: "internal:8080", want: false,
		},
		{
			name: "explicit 80 in the origin matches a bare host", origin: "http://example.com:80",
			host: "example.com", want: false,
		},
		{
			name: "explicit 80 in the host matches a bare origin", origin: "http://example.com",
			host: "example.com:80", want: false,
		},
		{
			name: "a non default port still has to match", origin: "https://tracker.example.com:8443",
			publicURL: "https://tracker.example.com", host: "internal:8080", want: true,
		},
		{
			name: "443 on http is not a default port", origin: "http://example.com:443",
			host: "example.com", want: true,
		},
		{
			name: "a port ending in 80 is not the default port", origin: "http://example.com:8080",
			host: "example.com", want: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/api/v1alpha1/unlock/1", nil)
			if tc.host != "" {
				r.Host = tc.host
			}
			if tc.secFetch != "" {
				r.Header.Set("Sec-Fetch-Site", tc.secFetch)
			}
			if tc.origin != "" {
				r.Header.Set("Origin", tc.origin)
			}
			if tc.forwarded != "" {
				r.Header.Set("X-Forwarded-Proto", tc.forwarded)
			}
			assert.Equal(t, tc.want, IsCrossSite(r, tc.publicURL, tc.trustProxy))
		})
	}
}
