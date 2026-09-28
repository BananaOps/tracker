package integrations

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

// Headers and event name for GitLab "Deployment Hook" webhooks.
const (
	HeaderGitLabEvent    = "X-Gitlab-Event"
	HeaderGitLabInstance = "X-Gitlab-Instance"
	GitLabDeploymentHook = "Deployment Hook"
)

// gitlabDeployment is the subset of a GitLab "Deployment Hook" payload
// ParseGitLab needs.
type gitlabDeployment struct {
	ObjectKind             string `json:"object_kind"`
	Status                 string `json:"status"`
	StatusChangedAt        string `json:"status_changed_at"`
	DeploymentID           int64  `json:"deployment_id"`
	DeployableURL          string `json:"deployable_url"`
	Environment            string `json:"environment"`
	EnvironmentTier        string `json:"environment_tier"`
	EnvironmentExternalURL string `json:"environment_external_url"`
	ShortSHA               string `json:"short_sha"`
	CommitURL              string `json:"commit_url"`
	CommitTitle            string `json:"commit_title"`
	User                   struct {
		Username string `json:"username"`
	} `json:"user"`
	Project struct {
		WebURL            string `json:"web_url"`
		GitHTTPURL        string `json:"git_http_url"`
		PathWithNamespace string `json:"path_with_namespace"`
	} `json:"project"`
}

// gitlabStatus maps a GitLab deployment status to a Tracker status and its
// optional comment.
type gitlabStatus struct {
	status  eventv1.Status
	comment string
}

var gitlabStatuses = map[string]gitlabStatus{
	"running":  {status: eventv1.Status_start},
	"success":  {status: eventv1.Status_success},
	"failed":   {status: eventv1.Status_failure},
	"canceled": {status: eventv1.Status_warning, comment: "Deployment canceled"},
	"blocked":  {status: eventv1.Status_waiting_approval},
	"rejected": {status: eventv1.Status_close},
}

// gitlabTimeLayouts are tried in order to parse status_changed_at. RFC3339
// also accepts the fractional seconds GitLab documents
// (2021-04-28T21:50:00.000+02:00), since Go parses an optional fractional
// second even when the layout does not include one.
var gitlabTimeLayouts = []string{time.RFC3339, "2006-01-02 15:04:05 -0700", "2006-01-02 15:04:05 MST"}

// ParseGitLab maps a GitLab "Deployment Hook" payload to an Observation.
// eventHeader is the X-Gitlab-Event header value. It returns *IgnoredError
// for a notification Tracker does not record, and *InvalidError for a
// malformed or incomplete payload.
func ParseGitLab(eventHeader string, body []byte, cfg Config) (Observation, error) {
	if strings.TrimSpace(eventHeader) != GitLabDeploymentHook {
		return Observation{}, &IgnoredError{Reason: ReasonUnsupportedEvent}
	}

	var p gitlabDeployment
	if err := json.Unmarshal(body, &p); err != nil {
		return Observation{}, &InvalidError{Reason: "body is not valid JSON"}
	}

	if p.ObjectKind != "deployment" {
		return Observation{}, &IgnoredError{Reason: ReasonUnsupportedObjectKind}
	}

	if p.DeploymentID <= 0 {
		return Observation{}, &InvalidError{Reason: "missing field deployment_id"}
	}
	if strings.TrimSpace(p.Status) == "" {
		return Observation{}, &InvalidError{Reason: "missing field status"}
	}
	if strings.TrimSpace(p.StatusChangedAt) == "" {
		return Observation{}, &InvalidError{Reason: "missing field status_changed_at"}
	}
	if strings.TrimSpace(p.Environment) == "" {
		return Observation{}, &InvalidError{Reason: "missing field environment"}
	}
	pathWithNamespace := strings.TrimSpace(p.Project.PathWithNamespace)
	if pathWithNamespace == "" {
		return Observation{}, &InvalidError{Reason: "missing field project.path_with_namespace"}
	}

	at, err := parseGitLabTime(p.StatusChangedAt)
	if err != nil {
		return Observation{}, &InvalidError{Reason: "status_changed_at is not a valid date"}
	}

	host := gitlabWebURLHost(p.Project.WebURL)
	if host == "" {
		return Observation{}, &InvalidError{Reason: "missing field project.web_url"}
	}

	environment, ok := lookupGitLabEnvironment(cfg, p.Environment, p.EnvironmentTier)
	if !ok {
		return Observation{}, &IgnoredError{Reason: ReasonUnmappedEnvironment}
	}

	if p.Status == "approved" {
		return Observation{}, &IgnoredError{Reason: ReasonApprovalIgnored}
	}
	status, ok := gitlabStatuses[p.Status]
	if !ok {
		return Observation{}, &IgnoredError{Reason: ReasonUnsupportedStatus}
	}

	owner := strings.TrimSpace(p.User.Username)
	user := "gitlab:" + owner
	if owner == "" {
		owner = "gitlab"
		user = "gitlab:unknown"
	}

	return Observation{
		Key:           fmt.Sprintf("gitlab:%s:%d", host, p.DeploymentID),
		Source:        SourceGitLab,
		Status:        status.status,
		At:            at,
		Terminal:      IsTerminal(status.status),
		Environment:   environment,
		Service:       gitlabServiceHint(p),
		ShortRevision: strings.TrimSpace(p.ShortSHA),
		Message:       gitlabMessage(p),
		Owner:         owner,
		User:          user,
		Comment:       status.comment,
	}, nil
}

