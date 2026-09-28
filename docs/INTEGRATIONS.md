# Deployment integrations (GitLab and Flux)

Tracker can record deployments automatically from GitLab deployment webhooks and Flux
notification-controller alerts, without any change to your CI/CD pipelines or GitOps manifests
in most cases.

For each deployment, Tracker records one `deployment` event: created on the first notification
seen (usually a start), then updated in place as later notifications arrive for the same
deployment. `attributes.source` is `gitlab` or `flux`, `attributes.type` is `deployment`,
`attributes.priority` is always `P3`. Only environments listed in `INTEGRATION_ENVIRONMENTS` are
recorded; anything else is silently ignored (see [Troubleshooting](#troubleshooting)). By default
only `production` and `staging` are mapped, to `production` and `preproduction` respectively.

Both webhook sources are optional and independent: enable GitLab, Flux, both, or neither. An
endpoint only exists once its source is configured; otherwise it answers `404`.

## Tracker configuration

See [CONFIGURATION.md#deployment-integrations](CONFIGURATION.md#deployment-integrations) for the
full `INTEGRATION_*` variable reference.

Provide every secret (`INTEGRATION_GITLAB_SIGNING_TOKEN`, `INTEGRATION_GITLAB_SECRET_TOKEN`,
`INTEGRATION_FLUX_HMAC_KEY`) through a Kubernetes Secret (`env.valueFrom.secretKeyRef`) or your
organization's secrets manager, never inline in a ConfigMap or manifest. To rotate a secret,
change the environment variable and restart Tracker: only one value is accepted at a time, there
is no overlap window where both an old and a new value are valid.

## GitLab

Configure the webhook once, either at the group level (requires GitLab Premium or Ultimate) or,
failing that, per project (via the GitLab API, or Terraform's `gitlab_project_hook` resource).

- **URL**: `https://<tracker>/api/v1alpha1/integrations/gitlab/webhook`
- **Trigger**: "Deployment events" only. Leave every other trigger unchecked.
- **SSL verification**: enabled.
- **Custom headers**: none.
- **Secret**: prefer the signing token (see below). Copy the `whsec_...` value shown once into
  `INTEGRATION_GITLAB_SIGNING_TOKEN`.

GitLab offers two authentication mechanisms for webhooks; Tracker supports both, but never both
at once for the same request:

- **Signing token** (Standard Webhooks, GitLab 19.0 or later, confirm against your instance):
  recommended. It signs each delivery (`webhook-id`, `webhook-timestamp`, `webhook-signature`)
  and lets Tracker reject stale or replayed deliveries. Set
  `INTEGRATION_GITLAB_SIGNING_TOKEN=whsec_<base64>`.
- **Secret token** (legacy): for a GitLab instance that does not offer the signing token yet. Set
  `INTEGRATION_GITLAB_SECRET_TOKEN` and GitLab sends it back in `X-Gitlab-Token`, compared in
  constant time. There is no replay protection with this mechanism, which is why the signing
  token is preferred.

When `INTEGRATION_GITLAB_SIGNING_TOKEN` is set, the plain `X-Gitlab-Token` header is never
accepted, even if `INTEGRATION_GITLAB_SECRET_TOKEN` is also set (it is then ignored, with a
startup warning).

Test the webhook with GitLab's "Test" button, "Deployment events" entry: expect `200` or `202`.

### Environment mapping

The GitLab deployment `environment` field is matched by its first path segment (before the first
`/`), then by `environment_tier` if the first segment does not match. The Ansible, Terraform and
Docker Compose to-be-continuous templates already declare
`environment: name: ${ENV_TYPE}${<PREFIX>_ENVIRONMENT_NAMESPACE}`, so `production` and `staging`
match on the first segment with no pipeline change; a namespaced environment such as
`production-eu` falls back to `environment_tier`. `review/*` and `integration` environments are
not mapped by default and are recorded as `unmapped environment` (202, ignored).

No change is needed in your `.gitlab-ci.yml`: the deployment jobs already declare `environment:`.

### Status mapping

| GitLab status | Tracker status | Terminal | Note |
|---|---|---|---|
| `running` | `start` | no | takes the deployment lock, see [Locks](#locks) |
| `success` | `success` | yes | |
| `failed` | `failure` | yes | |
| `canceled` | `warning` | yes | changelog comment `Deployment canceled` |
| `blocked` | `waiting_approval` | no | |
| `rejected` | `close` | yes | |
| `approved` | (none) | | `202`, reason `approval not tracked` |
| anything else | (none) | | `202`, reason `unsupported status` |

Title, message and changelog: the event title is `Deploy <service> <short_sha> to <environment>`,
the message lists the commit title, short SHA, commit URL, deployment job URL and GitLab
environment name. The changelog entry and lock owner are attributed to `gitlab:<username>`.

## Flux

Flux notifications are needed because the `flux` to-be-continuous component, unlike the Ansible,
Terraform and Docker Compose components, does not declare an `environment:` block in the
pipeline: the actual deployment outcome only exists in the cluster, reported by Flux's
notification-controller.

One Secret, Provider and Alert per cluster (`INTEGRATION_FLUX_HMAC_KEY` must match the Secret's
`token`, 32 bytes minimum). Manage the Secret with your usual secrets pipeline (SOPS, External
Secrets); never commit it in clear text.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tracker-webhook
  namespace: flux-system
type: Opaque
stringData:
  token: "<same value as INTEGRATION_FLUX_HMAC_KEY, 32 bytes minimum>"
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: tracker
  namespace: flux-system
spec:
  type: generic-hmac
  address: https://tracker.example.com/api/v1alpha1/integrations/flux/webhook
  secretRef:
    name: tracker-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: tracker-deployments
  namespace: flux-system
spec:
  providerRef:
    name: tracker
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  eventMetadata:
    environment: production
```

Duplicate this set per cluster, changing `eventMetadata.environment` (for example `staging` on an
iso-prod cluster). `sha256` is the recommended and default HMAC algorithm for the `generic-hmac`
provider; `sha224`, `sha384` and `sha512` are also accepted.

To name the service explicitly, rather than falling back to the object name, annotate the
Kustomization or HelmRelease with `event.toolkit.fluxcd.io/service: <catalog name>`.

An `eventSources` entry without `namespace` only matches objects in the Alert's own namespace
(here `flux-system`). If your Kustomizations or HelmReleases live in other namespaces, add one
entry per namespace, or check whether your Flux version supports `namespace: "*"`.

### Status mapping

Only `Kustomization` and `HelmRelease` objects are processed; anything else is ignored (`202`,
reason `unsupported kind`).

| Severity | Reason | Tracker status |
|---|---|---|
| `info` | `Progressing` | `start` |
| `info` | `ReconciliationSucceeded`, `InstallSucceeded`, `UpgradeSucceeded` | `success` |
| `error` | `ReconciliationFailed`, `HealthCheckFailed`, `BuildFailed`, `ValidationFailed`, `ArtifactFailed`, `InstallFailed`, `UpgradeFailed`, `TestFailed` | `failure` |
| `info` (helm-controller emits it with normal severity) | `RollbackSucceeded` | `failure` |
| any | anything else (`DependencyNotReady`, `UninstallSucceeded`, ...) | `202`, reason `unsupported reason` |

A rollback (`RollbackSucceeded`) counts as a failed deployment: it only happens because the
preceding upgrade failed.

The changelog entry and lock owner are attributed to `flux:<namespace>/<name>`.

## Locks

A GitLab `running` deployment or a Flux `Progressing` event takes the `deployment` lock for the
service and environment, exactly like a manual deployment through the API.

If the lock is already held by someone else, the deployment is still recorded, without taking the
lock, with a changelog comment `Deployed while <service> was locked in <env> by <who>`. The
webhook still answers `200`: a lock conflict is never reported as an error to GitLab or Flux.

A terminal status (`success`, `failure`, `warning`, `close`) only releases the lock attached to
its own event; it never releases a lock held by an unrelated deployment or a manual operation.

## Service name

The deployment's service is resolved against the catalog:

1. GitLab: a catalog entry whose `repository` (normalized) equals the project's web or Git HTTP
   URL, normalized the same way. Flux: metadata key `service` (or, defensively,
   `event.toolkit.fluxcd.io/service`), if the annotation described above is set.
2. A catalog entry whose `name` equals the fallback name (GitLab: the last segment of
   `path_with_namespace`; Flux: `involvedObject.name`).
3. That fallback name, used as is, even if it matches no catalog entry.

The catalog snapshot used for this matching is cached for 60 seconds.

## Troubleshooting

### HTTP response codes

| Code | Meaning |
|---|---|
| `200` | Recorded: the deployment event was created or updated (including with a lock conflict). |
| `202` | Ignored: unmapped environment, unsupported event/object_kind/kind/status/reason, missing revision, or a duplicate/stale notification. See the reasons below. |
| `400` | Invalid payload: not JSON, or a required field is missing or malformed. |
| `401` | Authentication failure: missing or invalid signature, timestamp outside the tolerance window, or a rejected API key. |
| `404` | This source is not configured: the endpoint does not exist. |
| `413` | Request body larger than 1 MiB. |
| `500` | Storage failure. The sender should retry; retries are safe (see the reasons below). |

### `202` reasons

| Reason | Cause | Action |
|---|---|---|
| `unsupported event` | GitLab `X-Gitlab-Event` is not `Deployment Hook`. | Check the webhook only triggers on "Deployment events". |
| `unsupported object_kind` | GitLab payload `object_kind` is not `deployment`. | No action; GitLab occasionally sends other kinds on the same endpoint. |
| `unsupported kind` | Flux `involvedObject.kind` is neither `Kustomization` nor `HelmRelease`. | No action. |
| `unsupported status` | GitLab deployment `status` is not one Tracker maps (see the status table). | No action, unless you expect that status to be tracked; ask for it to be added. |
| `approval not tracked` | GitLab deployment `status` is `approved`. | No action; approvals are not recorded as events. |
| `unsupported reason` | Flux `reason` is not one Tracker maps (see the status table). | No action, unless you expect that reason to be tracked. |
| `unmapped environment` | The GitLab or Flux environment name has no entry in `INTEGRATION_ENVIRONMENTS`. | Add the environment to `INTEGRATION_ENVIRONMENTS` if it should be tracked. |
| `missing revision` | The Flux event has no `kustomize.toolkit.fluxcd.io/revision` or `helm.toolkit.fluxcd.io/revision` metadata. | Check the Kustomization or HelmRelease reports a revision; some early `Progressing` events do not. |
| `duplicate` | Same status, same timestamp as the last one applied. | No action; the sender likely retried a delivery. |
| `stale` | An older or already superseded notification for this deployment. | No action; out-of-order or replayed delivery, correctly discarded. |

### Metric

`tracker_integration_webhooks_total{source, result}` counts every webhook received exactly once.
`source` is `gitlab` or `flux`. `result` is one of `recorded`, `ignored`, `duplicate`,
`unauthorized`, `invalid`, `error` or `lock_conflict` (`lock_conflict` replaces `recorded` for
that request; `duplicate` also covers `stale`; `invalid` covers both `400` and `413`). A rejected
API key presented on these routes is counted only in `tracker_auth_requests_total`, not here.

## Security

The signature is verified on the raw request body, before any JSON decoding: a malformed or
oversized body never reaches the parser. `INTEGRATION_WEBHOOK_TOLERANCE` (default `5m`) bounds
how far a webhook's timestamp may drift from the server clock, in both directions, which limits
how long a captured delivery can be replayed.

A verified webhook grants no Tracker permission to the sender: it is authenticated as GitLab or
Flux, not as a Tracker principal, and can only ever result in a deployment event being recorded.
An API key that is malformed, unknown, revoked or expired and presented on these routes is still
rejected with `401`, same as on any other route (see
[AUTHENTICATION.md](AUTHENTICATION.md#api-keys)).
