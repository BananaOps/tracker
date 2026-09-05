export type Permission =
  | 'event:read'
  | 'event:write'
  | 'catalog:read'
  | 'catalog:write'
  | 'lock:read'
  | 'lock:write'
  | 'links:read'
  | 'links:write'
  | 'access:manage'

export const ALL_PERMISSIONS: Permission[] = [
  'event:read',
  'event:write',
  'catalog:read',
  'catalog:write',
  'lock:read',
  'lock:write',
  'links:read',
  'links:write',
  'access:manage',
]

export const PERMISSION_LABELS: Record<Permission, string> = {
  'event:read': 'Read events, drifts and RPA operations',
  'event:write': 'Create and edit events, drifts and RPA operations',
  'catalog:read': 'Read the service catalog',
  'catalog:write': 'Create and edit catalog services',
  'lock:read': 'Read locks',
  'lock:write': 'Create and release locks',
  'links:read': 'Read links',
  'links:write': 'Create and edit links',
  'access:manage': 'Manage users, teams and API keys',
}

/** Display grouping for the team dialog. */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: 'Events', permissions: ['event:read', 'event:write'] },
  { label: 'Catalog', permissions: ['catalog:read', 'catalog:write'] },
  { label: 'Locks', permissions: ['lock:read', 'lock:write'] },
  { label: 'Links', permissions: ['links:read', 'links:write'] },
  { label: 'Administration', permissions: ['access:manage'] },
]

export interface AuthConfig {
  localLoginEnabled: boolean
  oidcEnabled: boolean
  oidcButtonLabel: string
  anonymousPermissions: string[]
  demoMode: boolean
}

export interface TeamRef {
  id: string
  name: string
}

export type PrincipalKind = 'anonymous' | 'user' | 'apikey'

export interface Principal {
  authenticated: boolean
  kind: PrincipalKind
  userId: string
  username: string
  displayName: string
  /** "local" or "oidc" for users, empty otherwise. */
  source: string
  teams: TeamRef[]
  permissions: string[]
  scopeAll: boolean
  scopeServices: string[]
  mustChangePassword: boolean
  isAdmin: boolean
}

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  source: string
  teamIds: string[]
  disabled: boolean
  mustChangePassword: boolean
  createdAt?: string
  lastLoginAt?: string
}

export interface Team {
  id: string
  name: string
  description: string
  permissions: string[]
  scopeAll: boolean
  scopeServices: string[]
  oidcGroups: string[]
  builtin: boolean
}

export interface ApiKey {
  id: string
  prefix: string
  name: string
  /** Empty string for a global key. */
  teamId: string
  createdBy: string
  createdAt?: string
  expiresAt?: string
  lastUsedAt?: string
  revokedAt?: string
}

export interface CreateUserInput {
  username: string
  email: string
  displayName: string
  password: string
  teamIds: string[]
}

/** UpdateUser replaces every field: callers send the full current state. */
export interface UpdateUserInput {
  email: string
  displayName: string
  teamIds: string[]
  disabled: boolean
  /** Optional password reset for local users. */
  newPassword?: string
}

export interface TeamInput {
  name: string
  description: string
  permissions: string[]
  scopeAll: boolean
  scopeServices: string[]
  oidcGroups: string[]
}

export interface CreateApiKeyInput {
  name: string
  /** Empty string requests a global key (admins only). */
  teamId: string
  /** RFC3339 timestamp; omit for a key that never expires. */
  expiresAt?: string
}

export interface CreateApiKeyResult {
  apiKey: ApiKey
  /** Shown exactly once; never stored. */
  secret: string
}
