# Authentication and Access Control

Tracker authenticates every request and authorizes it against a small set of
permissions. Rights are granted to teams; users and API keys inherit the
rights of their teams.

## Permissions

| Permission | Grants |
|------------|--------|
| `event:read` | Read events, stats and changelogs |
| `event:write` | Create, update and delete events |
| `catalog:read` | Read the service catalog |
| `catalog:write` | Create, update and delete catalog entries |
| `lock:read` | List and read locks |
| `lock:write` | Create, update and release locks |
| `links:read` | Read custom links and Homer links |
| `links:write` | Manage custom links |
| `access:manage` | Manage users, teams and API keys |

`access:manage` is effectively full administrative control, not just user
management: a caller holding it can add itself to `Administrators` through
`UpdateUser`, or mint an API key on that team, and reach every permission
that way. Grant it as you would grant root.

Every gRPC method and REST route maps to exactly one permission. A method
missing from the mapping is refused. An anonymous caller lacking the
permission receives `401 Unauthorized` (gRPC `UNAUTHENTICATED`); an
authenticated caller lacking it receives `403 Forbidden`
(`PERMISSION_DENIED`).

## Anonymous access

`AUTH_ANONYMOUS_PERMISSIONS` lists the permissions granted without
credentials. When it is set, its value is used as is, even when empty. When
it is unset, the default is the read-only set
`event:read,catalog:read,lock:read,links:read` if `DEMO_MODE=true`, otherwise
every permission except `access:manage` (transitional default, so existing
installations keep working; the server logs a warning at startup, and the
default becomes empty in the next major release).

Set it to an empty value to require authentication everywhere:

```bash
AUTH_ANONYMOUS_PERMISSIONS=
```

## Initial administrator

On first start with an empty user collection, Tracker creates the built-in
team `Administrators` (every permission, every service) and a local user
`admin` in it. The password comes from `AUTH_ADMIN_PASSWORD`, or is generated
and printed once in the logs:

```
WARN Initial admin account created with a generated password. Change it at first login. username=admin password=...
```

The account is flagged `mustChangePassword`. Change it right away:

```bash
curl -c jar -X POST http://localhost:8080/api/v1alpha1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<generated>"}'
curl -b jar -c jar -X POST http://localhost:8080/api/v1alpha1/auth/password \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword":"<generated>","newPassword":"<new strong password>"}'
```

Passwords are hashed with Argon2id and must be 12 to 128 characters long.

## Sessions

Login sets an `HttpOnly`, `SameSite=Lax` cookie named `tracker_session`
valid for `AUTH_SESSION_TTL` (default 12 hours). The cookie is `Secure` when
`AUTH_PUBLIC_URL` starts with `https://` or `AUTH_COOKIE_SECURE=true`.
Changing a password, disabling a user or resetting its password invalidates
existing sessions. Five failed logins for the same username and IP within a
minute block further attempts for a minute. The client IP is the peer address
of the connection, unless `AUTH_TRUST_PROXY=true`, in which case it is the last
entry of `X-Forwarded-For`, the one appended by the reverse proxy. The earlier
entries are client controlled and must not be trusted.

A session token that no longer resolves, because it expired, was signed with
another secret, or its user was disabled or bumped, is refused with `401` when
it arrives in an `Authorization: Bearer` header. In the `tracker_session`
cookie it falls back to anonymous instead: the cookie is ambient, a browser
keeps sending a stale one on its own, and a `401` there would also cover the
SPA and the login page the user needs to recover.

