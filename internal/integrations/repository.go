package integrations

import (
	"net/url"
	"regexp"
	"strings"
)

var scpLikeRepo = regexp.MustCompile(`^[A-Za-z0-9._-]+@([A-Za-z0-9.-]+):(.+)$`)

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
			scheme, host = strings.ToLower(u.Scheme), u.Host
		default:
			return ""
		}
		path = u.Path
	}
	path = strings.TrimLeft(path, "/")
	path = strings.TrimRight(path, "/")
	path = strings.TrimSuffix(path, ".git")
	if host == "" || path == "" {
		return ""
	}
	return scheme + "://" + strings.ToLower(host) + "/" + path
}
