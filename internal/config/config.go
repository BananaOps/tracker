package config

import (
	"os"
)

type Database struct {
	Collection string
	Host       string
	Port       string
	Name       string
	Username   string
	Password   string
	CAFile     string
	CertFile   string
	KeyFile    string
}

type General struct {
	GrpcPort string
	HttpPort string
	LogLevel string
}

var ConfigGeneral = General{
	GrpcPort: "8765",
	HttpPort: "8080",
	LogLevel: "info",
}

var ConfigDatabase = Database{
	Collection: "events",
	Host:       "127.0.0.1",
	Port:       "27017",
	Name:       "eventstracker",
}

func init() {

	// database confgiuration
	if os.Getenv("DB_HOST") != "" {
		ConfigDatabase.Host = os.Getenv("DB_HOST")
	}
	if os.Getenv("DB_PORT") != "" {
		ConfigDatabase.Port = os.Getenv("DB_PORT")
	}
	if os.Getenv("DB_COLLECTION") != "" {
		ConfigDatabase.Name = os.Getenv("DB_COLLECTION")
	}
	if os.Getenv("DB_NAME") != "" {
		ConfigDatabase.Name = os.Getenv("DB_NAME")
	}
	if os.Getenv("DB_USERNAME") != "" {
		ConfigDatabase.Username = os.Getenv("DB_USERNAME")
	}
	if os.Getenv("DB_PASSWORD") != "" {
		ConfigDatabase.Password = os.Getenv("DB_PASSWORD")
	}
	if os.Getenv("DB_CA_FILE") != "" {
		ConfigDatabase.CAFile = os.Getenv("DB_CA_FILE")
	}
	if os.Getenv("DB_CERT_FILE") != "" {
		ConfigDatabase.CertFile = os.Getenv("DB_CERT_FILE")
	}
	if os.Getenv("DB_KEY_FILE") != "" {
		ConfigDatabase.KeyFile = os.Getenv("DB_KEY_FILE")
	}
	// server configuration
	if os.Getenv("GRPC_PORT") != "" {
		ConfigGeneral.GrpcPort = os.Getenv("GRPC_PORT")
	}
	if os.Getenv("HTTP_PORT") != "" {
		ConfigGeneral.HttpPort = os.Getenv("HTTP_PORT")
	}
	if os.Getenv("LOG_LEVEL") != "" {
		ConfigGeneral.LogLevel = os.Getenv("LOG_LEVEL")
	}
}
