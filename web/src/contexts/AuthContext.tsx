import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi, getApiErrorStatus } from '../lib/authApi'
import {
  AUTH_FORBIDDEN_EVENT,
  AUTH_UNAUTHORIZED_EVENT,
  loginPathFor,
  onAuthEvent,
} from '../lib/authEvents'
import Toast from '../components/Toast'
import type { AuthConfig, Permission, Principal } from '../types/auth'
import { ANONYMOUS_FALLBACK, DEFAULT_CONFIG } from '../types/auth'

const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true'

export interface AuthContextValue {
  status: 'loading' | 'ready'
  principal: Principal
  config: AuthConfig
  hasPermission: (perm: Permission | string) => boolean
  inScope: (service: string) => boolean
  logout: () => Promise<void>
  reload: () => Promise<Principal>
  showToast: (message: string) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Resolves the principal after a rejected `/auth/me`: a refused session
 * (401/403) gets no permission at all, never the permissive fallback;
 * anything else (network, 5xx) falls back to the transitional anonymous
 * principal so the app stays usable while the backend is unreachable.
 */
function principalAfterMeFailure(reason: unknown): Principal {
  const httpStatus = getApiErrorStatus(reason)
  if (httpStatus === 401 || httpStatus === 403) {
    return { ...ANONYMOUS_FALLBACK, permissions: [] }
  }
  console.warn('auth: /auth/me unreachable, using the transitional anonymous principal', reason)
  return ANONYMOUS_FALLBACK
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-hud-bg flex items-center justify-center" role="progressbar" aria-label="Loading session">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgb(var(--hud-primary))', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState<'loading' | 'ready'>(isStaticMode ? 'ready' : 'loading')
  const [principal, setPrincipal] = useState<Principal>(ANONYMOUS_FALLBACK)
  const [config, setConfig] = useState<AuthConfig>(DEFAULT_CONFIG)
  const [toast, setToast] = useState<string | null>(null)
  // useLocation is refreshed on every render; the event handler reads the
  // latest value through a ref so the listener is registered once.
  const locationRef = useRef(location)
  locationRef.current = location

  const reload = useCallback(async (): Promise<Principal> => {
    if (isStaticMode) return ANONYMOUS_FALLBACK
    const [cfg, me] = await Promise.allSettled([authApi.getConfig(), authApi.me()])
    if (cfg.status === 'fulfilled') setConfig(cfg.value)
    const resolved = me.status === 'fulfilled' ? me.value : principalAfterMeFailure(me.reason)
    setPrincipal(resolved)
    setStatus('ready')
    return resolved
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const offUnauthorized = onAuthEvent(AUTH_UNAUTHORIZED_EVENT, () => {
      const current = locationRef.current
      if (current.pathname === '/login') return
      navigate(loginPathFor(current), { replace: true })
    })
    const offForbidden = onAuthEvent(AUTH_FORBIDDEN_EVENT, () => {
      setToast('Access denied: you do not have the required permission')
    })
    return () => {
      offUnauthorized()
      offForbidden()
    }
  }, [navigate])

  const hasPermission = useCallback(
    (perm: Permission | string) => principal.permissions.includes(perm),
    [principal.permissions],
  )

  const inScope = useCallback(
    (service: string) => principal.scopeAll || principal.scopeServices.includes(service),
    [principal.scopeAll, principal.scopeServices],
  )

  const logout = useCallback(async () => {
    // authApi.logout() rejecting propagates as-is: the session is still
    // alive server-side, so neither the principal nor the location change.
    await authApi.logout()
    let me: Principal
    try {
      me = await authApi.me()
    } catch (err) {
      me = principalAfterMeFailure(err)
    }
    // Set the anonymous principal and navigate in the same synchronous
    // block (no await between them) so React batches both: no protected
    // page gets a chance to render with an anonymous principal and its own
    // route guard's `/login?redirect=...`, only the plain `/login` below.
    setPrincipal(me)
    navigate('/login', { replace: true })
  }, [navigate])

  const showToast = useCallback((message: string) => setToast(message), [])
  const closeToast = useCallback(() => setToast(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, principal, config, hasPermission, inScope, logout, reload, showToast }),
    [status, principal, config, hasPermission, inScope, logout, reload, showToast],
  )

  return (
    <AuthContext.Provider value={value}>
      {status === 'loading' ? <LoadingScreen /> : children}
      {toast && <Toast message={toast} variant="error" duration={5000} onClose={closeToast} />}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with its provider, not itself a component
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
