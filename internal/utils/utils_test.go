package utils

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var loc = time.Now().Local().Location()

func TestParseDate(t *testing.T) {

	testCases := []struct {
		name string
		date string
	}{
		{
			name: "OK - Test layout 2024-01-20",
			date: "2024-01-20",
		},
		{
			name: "OK - Test layout 2024-01-20T15",
			date: "2024-01-20T15",
		},
		{
			name: "OK - Test layout 2024-01-20T15:01",
			date: "2024-01-20T15:01",
		},
		{
			name: "OK - Test layout 2024-01-20T15:01:05",
			date: "2024-01-20T15:01:05",
		},
		{
			name: "OK - Test layout 2024-01-21T12:09:52.496+00:00",
			date: "2024-01-21T12:09:52.496",
		},
		{
			name: "OK - Test layout 2024-01-21T12:09:52.496Z",
			date: "2024-01-21T12:09:52.496Z",
		},
	}

	for _, testCase := range testCases {
		_, e := parseDate(testCase.date)
		assert.NoError(t, e, testCase.name)
	}
}

func TestCheckDateInverted(t *testing.T) {

	testCases := []struct {
		name  string
		start time.Time
		end   time.Time
	}{
		{
			name:  "OK - Test layout 2024-01-20",
			start: time.Date(2022, time.March, 1, 0, 0, 0, 0, loc),
			end:   time.Date(2022, time.March, 2, 0, 0, 0, 0, loc),
		},
	}

	for _, testCase := range testCases {
		e := checkDateInverted(testCase.start, testCase.end)
		assert.NoError(t, e, testCase.name)
	}
}

func TestCheckDateInvertedError(t *testing.T) {

	testCases := []struct {
		name  string
		start time.Time
		end   time.Time
	}{
		{
			name:  "OK - Test layout 2024-01-20",
			start: time.Date(2022, time.March, 2, 0, 0, 0, 0, loc),
			end:   time.Date(2022, time.March, 1, 0, 0, 0, 0, loc),
		},
	}

	for _, testCase := range testCases {
		e := checkDateInverted(testCase.start, testCase.end)
		assert.Error(t, e, testCase.name)
	}
}

func TestCatchPullRequestId(t *testing.T) {

	testCases := []struct {
		name       string
		pull       string
		execptedId string
	}{
		{
			name:       "OK - Test Github Pull Request",
			pull:       "https://github.com/jplanckeel/events-tracker/pull/1543",
			execptedId: "1543",
		},
		{
			name:       "OK - Test Gitlab Merge Request",
			pull:       "https://gitlab.com/jplanckeel/events-tracker/-/merge_requests/1503",
			execptedId: "1503",
		},
	}

	for _, testCase := range testCases {
		e, _ := CatchPullRequestId(testCase.pull)
		assert.Equal(t, testCase.execptedId, e)
	}
}

func TestCatchPullRequestIdError(t *testing.T) {

	testCases := []struct {
		name string
		pull string
	}{
		{
			name: "OK - Url malformed",
			pull: "https://github.com/jplanckeel/events-tracker/pull/1543/test",
		},
		{
			name: "OK - Url is nill",
			pull: "",
		},
	}

	for _, testCase := range testCases {
		_, e := CatchPullRequestId(testCase.pull)
		assert.Error(t, e)
	}
}
