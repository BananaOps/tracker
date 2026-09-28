package integrations

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

func gitlabBody(t *testing.T, mutate func(m map[string]any)) []byte {
	t.Helper()
	m := map[string]any{
		"object_kind": "deployment", "status": "running",
		"status_changed_at": "2026-09-28 10:00:00 +0200", "deployment_id": 42,
		"deployable_url": "https://gitlab.example.com/team/payments/-/jobs/7",
		"environment":    "production", "environment_tier": "production",
		"environment_external_url": "https://payments.example.com",
		"short_sha":                "a1b2c3d4", "commit_title": "Fix rounding",
		"commit_url": "https://gitlab.example.com/team/payments/-/commit/a1b2c3d4e5",
		"user":       map[string]any{"username": "jdoe"},
		"project": map[string]any{
			"web_url":             "https://gitlab.example.com/team/payments",
			"git_http_url":        "https://gitlab.example.com/team/payments.git",
			"path_with_namespace": "team/payments",
		},
	}
	if mutate != nil {
		mutate(m)
	}
	b, err := json.Marshal(m)
	require.NoError(t, err)
	return b
}

func gitlabConfig(t *testing.T) Config {
	t.Helper()
	cfg, err := LoadConfig(func(string) (string, bool) { return "", false })
	require.NoError(t, err)
	return cfg
}

