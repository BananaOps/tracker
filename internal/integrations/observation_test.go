package integrations

import (
	"testing"

	"github.com/stretchr/testify/assert"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

func TestRank(t *testing.T) {
	cases := []struct {
		status eventv1.Status
		want   int
	}{
		{eventv1.Status_start, 1},
		{eventv1.Status_waiting_approval, 1},
		{eventv1.Status_success, 2},
		{eventv1.Status_failure, 2},
		{eventv1.Status_warning, 2},
		{eventv1.Status_close, 2},
		{eventv1.Status_in_progress, 0},
		{eventv1.Status_done, 0},
	}

	for _, tt := range cases {
		t.Run(tt.status.String(), func(t *testing.T) {
			assert.Equal(t, tt.want, Rank(tt.status))
			assert.Equal(t, tt.want == 2, IsTerminal(tt.status))
		})
	}
}

func TestTitle(t *testing.T) {
	t.Run("with revision", func(t *testing.T) {
		o := Observation{ShortRevision: "a1b2c3d4", Environment: eventv1.Environment_production}
		assert.Equal(t, "Deploy payments a1b2c3d4 to production", o.Title("payments"))
	})

	t.Run("without revision", func(t *testing.T) {
		o := Observation{Environment: eventv1.Environment_production}
		assert.Equal(t, "Deploy payments to production", o.Title("payments"))
	})

	t.Run("preproduction environment", func(t *testing.T) {
		o := Observation{ShortRevision: "a1b2c3d4", Environment: eventv1.Environment_preproduction}
		assert.Equal(t, "Deploy payments a1b2c3d4 to preproduction", o.Title("payments"))
	})
}
