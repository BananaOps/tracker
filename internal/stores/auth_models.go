package store

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	UserSourceLocal = "local"
	UserSourceOIDC  = "oidc"

	// AdministratorsTeamName is the built-in team that holds every permission.
	AdministratorsTeamName = "Administrators"

	authUsersCollection    = "auth_users"
	authTeamsCollection    = "auth_teams"
	authAPIKeysCollection  = "auth_api_keys" // #nosec G101 -- collection name, not a credential
	authSettingsCollection = "auth_settings"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
)

// User is a local or OIDC account.
type User struct {
	ID                 primitive.ObjectID   `bson:"_id,omitempty"`
	Username           string               `bson:"username"`
	UsernameLower      string               `bson:"usernameLower"`
	Email              string               `bson:"email"`
	DisplayName        string               `bson:"displayName"`
	Source             string               `bson:"source"`
	PasswordHash       string               `bson:"passwordHash,omitempty"`
	OIDCIssuer         string               `bson:"oidcIssuer,omitempty"`
	OIDCSubject        string               `bson:"oidcSubject,omitempty"`
	Teams              []primitive.ObjectID `bson:"teams"`
	Disabled           bool                 `bson:"disabled"`
	MustChangePassword bool                 `bson:"mustChangePassword"`
	SessionVersion     int                  `bson:"sessionVersion"`
	CreatedAt          time.Time            `bson:"createdAt"`
	UpdatedAt          time.Time            `bson:"updatedAt"`
	LastLoginAt        *time.Time           `bson:"lastLoginAt,omitempty"`
}

// TeamScope restricts a team to catalog services. All wins over Services.
type TeamScope struct {
	All      bool     `bson:"all"`
	Services []string `bson:"services"`
}

// Team groups users and API keys and carries permissions.
type Team struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	Name        string             `bson:"name"`
	NameLower   string             `bson:"nameLower"`
	Description string             `bson:"description"`
	Permissions []string           `bson:"permissions"`
	Scope       TeamScope          `bson:"scope"`
	OIDCGroups  []string           `bson:"oidcGroups"`
	Builtin     bool               `bson:"builtin"`
	CreatedAt   time.Time          `bson:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt"`
}

// APIKey is a machine credential. TeamID nil means a global key.
type APIKey struct {
	ID         primitive.ObjectID  `bson:"_id,omitempty"`
	Prefix     string              `bson:"prefix"`
	Hash       string              `bson:"hash"`
	Name       string              `bson:"name"`
	TeamID     *primitive.ObjectID `bson:"teamId"`
	CreatedBy  primitive.ObjectID  `bson:"createdBy"`
	CreatedAt  time.Time           `bson:"createdAt"`
	ExpiresAt  *time.Time          `bson:"expiresAt,omitempty"`
	LastUsedAt *time.Time          `bson:"lastUsedAt,omitempty"`
	RevokedAt  *time.Time          `bson:"revokedAt,omitempty"`
}