// parseGitLabTime parses v with the first layout in gitlabTimeLayouts that
// matches, and returns it in UTC.
func parseGitLabTime(v string) (time.Time, error) {
	for _, layout := range gitlabTimeLayouts {
		if t, err := time.Parse(layout, v); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("status_changed_at is not a valid date")
}

// gitlabWebURLHost returns the lower-cased host of project.web_url, the
// signed field the correlation key is derived from. X-Gitlab-Instance is not
// part of the Standard Webhooks signed content (webhook-id.webhook-
// timestamp.body) and is deliberately not consulted here: keying on it would
// let a captured, still-valid signed delivery be replayed with a different
// instance header to mint a new correlation key, defeating the replay
// window's idempotency guarantee.
func gitlabWebURLHost(webURL string) string {
	webURL = strings.TrimSpace(webURL)
	if webURL == "" {
		return ""
	}
	u, err := url.Parse(webURL)
	if err != nil || u.Host == "" {
		return ""
	}
	return strings.ToLower(u.Host)
}

// lookupGitLabEnvironment resolves a GitLab environment to a Tracker
// environment, first from the segment of env before "/", then from tier.
func lookupGitLabEnvironment(cfg Config, env, tier string) (eventv1.Environment, bool) {
	first, _, _ := strings.Cut(env, "/")
	if e, ok := cfg.LookupEnvironment(first); ok {
		return e, true
	}
	return cfg.LookupEnvironment(tier)
}

// gitlabServiceHint builds the ServiceHint from the project fields:
// deduplicated, normalized repository URLs, and the last path segment as
// the fallback service name.
func gitlabServiceHint(p gitlabDeployment) ServiceHint {
	var urls []string
	seen := make(map[string]bool)
	for _, raw := range []string{p.Project.WebURL, p.Project.GitHTTPURL} {
		u := NormalizeRepoURL(raw)
		if u == "" || seen[u] {
			continue
		}
		seen[u] = true
		urls = append(urls, u)
	}

	path := strings.Trim(p.Project.PathWithNamespace, "/")
	name := path
	if idx := strings.LastIndex(path, "/"); idx >= 0 {
		name = path[idx+1:]
	}

	return ServiceHint{RepositoryURLs: urls, Name: name}
}

// gitlabMessage joins the non-empty lines describing the deployment.
func gitlabMessage(p gitlabDeployment) string {
	lines := []string{p.CommitTitle}
	if v := strings.TrimSpace(p.ShortSHA); v != "" {
		lines = append(lines, "Commit: "+v)
	}
	lines = append(lines, p.CommitURL)
	if v := strings.TrimSpace(p.DeployableURL); v != "" {
		lines = append(lines, "Job: "+v)
	}
	lines = append(lines, "GitLab environment: "+p.Environment)
	if v := strings.TrimSpace(p.EnvironmentExternalURL); v != "" {
		lines = append(lines, "URL: "+v)
	}

	nonEmpty := lines[:0]
	for _, l := range lines {
		if l != "" {
			nonEmpty = append(nonEmpty, l)
		}
	}
	return strings.Join(nonEmpty, "\n")
}