Logout is stateless: it only clears the cookie, so a session token stolen
beforehand stays valid until its own expiry (`AUTH_SESSION_TTL`, 12 hours by
default). Changing the user's password, disabling the user or resetting its
password bumps the session version and is the only way to revoke a token
early.

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1alpha1/auth/login` | Body `{"username","password"}`. `204` and cookie on success, `401` otherwise, `429` when rate limited. |
| `POST /api/v1alpha1/auth/logout` | Clears the cookie. |
| `POST /api/v1alpha1/auth/password` | Body `{"currentPassword","newPassword"}`. Requires a session. |
| `GET /api/v1alpha1/auth/me` | Identity, teams and effective permissions of the caller. Public. |
| `GET /api/v1alpha1/auth/config` | Login options and anonymous permissions. Public. |

### Browser cross-site requests

`SameSite=Lax` still lets a browser attach the session cookie to a top level
cross-site `GET` navigation, and the API keeps a write behind a `GET` binding
(`GET /api/v1alpha1/unlock/{id}`). A request is therefore treated as
cross-site when `Sec-Fetch-Site` is anything other than `same-origin`,
`same-site` or `none`, or, when that header is missing, when the `Origin`
header does not match `AUTH_PUBLIC_URL` (or the request scheme and `Host`
when `AUTH_PUBLIC_URL` is unset).

On such a request the session cookie is ignored and the caller is anonymous,
so it gets whatever `AUTH_ANONYMOUS_PERMISSIONS` grants and nothing more.
`POST /api/v1alpha1/auth/login` goes further and answers `403` before doing
any password work. API keys and `Authorization: Bearer` tokens are explicit
credentials, not ambient ones, and are never dropped. Requests carrying
neither header, which is every non browser client, are unaffected.

## Teams

A team carries a list of permissions, an optional list of catalog services
(empty means every service; per-service filtering is enforced in a later
release) and optional OIDC group names (used once OIDC lands). Users belong
to any number of teams and get the union of their rights. The built-in
`Administrators` team cannot be renamed, deleted or stripped of permissions.

| Endpoint | Permission |
|----------|------------|
| `GET/POST /api/v1alpha1/auth/teams` | `access:manage` |
| `PUT/DELETE /api/v1alpha1/auth/teams/{id}` | `access:manage` |
| `GET/POST /api/v1alpha1/auth/users` | `access:manage` |
| `PUT /api/v1alpha1/auth/users/{id}` | `access:manage` |

Deleting a team detaches its users and revokes its API keys. The last
enabled member of `Administrators` cannot be disabled or removed from the
team, and nobody can disable their own account.

## API keys

API keys are meant for automation (CI, the MCP server, scripts). A key
belongs to a team and inherits its rights, or is global (every permission)
when created without a team, which only members of `Administrators` may do.
A global API key is a full administrator credential.

| Endpoint | Permission |
|----------|------------|
| `GET /api/v1alpha1/auth/api-keys` | `access:manage` |
| `POST /api/v1alpha1/auth/api-keys` | `access:manage` |
| `DELETE /api/v1alpha1/auth/api-keys/{id}` | `access:manage` |

```bash
curl -b jar -X POST http://localhost:8080/api/v1alpha1/auth/api-keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci","teamId":"<team id>","expiresAt":"2027-01-01T00:00:00Z"}'
```

The response contains the secret exactly once. Keys look like
`trk_<prefix>_<random>`; only a SHA-256 hash is stored. Present the key in
either header:

```
X-Api-Key: trk_...
Authorization: Bearer trk_...
```

For gRPC, send the same value in the `x-api-key` or `authorization`
metadata.

An API key that is malformed, unknown, revoked or expired is refused with
`401 Unauthorized` (gRPC `UNAUTHENTICATED`) on every route, public ones
included. It does **not** fall back to the anonymous principal: that would
hand a dead credential whatever `AUTH_ANONYMOUS_PERMISSIONS` grants, which
under the transitional default is wider than most keys carry. Revoking a key
limited to `event:read` would then silently promote it to `event:write`
instead of shutting it down.

Presenting no credential at all is unchanged: the caller is anonymous and gets
the anonymous permissions.

## Metrics

`tracker_auth_requests_total{principal,result}` counts authorization
decisions, with `principal` in `anonymous`, `user`, `apikey` and `result`
in `allowed`, `unauthenticated`, `denied`.

`tracker_auth_logins_total{method,result}` counts login attempts, with
`method` in `local` (`oidc` once it lands) and `result` in `success`,
`failure`, `rate_limited`. Malformed bodies, cross-site refusals and internal
errors are not login attempts and are not counted.
