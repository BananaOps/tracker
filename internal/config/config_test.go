package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDefaultConfigValues(t *testing.T) {
	assert.Equal(t, ConfigDatabase.Host, "127.0.0.1")
	assert.Equal(t, ConfigDatabase.Name, "tracker")
	assert.Equal(t, ConfigDatabase.Port, "27017")
	assert.Equal(t, ConfigGeneral.LogLevel, "info")
	assert.Equal(t, ConfigGeneral.GrpcPort, "8765")
	assert.Equal(t, ConfigGeneral.HttpPort, "8080")
}
