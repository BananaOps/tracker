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

The account is flagged `mustChangePassword`, and the server enforces it: until
the password is changed, the account can only read `/auth/me` and
`/auth/config`, sign out and change its password. Every other API call is
refused: HTTP 403 with `password change required`, or gRPC `PermissionDenied`
(counted as `tracker_auth_requests_total{result="password_change_required"}`).
The web assets, `/config.js` and the API docs stay reachable, as they serve no
data. The same applies to any local user created or reset by an administrator.
On a reset, the user's existing sessions are signed out (the session version is
bumped, they answer 401) and the restriction applies from the next login. API
keys are never affected. Change the password right away:

```bash
curl -c jar -X POST http://localhost:8080/api/v1alpha1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<generated>"}'
curl -b jar -c jar -X POST http://localhost:8080/api/v1alpha1/auth/password \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword":"<generated>","newPassword":"<new strong password>"}'
```

Changing the password reissues the session cookie (the cookie jar above keeps
the new one), so no new login is needed afterwards.

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
| `GET /api/v1alpha1/auth/oidc/login` | Starts an OpenID Connect login and redirects to the identity provider. Only when OIDC is enabled, `404` otherwise. See [Single Sign-On](#single-sign-on-openid-connect). |
| `GET /api/v1alpha1/auth/oidc/callback` | Redirect URI of the identity provider. Only when OIDC is enabled, `404` otherwise. |

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

## Single Sign-On (OpenID Connect)

Tracker can sign users in through any OpenID Connect identity provider (IdP):
Keycloak, Microsoft Entra ID, Google, GitLab, Dex and others. It uses the
Authorization Code flow with PKCE (`S256`), a random `state` and a `nonce`.
The `id_token` is verified for signature, issuer, audience, expiry and nonce.
Only the `id_token` is read: Tracker never calls the userinfo endpoint, so
every claim it needs must be in the `id_token`.

The local `admin` account keeps working next to SSO and is the way back in
when the IdP is misconfigured or down. SSO is off unless `AUTH_OIDC_ISSUER` is
set. When it is on, `GET /api/v1alpha1/auth/config` reports `oidcEnabled` and
`oidcButtonLabel`. The Single Sign-On button of the login page ships with the
web PR #201: until it is merged, start a login by opening
`/api/v1alpha1/auth/oidc/login` directly.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_OIDC_ISSUER` | - | Issuer URL of the IdP. Enables SSO when set. Absolute `https` URL without query or fragment (`http` only for `localhost` and loopback IPs). It must match the `iss` of the tokens exactly, trailing slash included. |
| `AUTH_OIDC_CLIENT_ID` | - | Client ID. Required when the issuer is set. |
| `AUTH_OIDC_CLIENT_SECRET` | - | Client secret. Required when the issuer is set (confidential client). Never logged. |
| `AUTH_OIDC_SCOPES` | `openid profile email` | Requested scopes, separated by spaces or commas. `openid` is always added first. |
| `AUTH_OIDC_GROUPS_CLAIM` | `groups` | Name of the `id_token` claim carrying the groups: an array of strings or a single string. |
| `AUTH_OIDC_USERNAME_CLAIM` | `preferred_username` | Claim used as the Tracker username. When it is missing or not a valid username, `email` is tried. |
| `AUTH_OIDC_USER_PROVISIONING` | `true` | Create the Tracker account at first login. When `false`, only users already known to Tracker can sign in. |
| `AUTH_OIDC_TEAM_SYNC` | `true` | Synchronize team membership from the groups claim at each login. |
| `AUTH_OIDC_BUTTON_LABEL` | `Single Sign-On` | Label of the login button, at most 64 characters. |
| `AUTH_PUBLIC_URL` | - | Required with OIDC. `scheme://host[:port]` without path: it is the base of the redirect URI. |

Startup fails with a message naming the variable when the configuration is
invalid: an issuer that is not `https` (outside loopback), a missing client ID
or client secret, a client ID or secret without an issuer, a missing or
path-bearing `AUTH_PUBLIC_URL`, a boolean that is not `true` or `false`, or a
button label over 64 characters. Pass the client secret through a secret
manager or a Kubernetes `Secret`, never in an image or a committed file.

Register this redirect URI with the IdP:

```
<AUTH_PUBLIC_URL>/api/v1alpha1/auth/oidc/callback
```

The redirect URI is compared exactly by most IdPs: scheme, host, port and
path must match `AUTH_PUBLIC_URL`. The transaction cookie is encrypted with a
key derived from the session secret, so replicas must share `AUTH_SESSION_SECRET`
(or the persisted secret in MongoDB).

Discovery (`/.well-known/openid-configuration`) is lazy. Tracker starts, and
the local login works, even when the IdP is unreachable. Discovery is tried
in the background at startup and again on the next SSO login, at most every
5 seconds after a failure. While the IdP is down, SSO logins end on
`oidc_unavailable` and users sign in with `admin` to keep managing Tracker.

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1alpha1/auth/oidc/login?redirect=/path` | Starts the login. `redirect` is where the user lands afterwards; only a local absolute path is accepted, anything else becomes `/`. |
| `GET /api/v1alpha1/auth/oidc/callback` | Receives the IdP response, creates the session and redirects. |

Both answer `404` when `AUTH_OIDC_ISSUER` is not set.

### Accounts

- An OIDC account is identified by the pair `(issuer, subject)`. It is never
  linked to an existing account by username or email, so a local account, or
  an account of another IdP, cannot be taken over by claiming its name.
- At first login the account is created with the username taken from
  `AUTH_OIDC_USERNAME_CLAIM` (then `email`), and no team. When the username
  is already taken, a suffix is added: `alice`, then `alice-2`, `alice-3`...
- The username is frozen at creation. Email and display name are refreshed at
  every login. The display name comes from `name`, then `given_name` and
  `family_name`, then the username.
- OIDC accounts have no Tracker password: `POST /api/v1alpha1/auth/password`
  answers `400` and administrators cannot set one.
- An administrator can disable an OIDC account in Tracker. Its next login is
  refused with a `403` page.
- With `AUTH_OIDC_USER_PROVISIONING=false`, a user who is not known yet gets a
  `403` page. Only accounts already known by their `(issuer, subject)` pair, that
is created by an earlier login while provisioning was on, can sign in.
- Changing `AUTH_OIDC_ISSUER` to another value creates new accounts: the
  identity is bound to the issuer. Keep the issuer stable.

### Teams

With `AUTH_OIDC_TEAM_SYNC=true`, a team lists its OIDC groups in `oidcGroups`
(see [Teams](#teams)). At each login:

- The user joins every team having at least one group in common with the
  groups claim, and leaves every other team that has `oidcGroups`.
- Comparison is exact and case sensitive.
- Teams without `oidcGroups` are never touched: their members are managed by
  hand in Tracker. A manual membership in a team that has `oidcGroups` is
  overwritten at the next login.
- `Administrators` is synchronized only if it has `oidcGroups`. The last
  enabled member of `Administrators` is never removed by a sync (the server
  logs an error when it keeps them).
- A group claim that is present but empty means "no group": the user leaves
  all mapped teams.
- If at least one team has `oidcGroups` and the claim is **absent** from the
  `id_token`, the result depends on the user. A user who already holds a
  membership in a team that has `oidcGroups` is refused with `oidc_failed` and
  nothing is written (no account creation, no profile refresh, no membership
  change), so a broken IdP mapper cannot silently strip anybody of their
  rights. A user who holds no such membership, a first login included, is
  treated as having no group: the login succeeds, no mapped team is added and
  the server logs a `WARN` (`auth.oidc.sync`, reason
  `groups_claim_missing_accepted`, with the claim name and the username).
- A claim that is neither a string nor an array (object, number, boolean,
  `null`) is treated exactly like an absent claim, and the server logs a `WARN`
  with reason `groups_claim_unexpected_type`. In an array, entries that are not
  strings are ignored.

> **Recommended: configure the IdP so the groups claim is always emitted in
> the `id_token`, as an empty array for users who have no group.** Many IdPs
> omit the claim for such users. That is harmless for a user without a mapped
> membership, but a user who already holds one is refused as soon as the claim
> goes missing, instead of being removed from the mapped teams. Check the
> claim by decoding a test `id_token`, and see the IdP recipes below.

Without team mapping (`AUTH_OIDC_TEAM_SYNC=false`, or no team has
`oidcGroups`), no groups claim is needed and teams are managed by hand.

### Security notes

- The login transaction (state, nonce, PKCE verifier, redirect) lives in the
  encrypted `tracker_oidc` cookie: `HttpOnly`, valid 10 minutes, `Path` set to
  the callback route and `Secure` under the same rule as the session cookie.
  It is `SameSite=Lax`, not `Strict`, because the callback is a cross-site
  top level navigation coming from the IdP, and a `Strict` cookie would not be
  sent. It is deleted on every callback.
- There is one login in progress per browser: starting a second login, for
  example in another tab, replaces the first transaction and the first tab
  ends on `oidc_state`.
- The Tracker session is independent of the IdP session. Disabling a user in
  the IdP does not revoke their existing Tracker session before
  `AUTH_SESSION_TTL` expires: disable the account in Tracker too, which
  invalidates its sessions. Logging out of Tracker does not log out of the IdP.
- Values received from the IdP are never reflected: error codes below are
  constants, and the IdP error text only goes to the server logs.

### Errors

A failed login redirects to `/login?error=<code>`:

| Code | Meaning |
|------|---------|
| `oidc_denied` | The IdP returned an error (user cancelled, access denied, client not allowed). |
| `oidc_state` | The login transaction is missing, expired (10 minutes), unreadable or does not match the `state`. |
| `oidc_failed` | Code exchange failed (including a token endpoint that is unreachable or answers with an error), `id_token` verification failed, the token has no usable username, the groups claim is missing for a user who holds a mapped team membership, or an internal error occurred. |
| `oidc_unavailable` | Discovery of the IdP failed: at the start of the login, or at the callback when discovery had not succeeded yet. |

Two refusals are shown on a `403` page instead: the account is not registered
in Tracker (provisioning disabled) and the Tracker account is disabled.

The web login page does not display the `?error=` code yet: a follow-up will
add it. Until then, read the reason in the server logs, where every failure is
an `auth.login` entry with `method=oidc` and a `reason` (`state_mismatch`,
`transaction_missing`, `id_token_verification_failed`, `not_provisioned`,
`user_disabled`, `provider_unavailable`...). Team sync problems are logged as
`auth.oidc.sync` (`groups_claim_missing`, and the warnings
`groups_claim_missing_accepted` and `groups_claim_unexpected_type`). Secrets, codes, tokens and cookie
values are never logged.

### Identity provider recipes

In every recipe, use the redirect URI above, keep a confidential client, and
set `AUTH_PUBLIC_URL` to the URL users type in their browser.

#### Keycloak

1. In the realm, create a client of type OpenID Connect. Enable Client
   authentication (confidential) and the Standard flow only.
2. In Advanced settings, set the PKCE Code Challenge Method to `S256`.
3. Add the redirect URI in Valid redirect URIs. Copy the client secret from
   the Credentials tab.
4. Add a mapper of type Group Membership to the client's dedicated scope, with
   Token Claim Name `groups` and Add to ID token enabled. Keycloak puts the
   claim in the token from the user's groups; check the result for a user who
   has no group (Client scopes, Evaluate tab, generated ID token) and adapt the
   mapper if the claim is missing. Full group path is your choice: when it is
   on, values look like `/parent/child`, and that is what `oidcGroups` must
   contain.

```bash
AUTH_OIDC_ISSUER=https://keycloak.example.com/realms/<realm>
AUTH_OIDC_CLIENT_ID=tracker
AUTH_OIDC_CLIENT_SECRET=<from the Credentials tab>
```

#### Microsoft Entra ID

1. In App registrations, create an application. Add the Web platform with the
   redirect URI, and create a client secret in Certificates and secrets.
2. In Token configuration, choose Add groups claim. Pick Security groups, or
   Groups assigned to the application for large tenants. Group values are
   Object IDs (GUIDs): put those in `oidcGroups`.
3. Groups overage: an `id_token` (JWT) carries at most 200 groups. Above that,
   Entra removes the `groups` claim and sends `_claim_names` instead, which
   Tracker does not follow. Users in that case are treated as having no group,
   or refused with `oidc_failed` if they already hold a mapped membership.
   Prevent it with Groups assigned to the application, which restricts the
   claim to the groups assigned to the app (Enterprise applications, Users and
   groups), or with app roles: define roles, assign them to groups, and set
   `AUTH_OIDC_GROUPS_CLAIM=roles`.
4. Whether the claim appears for users with no group depends on the tenant
   setup: check the `id_token` of such a user, and check the Microsoft
   documentation if it is absent.
5. `preferred_username` is the user principal name (UPN).

```bash
AUTH_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
AUTH_OIDC_CLIENT_ID=<application (client) ID>
AUTH_OIDC_CLIENT_SECRET=<client secret value>
```

#### Google

Create an OAuth client of type Web application in the Google Cloud console and
add the redirect URI. Google issues no groups claim in its `id_token`, so team
mapping cannot work: set `AUTH_OIDC_TEAM_SYNC=false` and manage team
membership by hand. Use the email as username. To restrict access to your
organization, set the OAuth consent screen user type to Internal. Google adds
an `hd` claim for Workspace accounts, but Tracker does not check it.

```bash
AUTH_OIDC_ISSUER=https://accounts.google.com
AUTH_OIDC_CLIENT_ID=<id>.apps.googleusercontent.com
AUTH_OIDC_CLIENT_SECRET=<secret>
AUTH_OIDC_USERNAME_CLAIM=email
AUTH_OIDC_TEAM_SYNC=false
```

#### GitLab

Create an application (instance, group or user level), confidential, with the
redirect URI and the scopes `openid`, `profile` and `email`. Per the GitLab
documentation, the `id_token` carries the `groups_direct` claim (direct group
memberships), while `groups` is only served by the userinfo endpoint, which
Tracker does not call. Use `groups_direct`, and check on your GitLab version
that it is present in a test `id_token`. Check the GitLab documentation for
the claim format.

```bash
AUTH_OIDC_ISSUER=https://gitlab.com   # or the URL of your instance
AUTH_OIDC_CLIENT_ID=<application ID>
AUTH_OIDC_CLIENT_SECRET=<secret>
AUTH_OIDC_GROUPS_CLAIM=groups_direct
```

#### Dex

Add a static client and request the `groups` scope, which makes Dex put the
user's groups in the `id_token`. Which groups Dex knows depends on the
connector (LDAP, GitHub, GitLab, OIDC...): check the connector documentation,
including what is emitted for a user without groups.

```yaml
staticClients:
  - id: tracker
    name: Tracker
    secret: <secret>
    redirectURIs:
      - https://tracker.example.com/api/v1alpha1/auth/oidc/callback
```

```bash
AUTH_OIDC_ISSUER=https://dex.example.com
AUTH_OIDC_CLIENT_ID=tracker
AUTH_OIDC_CLIENT_SECRET=<secret>
AUTH_OIDC_SCOPES=openid profile email groups
```

### Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `oidc_failed`, log `id_token_verification_failed`, issuer mismatch | `AUTH_OIDC_ISSUER` differs from the `iss` claim, often by a trailing slash. Copy the `issuer` from the IdP discovery document. |
| The IdP shows a `redirect_uri` error | The registered URI is not exactly `<AUTH_PUBLIC_URL>/api/v1alpha1/auth/oidc/callback`. Check scheme, host, port. |
| `oidc_failed`, log `id_token_verification_failed`, token expired | Clock skew between Tracker and the IdP. Fix NTP on the hosts. |
| `oidc_failed`, log `groups_claim_missing` | A user who already holds a mapped team membership signed in with an `id_token` that has no claim named `AUTH_OIDC_GROUPS_CLAIM`. Nothing was changed. Decode a test `id_token`, check the claim name and that the mapper adds it to the ID token (not only the access token). Emitting an empty array for users without groups is recommended. |
| Users land in the wrong teams | `oidcGroups` values must equal the claim values exactly (Object IDs on Entra, `/parent/child` with Keycloak full paths). |
| Loop back to login with `oidc_state` | The `tracker_oidc` cookie was not returned: `AUTH_PUBLIC_URL` is `http` while the site is served over `https` (or the reverse), the host used in the browser differs from the one in `AUTH_PUBLIC_URL`, a proxy strips cookies, or two tabs started a login. Retry with a single tab. |
| `oidc_unavailable` | Discovery of the IdP failed (network, DNS, TLS trust). An unreachable token endpoint ends on `oidc_failed` instead. Sign in with `admin`, fix the network, and retry: discovery is retried on the next login. |
| `403` "not registered in Tracker" | `AUTH_OIDC_USER_PROVISIONING=false` and the user has never signed in. |

## Teams

A team carries a list of permissions, an optional list of catalog services
(empty means every service; per-service filtering is enforced in a later
release) and optional OIDC group names (see
[Single Sign-On](#single-sign-on-openid-connect)). Users belong
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
in `allowed`, `unauthenticated`, `denied`, `password_change_required`.

`tracker_auth_logins_total{method,result}` counts login attempts, with
`method` in `local`, `oidc` and `result` in `success`, `failure`,
`rate_limited`. Malformed bodies, cross-site refusals and internal errors are
not login attempts and are not counted. For `oidc`, a callback is counted when
it carries a valid login transaction (a callback with a missing or invalid
transaction is not), and so is a login start that fails
because the identity provider is unreachable.
