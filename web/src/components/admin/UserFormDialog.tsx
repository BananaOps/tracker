import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { FieldRow, FormError } from './adminUi'
import type { CreateUserInput, Team, UpdateUserInput, User } from '../../types/auth'

const MIN_PASSWORD_LENGTH = 12

interface UserFormDialogProps {
  open: boolean
  /** undefined = create mode. */
  user?: User
  teams: Team[]
  /** Id of the signed-in user: their own account cannot be disabled here. */
  currentUserId: string
  pending: boolean
  error: string | null
  onCreate: (input: CreateUserInput) => void
  onUpdate: (id: string, input: UpdateUserInput) => void
  onClose: () => void
}

export function UserFormDialog({ open, user, teams, currentUserId, pending, error, onCreate, onUpdate, onClose }: UserFormDialogProps) {
  const isEdit = user !== undefined
  const isLocal = !isEdit || user.source === 'local'
  const isSelf = isEdit && user.id === currentUserId

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [disabled, setDisabled] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Reset the form each time the dialog opens for a (different) user.
  useEffect(() => {
    if (!open) return
    setUsername(user?.username ?? '')
    setEmail(user?.email ?? '')
    setDisplayName(user?.displayName ?? '')
    setPassword('')
    setTeamIds(user?.teamIds ?? [])
    setDisabled(user?.disabled ?? false)
    setLocalError(null)
  }, [open, user])

  const toggleTeam = (id: string, checked: boolean) => {
    setTeamIds((ids) => (checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id)))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`The password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      return
    }
    if (isEdit) {
      const input: UpdateUserInput = { email, displayName, teamIds, disabled }
      if (isLocal && password) input.newPassword = password
      onUpdate(user.id, input)
      return
    }
    if (!username.trim() || !password) {
      setLocalError('Username and temporary password are required')
      return
    }
    onCreate({ username: username.trim(), email: email.trim(), displayName: displayName.trim(), password, teamIds })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
        <DialogHeader>
          <DialogTitle><span id="user-dialog-title">{isEdit ? `Edit ${user.username}` : 'New user'}</span></DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
          {isEdit ? (
            <FieldRow id="user-username" label="Username">
              <Input id="user-username" value={username} disabled readOnly />
            </FieldRow>
          ) : (
            <FieldRow id="user-username" label="Username">
              <Input id="user-username" value={username} autoComplete="off" required onChange={(e) => setUsername(e.target.value)} />
            </FieldRow>
          )}
          <FieldRow id="user-email" label="Email" hint={isLocal ? undefined : 'Managed by the identity provider'}>
            <Input id="user-email" type="email" value={email} disabled={!isLocal} onChange={(e) => setEmail(e.target.value)} />
          </FieldRow>
          <FieldRow id="user-display-name" label="Display name" hint={isLocal ? undefined : 'Managed by the identity provider'}>
            <Input id="user-display-name" value={displayName} disabled={!isLocal} onChange={(e) => setDisplayName(e.target.value)} />
          </FieldRow>
          {isLocal && (
            <FieldRow
              id="user-password"
              label={isEdit ? 'Reset password' : 'Temporary password'}
              hint={isEdit ? `Leave empty to keep the current password. At least ${MIN_PASSWORD_LENGTH} characters.` : `At least ${MIN_PASSWORD_LENGTH} characters. The user must change it at first sign-in.`}
            >
              <Input id="user-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FieldRow>
          )}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-hud-on-surface-var mb-1">Teams</legend>
            {teams.length === 0 && <p className="text-xs text-hud-on-surface-var">No team yet.</p>}
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <Checkbox id={`user-team-${t.id}`} checked={teamIds.includes(t.id)} onCheckedChange={(c) => toggleTeam(t.id, c)} />
                <Label htmlFor={`user-team-${t.id}`} className="cursor-pointer">{t.name}</Label>
              </div>
            ))}
          </fieldset>
          {isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox id="user-disabled" checked={disabled} disabled={isSelf} onCheckedChange={setDisabled} />
              <Label htmlFor="user-disabled" className="cursor-pointer">Account disabled</Label>
              {isSelf && <span className="text-xs text-hud-on-surface-var">(you cannot disable your own account)</span>}
            </div>
          )}
          <FormError message={localError ?? error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? 'Save' : 'Create user'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
