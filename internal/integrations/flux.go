package integrations

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

const fluxEventMetadataPrefix = "event.toolkit.fluxcd.io/"

var fluxRevisionKeys = map[string]string{
	"Kustomization": "kustomize.toolkit.fluxcd.io/revision",
	"HelmRelease":   "helm.toolkit.fluxcd.io/revision",
}

// fluxReasons maps a Flux notification severity and reason to a Tracker
// status. Verified against fluxcd/kustomize-controller and
// fluxcd/helm-controller (see flux_test.go and the task report for sources).
var fluxReasons = map[string]map[string]eventv1.Status{
	"info": {
		"Progressing":             eventv1.Status_start,
		"ReconciliationSucceeded": eventv1.Status_success,
		"InstallSucceeded":        eventv1.Status_success,
		"UpgradeSucceeded":        eventv1.Status_success,
		// helm-controller emits RollbackSucceeded with corev1.EventTypeNormal
		// (severity info, not error: see rollback_remediation.go and
		// fluxcd/pkg runtime/events recorder.go). A rollback still means the
		// preceding upgrade failed, so it is kept as a failure.
		"RollbackSucceeded": eventv1.Status_failure,
	},
	"error": {
		"ReconciliationFailed": eventv1.Status_failure,
		"HealthCheckFailed":    eventv1.Status_failure,
		"BuildFailed":          eventv1.Status_failure,
		"ValidationFailed":     eventv1.Status_failure,
		"ArtifactFailed":       eventv1.Status_failure,
		"InstallFailed":        eventv1.Status_failure,
		"UpgradeFailed":        eventv1.Status_failure,
		"TestFailed":           eventv1.Status_failure,
	},
}

type fluxEvent struct {
	InvolvedObject struct {
		Kind      string `json:"kind"`
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
	} `json:"involvedObject"`
	Severity  string            `json:"severity"`
	Timestamp string            `json:"timestamp"`
	Message   string            `json:"message"`
	Reason    string            `json:"reason"`
	Metadata  map[string]string `json:"metadata"`
}

// fluxMetadata reads key, then event.toolkit.fluxcd.io/key. In practice a
// genuine Flux notification only ever carries the bare key: per RFC-0008,
// notification-controller strips the event.toolkit.fluxcd.io/ prefix from
// object annotations before dispatching to any provider, generic-hmac
// included. The prefixed fallback is kept defensively.
func fluxMetadata(m map[string]string, key string) string {
	if v := strings.TrimSpace(m[key]); v != "" {
		return v
	}
	return strings.TrimSpace(m[fluxEventMetadataPrefix+key])
}

// ParseFlux maps a Flux notification-controller event to an Observation. It
// returns *InvalidError for a malformed or incomplete payload,
// ErrStaleTimestamp when the event timestamp is outside cfg.Tolerance, and
// *IgnoredError for a notification Tracker does not record.
func ParseFlux(body []byte, cfg Config, now time.Time) (Observation, error) {
	var e fluxEvent
	if err := json.Unmarshal(body, &e); err != nil {
		return Observation{}, &InvalidError{Reason: "body is not valid JSON"}
	}

	if strings.TrimSpace(e.InvolvedObject.Kind) == "" {
		return Observation{}, &InvalidError{Reason: "missing field involvedObject.kind"}
	}
	if strings.TrimSpace(e.InvolvedObject.Name) == "" {
		return Observation{}, &InvalidError{Reason: "missing field involvedObject.name"}
	}
	if strings.TrimSpace(e.InvolvedObject.Namespace) == "" {
		return Observation{}, &InvalidError{Reason: "missing field involvedObject.namespace"}
	}
	if strings.TrimSpace(e.Severity) == "" {
		return Observation{}, &InvalidError{Reason: "missing field severity"}
	}
	if strings.TrimSpace(e.Reason) == "" {
		return Observation{}, &InvalidError{Reason: "missing field reason"}
	}
	if strings.TrimSpace(e.Timestamp) == "" {
		return Observation{}, &InvalidError{Reason: "missing field timestamp"}
	}

	at, err := time.Parse(time.RFC3339, e.Timestamp)
	if err != nil {
		return Observation{}, &InvalidError{Reason: "timestamp is not a valid date"}
	}
	at = at.UTC()

	if err := CheckFreshness(at, now, cfg.Tolerance); err != nil {
		return Observation{}, err
	}

	kind := e.InvolvedObject.Kind
	revisionKey, ok := fluxRevisionKeys[kind]
	if !ok {
		return Observation{}, &IgnoredError{Reason: ReasonUnsupportedKind}
	}

	status, ok := fluxReasons[e.Severity][e.Reason]
	if !ok {
		return Observation{}, &IgnoredError{Reason: ReasonUnsupportedReason}
	}

	md := e.Metadata
	if md == nil {
		md = map[string]string{}
	}

	environment, ok := cfg.LookupEnvironment(fluxMetadata(md, "environment"))
	if !ok {
		return Observation{}, &IgnoredError{Reason: ReasonUnmappedEnvironment}
	}

	revision := strings.TrimSpace(md[revisionKey])
	if revision == "" {
		return Observation{}, &IgnoredError{Reason: ReasonMissingRevision}
	}

	ns := e.InvolvedObject.Namespace
	name := e.InvolvedObject.Name

	serviceName := fluxMetadata(md, "service")
	if serviceName == "" {
		serviceName = name
	}

	lines := []string{
		fmt.Sprintf("%s %s/%s", kind, ns, name),
		"Revision: " + revision,
		"Reason: " + e.Reason,
	}
	if v := strings.TrimSpace(e.Message); v != "" {
		lines = append(lines, v)
	}

	return Observation{
		Key:           fmt.Sprintf("flux:%s:%s/%s/%s@%s", environment.String(), kind, ns, name, revision),
		Source:        SourceFlux,
		Status:        status,
		At:            at,
		Terminal:      IsTerminal(status),
		Environment:   environment,
		Service:       ServiceHint{Name: serviceName},
		ShortRevision: ShortRevision(revision),
		Message:       strings.Join(lines, "\n"),
		Owner:         "flux",
		User:          "flux:" + ns + "/" + name,
	}, nil
}

// ShortRevision shortens a Flux revision for display: the part after the
// last ':' (or, failing that, the last '/'), truncated to 8 characters when
// it is a hexadecimal string longer than that (a SHA); a chart version such
// as "1.2.3" is kept as is.
func ShortRevision(rev string) string {
	s := rev
	if i := strings.LastIndex(s, ":"); i >= 0 {
		s = s[i+1:]
	} else if i := strings.LastIndex(s, "/"); i >= 0 {
		s = s[i+1:]
	}
	if len(s) > 8 && isHex(s) {
		return s[:8]
	}
	return s
}

// isHex reports whether s contains only hexadecimal digits.
func isHex(s string) bool {
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
		case r >= 'a' && r <= 'f':
		case r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return true
}
