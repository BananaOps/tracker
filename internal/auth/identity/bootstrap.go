package identity

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BootstrapUserStore is the subset of store.AuthUserStore used at startup.
type BootstrapUserStore interface {
	Count(ctx context.Context) (int64, error)
	Create(ctx context.Context, u *store.User) error
}

// BootstrapTeamStore is the subset of store.AuthTeamStore used at startup.
type BootstrapTeamStore interface {
	GetByName(ctx context.Context, name string) (*store.Team, error)
	Create(ctx context.Context, t *store.Team) error
}

// BootstrapResult tells the caller what was created.
type BootstrapResult struct {
	AdminCreated bool
	// GeneratedPassword is set only when no AUTH_ADMIN_PASSWORD was provided.
	// The caller must log it once.
	GeneratedPassword string
	AdminsTeamID      primitive.ObjectID
}

const generatedPasswordLength = 24

// Bootstrap makes sure the Administrators team exists and creates the first
// admin user when the user collection is empty.
//
// It is safe to run on several replicas at once. Both writes are guarded by a
// unique index, and losing either race is treated as success: the team is read
// back, and an admin created by a peer means this replica has nothing to
// report, so AdminCreated is false and no password is returned.
func Bootstrap(ctx context.Context, users BootstrapUserStore, teams BootstrapTeamStore, adminPassword string) (BootstrapResult, error) {
	admins, err := teams.GetByName(ctx, store.AdministratorsTeamName)
	if errors.Is(err, store.ErrNotFound) {
		admins = &store.Team{
			Name:        store.AdministratorsTeamName,
			Description: "Built-in team holding every permission",
			Permissions: permissionStrings(auth.AllPermissions()),
			Scope:       store.TeamScope{All: true, Services: []string{}},
			OIDCGroups:  []string{},
			Builtin:     true,
		}
		if err := teams.Create(ctx, admins); errors.Is(err, store.ErrAlreadyExists) {
			// Another replica won the race between the lookup and the insert.
			// The unique index did its job, read back what the peer wrote.
			admins, err = teams.GetByName(ctx, store.AdministratorsTeamName)
			if err != nil {
				return BootstrapResult{}, fmt.Errorf("lookup administrators team created by a peer: %w", err)
			}
		} else if err != nil {
			return BootstrapResult{}, fmt.Errorf("create administrators team: %w", err)
		}
	} else if err != nil {
		return BootstrapResult{}, fmt.Errorf("lookup administrators team: %w", err)
	}
	result := BootstrapResult{AdminsTeamID: admins.ID}

	count, err := users.Count(ctx)
	if err != nil {
		return BootstrapResult{}, fmt.Errorf("count users: %w", err)
	}
	if count > 0 {
		return result, nil
	}

	password := adminPassword
	if password == "" {
		password, err = GeneratePassword(generatedPasswordLength)
		if err != nil {
			return BootstrapResult{}, err
		}
		result.GeneratedPassword = password
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return BootstrapResult{}, fmt.Errorf("hash admin password: %w", err)
	}
	admin := &store.User{
		Username:           "admin",
		DisplayName:        "Administrator",
		Source:             store.UserSourceLocal,
		PasswordHash:       hash,
		Teams:              []primitive.ObjectID{admins.ID},
		MustChangePassword: true,
	}
	if err := users.Create(ctx, admin); errors.Is(err, store.ErrAlreadyExists) {
		// A peer replica created the admin between the Count and the insert.
		// Its password is the one that counts, so drop the one generated here
		// and report nothing created: the caller must not log a password that
		// does not open anything.
		return BootstrapResult{AdminsTeamID: admins.ID}, nil
	} else if err != nil {
		return BootstrapResult{}, fmt.Errorf("create admin user: %w", err)
	}
	result.AdminCreated = true
	return result, nil
}

const passwordAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// GeneratePassword returns a random alphanumeric password of n characters.
func GeneratePassword(n int) (string, error) {
	out := make([]byte, n)
	for i := range out {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(passwordAlphabet))))
		if err != nil {
			return "", fmt.Errorf("generate password: %w", err)
		}
		out[i] = passwordAlphabet[idx.Int64()]
	}
	return string(out), nil
}

func permissionStrings(perms []auth.Permission) []string {
	out := make([]string, len(perms))
	for i, p := range perms {
		out[i] = string(p)
	}
	return out
}
