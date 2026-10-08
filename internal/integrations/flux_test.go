package integrations

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

func fluxBody(t *testing.T, mutate func(m map[string]any)) []byte {
	t.Helper()
	m := map[string]any{
		"involvedObject": map[string]any{"kind": "Kustomization", "namespace": "apps", "name": "payments"},
		"severity":       "info", "timestamp": "2026-09-28T08:00:00Z",
		"message": "Reconciliation finished", "reason": "ReconciliationSucceeded",
		"metadata": map[string]any{
			"kustomize.toolkit.fluxcd.io/revision": "main@sha1:731f7eaddfb6af01cb2173e18f0f75b0ba780ef1",
			"environment":                          "production",
		},
	}
	if mutate != nil {
		mutate(m)
	}
	b, err := json.Marshal(m)
	require.NoError(t, err)
	return b
}

func fluxConfig(t *testing.T) Config {
	t.Helper()
	cfg, err := LoadConfig(func(string) (string, bool) { return "", false })
	require.NoError(t, err)
	return cfg
}

func TestParseFlux(t *testing.T) {
	now := time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)

	t.Run("nominal", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, nil)

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)

		assert.Equal(t, "flux:production:Kustomization/apps/payments@main@sha1:731f7eaddfb6af01cb2173e18f0f75b0ba780ef1", obs.Key)
		assert.Equal(t, SourceFlux, obs.Source)
		assert.Equal(t, eventv1.Status_success, obs.Status)
		assert.True(t, obs.Terminal)
		assert.True(t, obs.At.Equal(now))
		assert.Equal(t, eventv1.Environment_production, obs.Environment)
		assert.Equal(t, ServiceHint{Name: "payments"}, obs.Service)
		assert.Equal(t, "731f7ead", obs.ShortRevision)
		assert.Equal(t, "flux", obs.Owner)
		assert.Equal(t, "flux:apps/payments", obs.User)
		assert.Equal(t, "Kustomization apps/payments\nRevision: main@sha1:731f7eaddfb6af01cb2173e18f0f75b0ba780ef1\nReason: ReconciliationSucceeded\nReconciliation finished", obs.Message)
		assert.Equal(t, "Deploy payments 731f7ead to production", obs.Title("payments"))
	})

	t.Run("environment via event.toolkit.fluxcd.io/environment", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			md := m["metadata"].(map[string]any)
			delete(md, "environment")
			md["event.toolkit.fluxcd.io/environment"] = "staging"
		})

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)
		assert.Equal(t, eventv1.Environment_preproduction, obs.Environment)
	})

	t.Run("environment lookup is case-insensitive", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			md := m["metadata"].(map[string]any)
			md["environment"] = "Production"
		})

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)
		assert.Equal(t, eventv1.Environment_production, obs.Environment)
	})

	t.Run("service via metadata service", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			md := m["metadata"].(map[string]any)
			md["service"] = "payments-api"
		})

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)
		assert.Equal(t, "payments-api", obs.Service.Name)
	})

	t.Run("service via event.toolkit.fluxcd.io/service", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			md := m["metadata"].(map[string]any)
			md["event.toolkit.fluxcd.io/service"] = "payments-api"
		})

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)
		assert.Equal(t, "payments-api", obs.Service.Name)
	})

	t.Run("HelmRelease revision is kept as is", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			m["involvedObject"] = map[string]any{"kind": "HelmRelease", "namespace": "apps", "name": "payments"}
			m["metadata"] = map[string]any{
				"helm.toolkit.fluxcd.io/revision": "1.2.3",
				"environment":                     "production",
			}
		})

		obs, err := ParseFlux(body, cfg, now)
		require.NoError(t, err)
		assert.Equal(t, "1.2.3", obs.ShortRevision)
	})

	t.Run("Kustomization with only the Helm revision key is missing revision", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			m["metadata"] = map[string]any{
				"helm.toolkit.fluxcd.io/revision": "1.2.3",
				"environment":                     "production",
			}
		})

		_, err := ParseFlux(body, cfg, now)
		var ignored *IgnoredError
		require.ErrorAs(t, err, &ignored)
		assert.Equal(t, ReasonMissingRevision, ignored.Reason)
	})

	t.Run("unsupported kind GitRepository is ignored", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			m["involvedObject"] = map[string]any{"kind": "GitRepository", "namespace": "apps", "name": "payments"}
		})

		_, err := ParseFlux(body, cfg, now)
		var ignored *IgnoredError
		require.ErrorAs(t, err, &ignored)
		assert.Equal(t, ReasonUnsupportedKind, ignored.Reason)
	})

	t.Run("reason table", func(t *testing.T) {
		cases := []struct {
			severity string
			reason   string
			status   eventv1.Status
		}{
			{"info", "Progressing", eventv1.Status_start},
			{"info", "ReconciliationSucceeded", eventv1.Status_success},
			{"info", "InstallSucceeded", eventv1.Status_success},
			{"info", "UpgradeSucceeded", eventv1.Status_success},
			{"error", "ReconciliationFailed", eventv1.Status_failure},
			{"error", "HealthCheckFailed", eventv1.Status_failure},
			{"error", "BuildFailed", eventv1.Status_failure},
			{"error", "ValidationFailed", eventv1.Status_failure},
			{"error", "ArtifactFailed", eventv1.Status_failure},
			{"error", "InstallFailed", eventv1.Status_failure},
			{"error", "UpgradeFailed", eventv1.Status_failure},
			{"error", "TestFailed", eventv1.Status_failure},
			// helm-controller emits RollbackSucceeded at severity info
			// (corev1.EventTypeNormal), not error: see flux.go and the task
			// report. A rollback still means the upgrade failed.
			{"info", "RollbackSucceeded", eventv1.Status_failure},
		}
		for _, c := range cases {
			t.Run(c.severity+"/"+c.reason, func(t *testing.T) {
				cfg := fluxConfig(t)
				body := fluxBody(t, func(m map[string]any) {
					m["severity"] = c.severity
					m["reason"] = c.reason
				})

				obs, err := ParseFlux(body, cfg, now)
				require.NoError(t, err)
				assert.Equal(t, c.status, obs.Status)
			})
		}
	})

	t.Run("unsupported reasons are ignored", func(t *testing.T) {
		cases := []struct {
			severity string
			reason   string
		}{
			{"info", "DependencyNotReady"},
			{"info", "UninstallSucceeded"},
			{"error", "Progressing"},
			{"info", "ReconciliationFailed"},
			// Verified: helm-controller emits RollbackSucceeded at severity
			// info, never error, so this combination never occurs in
			// practice, but the table must still reject it.
			{"error", "RollbackSucceeded"},
		}
		for _, c := range cases {
			t.Run(c.severity+"/"+c.reason, func(t *testing.T) {
				cfg := fluxConfig(t)
				body := fluxBody(t, func(m map[string]any) {
					m["severity"] = c.severity
					m["reason"] = c.reason
				})

				_, err := ParseFlux(body, cfg, now)
				var ignored *IgnoredError
				require.ErrorAs(t, err, &ignored)
				assert.Equal(t, ReasonUnsupportedReason, ignored.Reason)
			})
		}
	})

	t.Run("unmapped environment", func(t *testing.T) {
		cases := []struct {
			name   string
			mutate func(m map[string]any)
		}{
			{"missing", func(m map[string]any) {
				delete(m["metadata"].(map[string]any), "environment")
			}},
			{"review", func(m map[string]any) {
				m["metadata"].(map[string]any)["environment"] = "review"
			}},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				cfg := fluxConfig(t)
				body := fluxBody(t, c.mutate)

				_, err := ParseFlux(body, cfg, now)
				var ignored *IgnoredError
				require.ErrorAs(t, err, &ignored)
				assert.Equal(t, ReasonUnmappedEnvironment, ignored.Reason)
			})
		}
	})

	t.Run("missing required fields", func(t *testing.T) {
		cases := []struct {
			name   string
			mutate func(m map[string]any)
		}{
			{"involvedObject.kind", func(m map[string]any) {
				m["involvedObject"].(map[string]any)["kind"] = ""
			}},
			{"involvedObject.name", func(m map[string]any) {
				m["involvedObject"].(map[string]any)["name"] = ""
			}},
			{"involvedObject.namespace", func(m map[string]any) {
				m["involvedObject"].(map[string]any)["namespace"] = ""
			}},
			{"severity", func(m map[string]any) {
				m["severity"] = ""
			}},
			{"reason", func(m map[string]any) {
				m["reason"] = ""
			}},
			{"timestamp", func(m map[string]any) {
				m["timestamp"] = ""
			}},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				cfg := fluxConfig(t)
				body := fluxBody(t, c.mutate)

				_, err := ParseFlux(body, cfg, now)
				var invalid *InvalidError
				require.ErrorAs(t, err, &invalid)
			})
		}
	})

	t.Run("timestamp is not a valid date", func(t *testing.T) {
		cfg := fluxConfig(t)
		body := fluxBody(t, func(m map[string]any) {
			m["timestamp"] = "not a date"
		})

		_, err := ParseFlux(body, cfg, now)
		var invalid *InvalidError
		require.ErrorAs(t, err, &invalid)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		cfg := fluxConfig(t)

		_, err := ParseFlux([]byte("{"), cfg, now)
		var invalid *InvalidError
		require.ErrorAs(t, err, &invalid)
	})

	t.Run("freshness", func(t *testing.T) {
		cases := []struct {
			name      string
			timestamp time.Time
			wantErr   error
		}{
			{"at tolerance boundary", now.Add(-5 * time.Minute), nil},
			{"just past lower bound", now.Add(-5*time.Minute - time.Second), ErrStaleTimestamp},
			{"just past upper bound", now.Add(5*time.Minute + time.Second), ErrStaleTimestamp},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				cfg := fluxConfig(t)
				body := fluxBody(t, func(m map[string]any) {
					m["timestamp"] = c.timestamp.Format(time.RFC3339)
				})

				_, err := ParseFlux(body, cfg, now)
				if c.wantErr == nil {
					require.NoError(t, err)
				} else {
					require.ErrorIs(t, err, c.wantErr)
				}
			})
		}

		t.Run("freshness is checked before kind", func(t *testing.T) {
			cfg := fluxConfig(t)
			body := fluxBody(t, func(m map[string]any) {
				m["involvedObject"] = map[string]any{"kind": "GitRepository", "namespace": "apps", "name": "payments"}
				m["timestamp"] = now.Add(-10 * time.Minute).Format(time.RFC3339)
			})

			_, err := ParseFlux(body, cfg, now)
			require.ErrorIs(t, err, ErrStaleTimestamp)
		})
	})
}

func TestShortRevision(t *testing.T) {
	cases := []struct {
		rev  string
		want string
	}{
		{"main@sha1:731f7eaddfb6af01cb2173e18f0f75b0ba780ef1", "731f7ead"},
		{"main/731f7eaddfb6af01cb2173e18f0f75b0ba780ef1", "731f7ead"},
		{"1.2.3", "1.2.3"},
		{"sha256:ABCDEF0123456789", "ABCDEF01"},
		{"abc", "abc"},
		{"v1.2.3", "v1.2.3"},
		{"", ""},
	}
	for _, c := range cases {
		t.Run(c.rev, func(t *testing.T) {
			assert.Equal(t, c.want, ShortRevision(c.rev))
		})
	}
}
