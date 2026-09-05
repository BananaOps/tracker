import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { ChipInput } from './ChipInput'
import { FieldRow, FormError } from './adminUi'
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS } from '../../types/auth'
import type { Team, TeamInput, User } from '../../types/auth'

interface TeamFormDialogProps {
  open: boolean
  /** undefined = create mode. */
  team?: Team
  /** Users whose teamIds include this team (empty in create mode). */
  members: User[]
  pending: boolean
  error: string | null
  onSubmit: (input: TeamInput) => void
  onClose: () => void
}

export function TeamFormDialog({ open, team, members, pending, error, onSubmit, onClose }: TeamFormDialogProps) {
  const isEdit = team !== undefined
  const locked = isEdit && team.builtin

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [oidcGroups, setOidcGroups] = useState<string[]>([])
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setDescription(team?.description ?? '')
    setPermissions(team?.permissions ?? [])
    setOidcGroups(team?.oidcGroups ?? [])
    setLocalError(null)
  }, [open, team])

  const togglePermission = (perm: string, checked: boolean) => {
    setPermissions((current) => {
      const next = checked ? [...current, perm] : current.filter((p) => p !== perm)
      // Keep the canonical order so the payload is stable.
      return ALL_PERMISSIONS.filter((p) => next.includes(p))
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!name.trim()) {
      setLocalError('Name is required')
      return
    }
    onSubmit({ name: name.trim(), description: description.trim(), permissions, scopeAll: true, scopeServices: [], oidcGroups })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle><span id="team-dialog-title">{isEdit ? `Edit ${team.name}` : 'New team'}</span></DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto" noValidate>
          <FieldRow id="team-name" label="Name" hint={locked ? 'Built-in team names cannot change' : undefined}>
            <Input id="team-name" value={name} disabled={locked} required onChange={(e) => setName(e.target.value)} />
          </FieldRow>
          <FieldRow id="team-description" label="Description">
            <Input id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldRow>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-hud-on-surface-var mb-1">
              Permissions{locked && <span className="ml-2 text-xs">(built-in, read only)</span>}
            </legend>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="rounded-md p-3 space-y-2" style={{ border: '1px solid rgb(var(--hud-outline-var) / 0.6)' }}>
                <p className="text-xs uppercase tracking-wide text-hud-on-surface-var">{group.label}</p>
                {group.permissions.map((perm) => (
                  <div key={perm} className="flex items-start gap-2">
                    <Checkbox id={`team-perm-${perm.replace(':', '-')}`} className="mt-0.5" checked={permissions.includes(perm)} disabled={locked} onCheckedChange={(c) => togglePermission(perm, c)} />
                    <div>
                      <Label htmlFor={`team-perm-${perm.replace(':', '-')}`} className="cursor-pointer font-mono text-xs text-hud-on-surface">{perm}</Label>
                      <p className="text-xs text-hud-on-surface-var">{PERMISSION_LABELS[perm]}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-hud-on-surface-var">Scope</p>
            <p className="text-sm text-hud-on-surface">All services</p>
            <p className="text-xs text-hud-on-surface-var">Per-service scope arrives in a later release.</p>
          </div>

          <FieldRow id="team-oidc-groups" label="OIDC groups" hint="Identity provider groups mapped to this team at sign-in. Press Enter after each group.">
            <ChipInput id="team-oidc-groups" values={oidcGroups} onChange={setOidcGroups} placeholder="e.g. platform-engineering" />
          </FieldRow>

          {isEdit && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-hud-on-surface-var">Members</p>
              {members.length === 0 ? (
                <p className="text-sm text-hud-on-surface-var">No member.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span key={m.id} className="rounded-full px-2 py-0.5 text-xs bg-hud-surface-high text-hud-on-surface">{m.username}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-hud-on-surface-var">Edit membership from the Users page.</p>
            </div>
          )}

          <FormError message={localError ?? error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? 'Save' : 'Create team'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
