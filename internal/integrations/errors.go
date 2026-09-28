package integrations

import (
	"errors"
	"time"
)

// Authentication errors. Their text is safe to log: it never contains a
// secret, a signature or a header value.
var (
	ErrMissingSignature = errors.New("missing signature")
	ErrInvalidSignature = errors.New("invalid signature")
	ErrStaleTimestamp   = errors.New("timestamp outside tolerance")
)

// Reasons sent back with a 202 response.
const (
	ReasonUnsupportedEvent      = "unsupported event"
	ReasonUnsupportedObjectKind = "unsupported object_kind"
	ReasonUnsupportedKind       = "unsupported kind"
	ReasonUnsupportedStatus     = "unsupported status"
	ReasonApprovalIgnored       = "approval not tracked"
	ReasonUnsupportedReason     = "unsupported reason"
	ReasonUnmappedEnvironment   = "unmapped environment"
	ReasonMissingRevision       = "missing revision"
	ReasonDuplicate             = "duplicate"
	ReasonStale                 = "stale"
)

// IgnoredError marks a valid notification that Tracker does not record (HTTP 202).
type IgnoredError struct{ Reason string }

func (e *IgnoredError) Error() string { return "ignored: " + e.Reason }

// InvalidError marks a malformed or incomplete payload (HTTP 400).
type InvalidError struct{ Reason string }

func (e *InvalidError) Error() string { return "invalid payload: " + e.Reason }

// CheckFreshness accepts at when it is within tolerance of now, in both directions.
func CheckFreshness(at, now time.Time, tolerance time.Duration) error {
	d := now.Sub(at)
	if d < 0 {
		d = -d
	}
	if d > tolerance {
		return ErrStaleTimestamp
	}
	return nil
}
