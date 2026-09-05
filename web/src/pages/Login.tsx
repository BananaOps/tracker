import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, LogIn, Rocket } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authApi, getApiErrorMessage, getApiErrorStatus } from '../lib/authApi'
import { safeRedirect } from '../lib/authEvents'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

const OIDC_LOGIN_PATH = '/api/v1alpha1/auth/oidc/login'

function messageFor(err: unknown): string {
  switch (getApiErrorStatus(err)) {
    case 401:
      return 'Invalid username or password'
    case 429:
      return 'Too many attempts, wait a minute and try again'
    case 403:
      return 'Sign-in refused: open Tracker from its configured public URL'
    default:
      return getApiErrorMessage(err, 'Sign-in failed')
  }
}

export default function Login() {
  const { principal, config, reload } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = safeRedirect(params.get('redirect'))

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (principal.kind === 'user') {
    return <Navigate to={target} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await authApi.login(username.trim(), password)
      const me = await authApi.me()
      if (me.mustChangePassword) {
        navigate(`/account/password?redirect=${encodeURIComponent(target)}`, { replace: true })
        return
      }
      await reload()
      navigate(target, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setPassword('')
    } finally {
      setPending(false)
    }
  }

  const ssoHref = `${OIDC_LOGIN_PATH}?redirect=${encodeURIComponent(target)}`

  return (
    <div className="min-h-screen bg-hud-bg flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.65)' }}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#E8580A]">
            <Rocket className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-hud-on-surface leading-tight">Sign in to Tracker</h1>
            <p className="text-xs text-hud-on-surface-var">Use your account or your organisation SSO</p>
          </div>
        </div>

        {config.oidcEnabled && (
          <a
            href={ssoHref}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-md text-sm font-semibold text-white mb-4"
            style={{ background: 'rgb(var(--hud-primary))' }}
          >
            <KeyRound className="w-4 h-4" />
            {config.oidcButtonLabel}
          </a>
        )}

        {config.oidcEnabled && config.localLoginEnabled && (
          <div className="flex items-center gap-3 my-4 text-xs text-hud-on-surface-var">
            <span className="flex-1 h-px" style={{ background: 'rgb(var(--hud-outline-var))' }} />
            or
            <span className="flex-1 h-px" style={{ background: 'rgb(var(--hud-outline-var))' }} />
          </div>
        )}

        {config.localLoginEnabled && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm rounded-md px-3 py-2" style={{ color: 'rgb(var(--hud-error))', background: 'rgb(var(--hud-error) / 0.1)' }}>
                {error}
              </p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={pending || !username || !password}>
              <LogIn className="w-4 h-4" />
              Sign in
            </Button>
          </form>
        )}

        {!config.localLoginEnabled && !config.oidcEnabled && (
          <p className="text-sm text-hud-on-surface-var">No sign-in method is enabled on this instance.</p>
        )}
      </div>
    </div>
  )
}
