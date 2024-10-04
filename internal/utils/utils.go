package utils

import (
	"errors"
	"fmt"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

func CreateFilter(e *v1alpha1.SearchEventsRequest) (map[string]interface{}, error) {

	filter := make(map[string]interface{})

	if e.Source != "" {
		filter["attributes.source"] = e.Source
	}
	if e.Type != 0 {
		filter["attributes.type"] = e.Type
	}
	if e.Priority != 0 {
		filter["attributes.priority"] = e.Priority
	}
	if e.Environment != 0 {
		filter["attributes.environment"] = e.Environment
	}
	if e.Status != 0 {
		filter["attributes.status"] = e.Status
	}
	if e.Service != "" {
		filter["attributes.service"] = e.Service
	}
	if e.StartDate != "" && e.EndDate != "" {
		start, err := parseDate(e.StartDate)
		if err != nil {
			return nil, err
		}
		end, err := parseDate(e.EndDate)
		if err != nil {
			return nil, err
		}
		err = checkDateInverted(start, end)
		if err != nil {
			return nil, err
		}
		filter["attributes.startdate.seconds"] = bson.D{{Key: "$gte", Value: start.Unix()}, {Key: "$lte", Value: end.Unix()}}
	}
	if e.StartDate != "" && e.EndDate == "" {
		date, err := parseDate(e.StartDate)
		if err != nil {
			return nil, err
		}
		filter["attributes.startdate.seconds"] = bson.D{{Key: "$gte", Value: date.Unix()}}
	}
	if e.StartDate == "" && e.EndDate != "" {
		date, err := parseDate(e.EndDate)
		if err != nil {
			return nil, err
		}
		filter["attributes.startdate.seconds"] = bson.D{{Key: "$lte", Value: date.Unix()}}
	}
	if len(filter) == 0 {
		err := errors.New("no filter for search events")
		return nil, err
	}
	return filter, nil
}

func parseDate(date string) (t time.Time, err error) {

	layouts := []string{
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05.999Z",
		"2006-01-02T15:04:05.999",
		"2006-01-02T15:04:05.999-07:00",
		"2006-01-02T15:04:05Z0700",
		"2006-01-02T15:04:05.999Z0700",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05.999Z07:00",
		"2006-01-02T15:04:05-07",
		"2006-01-02T15:04",
		"2006-01-02T15",
		"2006-01-02",
	}

	for _, layout := range layouts {
		t, err = time.Parse(layout, date)
		if err == nil {
			break
		}
	}
	return
}

func checkDateInverted(startDate time.Time, endDate time.Time) (err error) {
	if endDate.Before(startDate) {
		err = fmt.Errorf("start_date %s and end_date %s are inversed", startDate, endDate)
	}
	return
}

func CatchPullRequestId(input string) (id string, err error) {
	pattern := `.*\/(\d*)$`
	regex := regexp.MustCompile(pattern)
	// Trouver des correspondances dans la chaîne d'entrée
	matches := regex.FindStringSubmatch(input)

	// Vérifier si des correspondances ont été trouvées
	if len(matches) > 0 {
		id = matches[1]
	} else {
		err = fmt.Errorf("no pull request id found in %s", input)
	}
	return
}
