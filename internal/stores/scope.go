package store

import (
	"github.com/bananaops/tracker/internal/auth"
	"go.mongodb.org/mongo-driver/bson"
)

// ServiceFilter returns the condition restricting field to the services of
// scope. It is empty for an unrestricted scope and matches nothing for an
// empty restricted one.
func ServiceFilter(scope auth.Scope, field string) bson.D {
	if scope.All {
		return bson.D{}
	}
	return bson.D{{Key: field, Value: bson.D{{Key: "$in", Value: scope.ServiceList()}}}}
}

// scopedFilter combines filter with the service restriction of scope.
// filter is returned untouched for an unrestricted scope.
func scopedFilter(filter any, scope auth.Scope, field string) any {
	if scope.All {
		return filter
	}
	if filter == nil {
		filter = bson.D{}
	}
	return bson.D{{Key: "$and", Value: bson.A{filter, ServiceFilter(scope, field)}}}
}
