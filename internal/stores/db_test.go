package store

import (
	"testing"

	"github.com/bananaops/tracker/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestCreateMongoUri(t *testing.T) {

	testCases := []struct {
		name     string
		excepted string
		config   config.Database
	}{
		{
			name:     "Test config uri with username password",
			excepted: "mongodb://user:password@localhost:27017/test?maxPoolSize=20&tls=true&authMechanism=PLAIN",
			config: config.Database{
				Host:     "localhost",
				Port:     "27017",
				Name:     "test",
				Username: "user",
				Password: "password",
			},
		},
		{
			name:     "Test config uri without username password",
			excepted: "mongodb://localhost:27017/test?maxPoolSize=20",
			config: config.Database{
				Host:     "localhost",
				Port:     "27017",
				Name:     "test",
				Username: "",
				Password: "",
			},
		},
		{
			name:     "Test config nil",
			excepted: "mongodb://:/?maxPoolSize=20",
			config: config.Database{
				Host:     "",
				Port:     "",
				Name:     "",
				Username: "",
				Password: "",
			},
		},
	}

	for _, testCase := range testCases {
		e := createMongoUri(testCase.config)
		assert.Equal(t, e, testCase.excepted, testCase.name)
	}
}
