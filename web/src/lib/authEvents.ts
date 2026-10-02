// Bridges the axios layer (no React) and the AuthProvider (React): the
// interceptor emits window events, the provider listens and navigates.

export const AUTH_UNAUTHORIZED_EVENT = 'tracker:auth:unauthorized'
export const AUTH_FORBIDDEN_EVENT = 'tracker:auth:forbidden'

export interface AuthEventDetail {
  /** Request URL relative to the axios baseURL, e.g. "/events/list". */
  url: string
  status: number
}

type AuthEventName = typeof AUTH_UNAUTHORIZED_EVENT | typeof AUTH_FORBIDDEN_EVENT

/** 401 from these endpoints is a business answer handled by the calling form. */
const UNAUTHORIZED_EXEMPT = ['/auth/login', '/auth/password', '/auth/me', '/auth/config']
/** 403 from login is the cross-site guard; the login form shows it inline. */
const FORBIDDEN_EXEMPT = ['/auth/login']

function emit(name: AuthEventName, detail: AuthEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AuthEventDetail>(name, { detail }))
}

export function emitUnauthorized(url: string) {
  emit(AUTH_UNAUTHORIZED_EVENT, { url, status: 401 })
}

export function emitForbidden(url: string) {
  emit(AUTH_FORBIDDEN_EVENT, { url, status: 403 })
}

export function onAuthEvent(name: AuthEventName, handler: (detail: AuthEventDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<AuthEventDetail>).detail)
  window.addEventListener(name, listener)
  return () => window.removeEventListener(name, listener)
}

interface AxiosLikeError {
  isAxiosError?: boolean
  response?: { status?: number }
  config?: { url?: string; baseURL?: string }
}

function relativeUrl(err: AxiosLikeError): string {
  const url = err.config?.url ?? ''
  const base = err.config?.baseURL ?? ''
  return base && url.startsWith(base) ? url.slice(base.length) : url
}

function matches(url: string, exempt: string[]): boolean {
  const path = url.split('?')[0]
  return exempt.some((e) => path === e || path.endsWith(e))
}

/**
 * Inspects a rejected axios response and emits the matching auth event.
 * Safe to call with any value; non-axios errors are ignored.
 */
export function handleAuthError(error: unknown): void {
  if (!error || typeof error !== 'object') return
  const err = error as AxiosLikeError
  if (!err.isAxiosError || !err.response) return
  const status = err.response.status
  const url = relativeUrl(err)
  if (status === 401 && !matches(url, UNAUTHORIZED_EXEMPT)) emitUnauthorized(url)
  if (status === 403 && !matches(url, FORBIDDEN_EXEMPT)) emitForbidden(url)
}

export const DEFAULT_AFTER_LOGIN = '/dashboard'

/**
 * Validates a `redirect` query parameter: same-origin relative path only,
 * never the login page itself. Anything else falls back to the dashboard.
 */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_AFTER_LOGIN
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login/')) return DEFAULT_AFTER_LOGIN
  return raw
}

/** Login URL that brings the user back to `location` after signing in. */
export function loginPathFor(location: { pathname: string; search: string }): string {
  if (location.pathname === '/login') return `/login${location.search}`
  return `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
}
