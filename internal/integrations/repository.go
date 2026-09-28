package integrations

import (
	"net"
	"net/url"
	"regexp"
	"strings"
)

var scpLikeRepo = regexp.MustCompile(`^[A-Za-z0-9._-]+@([A-Za-z0-9.-]+):(.+)$`)

// dropDefaultPort strips an explicit port from host when it is the scheme's
// default (443 for https, 80 for http), so a catalog repository URL written
// with or without that port still normalizes to the same key. Any other
// port, or a host with none, is returned unchanged.
func dropDefaultPort(scheme, host string) string {
	h, port, err := net.SplitHostPort(host)
	if err != nil {
		return host
	}
	if (scheme == "https" && port == "443") || (scheme == "http" && port == "80") {
		return h
	}
	return host
}

// NormalizeRepoURL turns the SSH and HTTP forms of a repository URL into
// https://host/path: scheme and host lower case, path kept as is, trailing
// slashes then the .git suffix removed, credentials dropped. It returns ""
// for anything it cannot parse, which then matches nothing.
func NormalizeRepoURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var scheme, host, path string
	if m := scpLikeRepo.FindStringSubmatch(raw); m != nil && !strings.Contains(raw, "://") {
		scheme, host, path = "https", m[1], m[2]
	} else {
		u, err := url.Parse(raw)
		if err != nil || u.Host == "" {
			return ""
		}
		switch strings.ToLower(u.Scheme) {
		case "ssh", "git+ssh":
			scheme, host = "https", u.Hostname()
		case "http", "https":
			scheme, host = strings.ToLower(u.Scheme), dropDefaultPort(strings.ToLower(u.Scheme), u.Host)
		default:
			return ""
		}
		path = u.Path
	}
	path = strings.TrimLeft(path, "/")
	path = strings.TrimRight(path, "/")
	if len(path) >= 4 && strings.EqualFold(path[len(path)-4:], ".git") {
		path = path[:len(path)-4]
	}
	if host == "" || path == "" {
		return ""
	}
	return scheme + "://" + strings.ToLower(host) + "/" + path
}
