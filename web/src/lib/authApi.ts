import { isAxiosError } from 'axios'
import axiosInstance from './api'
import type {
  ApiKey,
  AuthConfig,
  CreateApiKeyInput,
  CreateApiKeyResult,
  CreateUserInput,
  Principal,
  PrincipalKind,
  Team,
  TeamInput,
  UpdateUserInput,
  User,
} from '../types/auth'

// The gateway emits lowerCamelCase JSON. Arrays are normalised to [] and
// strings to '' so components never branch on undefined.
type Raw = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function bool(v: unknown): boolean {
  return v === true
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined
}

function toKind(v: unknown): PrincipalKind {
  return v === 'user' || v === 'apikey' ? v : 'anonymous'
}

export function toPrincipal(raw: Raw): Principal {
  const username = str(raw.username)
  const teams = Array.isArray(raw.teams)
    ? (raw.teams as Raw[]).map((t) => ({ id: str(t.id), name: str(t.name) }))
    : []
  return {
    authenticated: bool(raw.authenticated),
    kind: toKind(raw.kind),
    userId: str(raw.userId),
    username,
    displayName: str(raw.displayName) || username,
    source: str(raw.source),
    teams,
    permissions: strings(raw.permissions),
    scopeAll: bool(raw.scopeAll),
    scopeServices: strings(raw.scopeServices),
    mustChangePassword: bool(raw.mustChangePassword),
    isAdmin: bool(raw.isAdmin),
  }
}

function toConfig(raw: Raw): AuthConfig {
  return {
    localLoginEnabled: bool(raw.localLoginEnabled),
    oidcEnabled: bool(raw.oidcEnabled),
    oidcButtonLabel: str(raw.oidcButtonLabel) || 'Sign in with SSO',
    anonymousPermissions: strings(raw.anonymousPermissions),
    demoMode: bool(raw.demoMode),
  }
}

function toUser(raw: Raw): User {
  return {
    id: str(raw.id),
    username: str(raw.username),
    email: str(raw.email),
    displayName: str(raw.displayName),
    source: str(raw.source),
    teamIds: strings(raw.teamIds),
    disabled: bool(raw.disabled),
    mustChangePassword: bool(raw.mustChangePassword),
    createdAt: optStr(raw.createdAt),
    lastLoginAt: optStr(raw.lastLoginAt),
  }
}

function toTeam(raw: Raw): Team {
  return {
    id: str(raw.id),
    name: str(raw.name),
    description: str(raw.description),
    permissions: strings(raw.permissions),
    scopeAll: bool(raw.scopeAll),
    scopeServices: strings(raw.scopeServices),
    oidcGroups: strings(raw.oidcGroups),
    builtin: bool(raw.builtin),
  }
}

function toApiKey(raw: Raw): ApiKey {
  return {
    id: str(raw.id),
    prefix: str(raw.prefix),
    name: str(raw.name),
    teamId: str(raw.teamId),
    createdBy: str(raw.createdBy),
    createdAt: optStr(raw.createdAt),
    expiresAt: optStr(raw.expiresAt),
    lastUsedAt: optStr(raw.lastUsedAt),
    revokedAt: optStr(raw.revokedAt),
  }
}

function list(raw: Raw, key: string): Raw[] {
  const v = raw[key]
  return Array.isArray(v) ? (v as Raw[]) : []
}

export const authApi = {
  getConfig: async (): Promise<AuthConfig> => {
    const { data } = await axiosInstance.get<Raw>('/auth/config')
    return toConfig(data)
  },

  me: async (): Promise<Principal> => {
    const { data } = await axiosInstance.get<Raw>('/auth/me')
    return toPrincipal(data)
  },

  login: async (username: string, password: string): Promise<void> => {
    await axiosInstance.post('/auth/login', { username, password })
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout')
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await axiosInstance.post('/auth/password', { currentPassword, newPassword })
  },

  listUsers: async (): Promise<User[]> => {
    const { data } = await axiosInstance.get<Raw>('/auth/users')
    return list(data, 'users').map(toUser)
  },

  createUser: async (input: CreateUserInput): Promise<User> => {
    const { data } = await axiosInstance.post<Raw>('/auth/users', input)
    return toUser((data.user as Raw) ?? {})
  },

  updateUser: async (id: string, input: UpdateUserInput): Promise<User> => {
    const body: Raw = {
      email: input.email,
      displayName: input.displayName,
      teamIds: input.teamIds,
      disabled: input.disabled,
    }
    if (input.newPassword) body.newPassword = input.newPassword
    const { data } = await axiosInstance.put<Raw>(`/auth/users/${encodeURIComponent(id)}`, body)
    return toUser((data.user as Raw) ?? {})
  },

  listTeams: async (): Promise<Team[]> => {
    const { data } = await axiosInstance.get<Raw>('/auth/teams')
    return list(data, 'teams').map(toTeam)
  },

  createTeam: async (input: TeamInput): Promise<Team> => {
    const { data } = await axiosInstance.post<Raw>('/auth/teams', input)
    return toTeam((data.team as Raw) ?? {})
  },

  updateTeam: async (id: string, input: TeamInput): Promise<Team> => {
    const { data } = await axiosInstance.put<Raw>(`/auth/teams/${encodeURIComponent(id)}`, input)
    return toTeam((data.team as Raw) ?? {})
  },

  deleteTeam: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/auth/teams/${encodeURIComponent(id)}`)
  },

  listApiKeys: async (): Promise<ApiKey[]> => {
    const { data } = await axiosInstance.get<Raw>('/auth/api-keys')
    return list(data, 'apiKeys').map(toApiKey)
  },

  createApiKey: async (input: CreateApiKeyInput): Promise<CreateApiKeyResult> => {
    const body: Raw = { name: input.name, teamId: input.teamId }
    if (input.expiresAt) body.expiresAt = input.expiresAt
    const { data } = await axiosInstance.post<Raw>('/auth/api-keys', body)
    return { apiKey: toApiKey((data.apiKey as Raw) ?? {}), secret: str(data.secret) }
  },

  revokeApiKey: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/auth/api-keys/${encodeURIComponent(id)}`)
  },
}

/** HTTP status of an axios error, undefined for anything else. */
export function getApiErrorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined
}

/**
 * Human message from either error shape the backend produces:
 * `{error}` (cookie endpoints) or `{message}` (grpc-gateway).
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback
  const data = err.response?.data as Raw | undefined
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error) return data.error
    if (typeof data.message === 'string' && data.message) return data.message
  }
  return fallback
}
