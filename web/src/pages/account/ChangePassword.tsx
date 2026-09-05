import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authApi, getApiErrorMessage, getApiErrorStatus } from '../../lib/authApi'
import { safeRedirect } from '../../lib/authEvents'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

/** Mirrors the PR 1 password policy minimum; the backend stays authoritative. */
const MIN_PASSWORD_LENGTH = 12

function messageFor(err: unknown): string {
  switch (getApiErrorStatus(err)) {
    case 401:
      return 'Current password is incorrect'
    case 400:
      return getApiErrorMessage(err, 'The new password was rejected')
    default:
      return getApiErrorMessage(err, 'Could not change the password')
  }
}

export default function ChangePassword() {
  const { principal, reload } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = safeRedirect(params.get('redirect'))

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isLocal = principal.source === 'local'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      return
    }
    if (newPassword !== confirm) {
      setError('The new password and its confirmation do not match')
      return
    }
    if (newPassword === currentPassword) {
      setError('The new password must differ from the current one')
      return
    }
    setPending(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      await reload()
      navigate(target, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setCurrentPassword('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div
        className="max-w-md mx-auto rounded-lg p-6"
        style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.65)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5" style={{ color: 'rgb(var(--hud-primary))' }} />
          <h1 className="text-lg font-semibold text-hud-on-surface">Change password</h1>
        </div>
        <p className="text-sm text-hud-on-surface-var mb-5">
          Signed in as <span className="font-medium text-hud-on-surface">{principal.username}</span>
        </p>

        {!isLocal ? (
          <p className="text-sm text-hud-on-surface-var">
            Your password is managed by your identity provider. Change it there.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {principal.mustChangePassword && (
              <div
                className="flex items-start gap-2 text-sm rounded-md px-3 py-2"
                style={{ color: 'rgb(var(--hud-warning))', background: 'rgb(var(--hud-warning) / 0.1)' }}
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>You must choose a new password before continuing.</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current password</Label>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">New password</Label>
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-hud-on-surface-var">At least {MIN_PASSWORD_LENGTH} characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Confirm new password</Label>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm rounded-md px-3 py-2" style={{ color: 'rgb(var(--hud-error))', background: 'rgb(var(--hud-error) / 0.1)' }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending || !currentPassword || !newPassword || !confirm}>
              Change password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
