import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FieldRow, FormError } from './adminUi'
import type { CreateApiKeyInput, CreateApiKeyResult, Team } from '../../types/auth'

interface ApiKeyCreateDialogProps {
  open: boolean
  teams: Team[]
  /** Admins may create keys that are not bound to a team. */
  canCreateGlobal: boolean
  pending: boolean
  error: string | null
  /** Set after a successful creation: switches to the secret reveal view. */
  result: CreateApiKeyResult | null
  onSubmit: (input: CreateApiKeyInput) => void
  onClose: () => void
}

const selectClass =
  'flex h-9 w-full rounded-md border border-hud-outline-var bg-hud-surface px-3 py-2 text-sm text-hud-on-surface focus:outline-none focus:border-hud-primary'

export function ApiKeyCreateDialog({ open, teams, canCreateGlobal, pending, error, result, onSubmit, onClose }: ApiKeyCreateDialogProps) {
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setTeamId(teams[0]?.id ?? '')
    setExpiresAt('')
    setLocalError(null)
    setCopied(false)
  }, [open, teams])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!name.trim()) {
      setLocalError('Name is required')
      return
    }
    if (teamId === '' && !canCreateGlobal) {
      setLocalError('Select a team')
      return
    }
    const input: CreateApiKeyInput = { name: name.trim(), teamId }
    if (expiresAt) {
      const d = new Date(expiresAt)
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        setLocalError('Expiration must be a future date')
        return
      }
      input.expiresAt = d.toISOString()
    }
    onSubmit(input)
  }

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.secret)
      setCopied(true)
    } catch {
      setLocalError('Clipboard unavailable: select the secret and copy it manually')
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="apikey-dialog-title">
        <DialogHeader>
          <DialogTitle><span id="apikey-dialog-title">{result ? 'API key created' : 'New API key'}</span></DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        {result ? (
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-start gap-2 text-sm rounded-md px-3 py-2" style={{ color: 'rgb(var(--hud-warning))', background: 'rgb(var(--hud-warning) / 0.1)' }}>
              <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This secret is shown once. Store it now; Tracker keeps only its prefix.</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 block rounded-md px-3 py-2 text-sm font-mono break-all select-all bg-hud-surface-high text-hud-on-surface">
                {result.secret}
              </code>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => void copy()}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-hud-on-surface-var">
              Send it in the <code className="font-mono">X-Api-Key</code> header. Key <span className="font-mono">{result.apiKey.prefix}</span> ({result.apiKey.name}).
            </p>
            <FormError message={localError} />
            <div className="flex justify-end">
              <Button type="button" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
            <FieldRow id="apikey-name" label="Name" hint="Where the key is used, e.g. gitlab-ci or argo-sync.">
              <Input id="apikey-name" value={name} required onChange={(e) => setName(e.target.value)} />
            </FieldRow>
            <FieldRow id="apikey-team" label="Team" hint="The key inherits the team permissions and scope.">
              <select id="apikey-team" className={selectClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {canCreateGlobal && <option value="">Global (all services, admins only)</option>}
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow id="apikey-expires" label="Expires at (optional)" hint="Leave empty for a key that never expires.">
              <Input id="apikey-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </FieldRow>
            <FormError message={localError ?? error} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>Create key</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
