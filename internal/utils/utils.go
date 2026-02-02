package utils

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"time"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
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

func IsUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

// DecodeEscapedChars prend une chaîne contenant des caractères encodés en URL
// et retourne la chaîne décodée.
func DecodeEscapedChars(encodedStr string) (string, error) {
	decodedStr, err := url.QueryUnescape(encodedStr)
	if err != nil {
		return "", err // Retourne une erreur si le décodage échoue
	}
	return decodedStr, nil
}

// StatsFilter represents the filter parameters for event statistics
type StatsFilter struct {
	StartDate    string
	EndDate      string
	Environments []int32
	Impact       *bool
	Priorities   []int32
	Types        []int32
	Statuses     []int32
	Source       string
	Service      string
}

// CreateStatsFilter builds a bson.D filter for event statistics queries
func CreateStatsFilter(f *StatsFilter) (bson.D, error) {
	filter := bson.D{}

	// Parse and validate dates (required)
	if f.StartDate == "" || f.EndDate == "" {
		return nil, errors.New("start_date and end_date are required")
	}

	start, err := parseDate(f.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date: %w", err)
	}
	end, err := parseDate(f.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end_date: %w", err)
	}

	if err = checkDateInverted(start, end); err != nil {
		return nil, err
	}

	// Filter by created_at timestamp
	filter = append(filter, bson.E{
		Key: "metadata.createdat.seconds",
		Value: bson.D{
			{Key: "$gte", Value: start.Unix()},
			{Key: "$lte", Value: end.Unix()},
		},
	})

	// Optional filters
	if len(f.Environments) > 0 {
		filter = append(filter, bson.E{Key: "attributes.environment", Value: bson.D{{Key: "$in", Value: f.Environments}}})
	}

	if f.Impact != nil {
		filter = append(filter, bson.E{Key: "attributes.impact", Value: *f.Impact})
	}

	if len(f.Priorities) > 0 {
		filter = append(filter, bson.E{Key: "attributes.priority", Value: bson.D{{Key: "$in", Value: f.Priorities}}})
	}

	if len(f.Types) > 0 {
		filter = append(filter, bson.E{Key: "attributes.type", Value: bson.D{{Key: "$in", Value: f.Types}}})
	}

	if len(f.Statuses) > 0 {
		filter = append(filter, bson.E{Key: "attributes.status", Value: bson.D{{Key: "$in", Value: f.Statuses}}})
	}

	if f.Source != "" {
		filter = append(filter, bson.E{Key: "attributes.source", Value: f.Source})
	}

	if f.Service != "" {
		filter = append(filter, bson.E{Key: "attributes.service", Value: f.Service})
	}

	return filter, nil
}