func TestParseGitLab(t *testing.T) {
	t.Run("nominal", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, nil)

		obs, err := ParseGitLab(GitLabDeploymentHook, "https://GitLab.Example.com", body, cfg)
		require.NoError(t, err)

		assert.Equal(t, "gitlab:gitlab.example.com:42", obs.Key)
		assert.Equal(t, SourceGitLab, obs.Source)
		assert.Equal(t, eventv1.Status_start, obs.Status)
		assert.False(t, obs.Terminal)
		assert.True(t, obs.At.Equal(time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)))
		assert.Equal(t, eventv1.Environment_production, obs.Environment)
		assert.Equal(t, ServiceHint{
			RepositoryURLs: []string{"https://gitlab.example.com/team/payments"},
			Name:           "payments",
		}, obs.Service)
		assert.Equal(t, "a1b2c3d4", obs.ShortRevision)
		assert.Equal(t, "jdoe", obs.Owner)
		assert.Equal(t, "gitlab:jdoe", obs.User)
		assert.Equal(t, "", obs.Comment)
		assert.Equal(t, "Fix rounding\nCommit: a1b2c3d4\nhttps://gitlab.example.com/team/payments/-/commit/a1b2c3d4e5\nJob: https://gitlab.example.com/team/payments/-/jobs/7\nGitLab environment: production\nURL: https://payments.example.com", obs.Message)
		assert.Equal(t, "Deploy payments a1b2c3d4 to production", obs.Title("payments"))
	})

	t.Run("empty instance header falls back to project.web_url host", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, nil)

		obs, err := ParseGitLab(GitLabDeploymentHook, "", body, cfg)
		require.NoError(t, err)
		assert.Equal(t, "gitlab:gitlab.example.com:42", obs.Key)
	})

	t.Run("status_changed_at as RFC3339", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, func(m map[string]any) {
			m["status_changed_at"] = "2026-09-28T08:00:00Z"
		})

		obs, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
		require.NoError(t, err)
		assert.True(t, obs.At.Equal(time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)))
	})

	t.Run("status table", func(t *testing.T) {
		cfg := gitlabConfig(t)

		cases := []struct {
			status   string
			want     eventv1.Status
			terminal bool
			comment  string
		}{
			{"running", eventv1.Status_start, false, ""},
			{"success", eventv1.Status_success, true, ""},
			{"failed", eventv1.Status_failure, true, ""},
			{"canceled", eventv1.Status_warning, true, "Deployment canceled"},
			{"blocked", eventv1.Status_waiting_approval, false, ""},
			{"rejected", eventv1.Status_close, true, ""},
		}

		for _, tt := range cases {
			t.Run(tt.status, func(t *testing.T) {
				body := gitlabBody(t, func(m map[string]any) { m["status"] = tt.status })
				obs, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
				require.NoError(t, err)
				assert.Equal(t, tt.want, obs.Status)
				assert.Equal(t, tt.terminal, obs.Terminal)
				assert.Equal(t, tt.comment, obs.Comment)
			})
		}

		t.Run("approved", func(t *testing.T) {
			body := gitlabBody(t, func(m map[string]any) { m["status"] = "approved" })
			_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
			var ig *IgnoredError
			require.ErrorAs(t, err, &ig)
			assert.Equal(t, ReasonApprovalIgnored, ig.Reason)
		})

		t.Run("created", func(t *testing.T) {
			body := gitlabBody(t, func(m map[string]any) { m["status"] = "created" })
			_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
			var ig *IgnoredError
			require.ErrorAs(t, err, &ig)
			assert.Equal(t, ReasonUnsupportedStatus, ig.Reason)
		})
	})

	t.Run("environments", func(t *testing.T) {
		cfg := gitlabConfig(t)

		mapped := []struct {
			name        string
			environment string
			tier        string
			want        eventv1.Environment
		}{
			{"production/eu", "production/eu", "production", eventv1.Environment_production},
			{"production-eu with production tier", "production-eu", "production", eventv1.Environment_production},
			{"staging", "staging", "staging", eventv1.Environment_preproduction},
			{"Production", "Production", "Production", eventv1.Environment_production},
		}
		for _, tt := range mapped {
			t.Run(tt.name, func(t *testing.T) {
				body := gitlabBody(t, func(m map[string]any) {
					m["environment"] = tt.environment
					m["environment_tier"] = tt.tier
				})
				obs, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
				require.NoError(t, err)
				assert.Equal(t, tt.want, obs.Environment)
			})
		}

		unmapped := []struct {
			name        string
			environment string
			tier        string
		}{
			{"review/feature-x with development tier", "review/feature-x", "development"},
			{"integration with testing tier", "integration", "testing"},
		}
		for _, tt := range unmapped {
			t.Run(tt.name, func(t *testing.T) {
				body := gitlabBody(t, func(m map[string]any) {
					m["environment"] = tt.environment
					m["environment_tier"] = tt.tier
				})
				_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
				var ig *IgnoredError
				require.ErrorAs(t, err, &ig)
				assert.Equal(t, ReasonUnmappedEnvironment, ig.Reason)
			})
		}
	})

	t.Run("unsupported event", func(t *testing.T) {
		cfg := gitlabConfig(t)
		_, err := ParseGitLab("Push Hook", "https://gitlab.example.com", []byte("{"), cfg)
		var ig *IgnoredError
		require.ErrorAs(t, err, &ig)
		assert.Equal(t, ReasonUnsupportedEvent, ig.Reason)
	})

	t.Run("unsupported object_kind", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, func(m map[string]any) { m["object_kind"] = "build" })
		_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
		var ig *IgnoredError
		require.ErrorAs(t, err, &ig)
		assert.Equal(t, ReasonUnsupportedObjectKind, ig.Reason)
	})

	t.Run("invalid JSON body", func(t *testing.T) {
		cfg := gitlabConfig(t)
		_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", []byte("{"), cfg)
		var iv *InvalidError
		require.ErrorAs(t, err, &iv)
	})

	t.Run("required fields", func(t *testing.T) {
		cfg := gitlabConfig(t)

		mutations := []func(m map[string]any){
			func(m map[string]any) { delete(m, "deployment_id") },
			func(m map[string]any) { m["status"] = "" },
			func(m map[string]any) { m["status_changed_at"] = "" },
			func(m map[string]any) { m["environment"] = "" },
			func(m map[string]any) { m["project"].(map[string]any)["path_with_namespace"] = "" },
			func(m map[string]any) { m["status_changed_at"] = "yesterday" },
		}
		for _, mutate := range mutations {
			body := gitlabBody(t, mutate)
			_, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
			var iv *InvalidError
			require.ErrorAs(t, err, &iv)
		}
	})

	t.Run("no instance host determinable", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, func(m map[string]any) {
			m["project"].(map[string]any)["web_url"] = ""
		})
		_, err := ParseGitLab(GitLabDeploymentHook, "", body, cfg)
		var iv *InvalidError
		require.ErrorAs(t, err, &iv)
	})

	t.Run("empty username falls back to unknown", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, func(m map[string]any) {
			m["user"].(map[string]any)["username"] = ""
		})
		obs, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
		require.NoError(t, err)
		assert.Equal(t, "gitlab", obs.Owner)
		assert.Equal(t, "gitlab:unknown", obs.User)
	})

	t.Run("null environment_external_url omits URL line", func(t *testing.T) {
		cfg := gitlabConfig(t)
		body := gitlabBody(t, func(m map[string]any) {
			m["environment_external_url"] = nil
		})
		obs, err := ParseGitLab(GitLabDeploymentHook, "https://gitlab.example.com", body, cfg)
		require.NoError(t, err)
		assert.NotContains(t, obs.Message, "URL:")
	})
}
