package integrations

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCheckFreshness(t *testing.T) {
	now := time.Unix(1790000000, 0)
	tol := 5 * time.Minute

	tests := []struct {
		name string
		at   time.Time
		want error
	}{
		{"at now", now, nil},
		{"at now minus tolerance", now.Add(-tol), nil},
		{"at now plus tolerance", now.Add(tol), nil},
		{"just past tolerance in the past", now.Add(-tol - time.Second), ErrStaleTimestamp},
		{"just past tolerance in the future", now.Add(tol + time.Second), ErrStaleTimestamp},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckFreshness(tt.at, now, tol)
			if tt.want == nil {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.want)
			}
		})
	}
}

func TestErrorTypes(t *testing.T) {
	ignored := &IgnoredError{Reason: "x"}
	assert.Equal(t, "ignored: x", ignored.Error())

	invalid := &InvalidError{Reason: "y"}
	assert.Equal(t, "invalid payload: y", invalid.Error())
}
