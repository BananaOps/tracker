package server

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTodayRangeFollowsTheServerTimeZone(t *testing.T) {
	paris, err := time.LoadLocation("Europe/Paris")
	require.NoError(t, err)

	// 00:30 in Paris is still the previous day in UTC.
	start, end := todayRange(time.Date(2026, 3, 10, 0, 30, 0, 0, paris))
	assert.Equal(t, "2026-03-10T00:00:00+01:00", start)
	assert.Equal(t, "2026-03-10T23:59:59+01:00", end)

	start, end = todayRange(time.Date(2026, 3, 10, 23, 30, 0, 0, time.UTC))
	assert.Equal(t, "2026-03-10T00:00:00Z", start)
	assert.Equal(t, "2026-03-10T23:59:59Z", end)
}
