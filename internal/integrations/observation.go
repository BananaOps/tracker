package integrations

import (
	"strings"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

// Source names, stored in attributes.source and in integration_deployments.
const (
	SourceGitLab = "gitlab"
	SourceFlux   = "flux"
)

// ServiceHint carries what the payload says about the service. The server
// resolves it against the catalog.
type ServiceHint struct {
	// RepositoryURLs are already normalized with NormalizeRepoURL.
	RepositoryURLs []string
	// Name is the fallback service name.
	Name string
}

// Observation is one deployment notification, normalized.
type Observation struct {
	Key           string
	Source        string
	Status        eventv1.Status
	At            time.Time
	Terminal      bool
	Environment   eventv1.Environment
	Service       ServiceHint
	ShortRevision string
	Message       string
	Owner         string
	User          string
	Comment       string
}

// Title builds "Deploy <service> <short revision> to <environment>".
func (o Observation) Title(service string) string {
	parts := []string{"Deploy"}
	for _, p := range []string{service, o.ShortRevision} {
		if p != "" {
			parts = append(parts, p)
		}
	}
	parts = append(parts, "to", o.Environment.String())
	return strings.Join(parts, " ")
}

// Rank orders statuses for the same instant: 1 for start, 2 for terminal
// statuses, 0 for anything else, including waiting_approval, which is
// ranked below start so a later start always takes over an approval.
func Rank(s eventv1.Status) int {
	switch s {
	case eventv1.Status_start:
		return 1
	case eventv1.Status_success, eventv1.Status_failure, eventv1.Status_warning, eventv1.Status_close:
		return 2
	default:
		return 0
	}
}

// IsTerminal reports whether s ends a deployment.
func IsTerminal(s eventv1.Status) bool { return Rank(s) == 2 }
