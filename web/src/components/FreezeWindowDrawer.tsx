import { useState, useEffect } from 'react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { catalogApi, eventsApi } from '../lib/api'
import { getEnvironmentLabel } from '../lib/eventUtils'
import type { FreezeWindow, FreezeWindowDraft, FreezeScope, FreezeType } from '../types/freezeWindow'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FreezeWindowDrawerProps {
  open: boolean
  onClose: () => void
  /** Provide to edit an existing window; undefined = create mode */
  initial?: FreezeWindow
  onSubmit: (draft: FreezeWindowDraft) => void
}

// ─── Default draft ────────────────────────────────────────────────────────────

function emptyDraft(): FreezeWindowDraft {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return {
    title: '',
    description: '',
    type: 'soft',
    scopeType: 'global',
    scopeIds: [],
    startsAt: start.toISOString().slice(0, 16),  // local datetime-local format
    endsAt: end.toISOString().slice(0, 16),
    active: true,
  }
}

function toDraft(fw: FreezeWindow): FreezeWindowDraft {
  return {
    title: fw.title,
    description: fw.description ?? '',
    type: fw.type,
    scopeType: fw.scopeType,
    scopeIds: fw.scopeIds ?? [],
    startsAt: fw.startsAt.slice(0, 16),
    endsAt: fw.endsAt.slice(0, 16),
    active: fw.active ?? true,
    createdBy: fw.createdBy,
    timezone: fw.timezone,
  }
}

function toISO(localDatetime: string): string {
  // Convert "YYYY-MM-DDTHH:mm" to full ISO — treat as local time
  return new Date(localDatetime).toISOString()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FreezeWindowDrawer({
  open,
  onClose,
  initial,
  onSubmit,
}: FreezeWindowDrawerProps) {
  const [draft, setDraft] = useState<FreezeWindowDraft>(
    initial ? toDraft(initial) : emptyDraft(),
  )
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const { data: catalogData } = useQuery({
    queryKey: ['catalogs', 'list', 'freeze-window-drawer'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'list', 'freeze-window-drawer'],
    queryFn: () => eventsApi.list({ perPage: 1000 }),
  })

  const serviceOptions = useMemo(() => {
    const services: string[] = (catalogData?.catalogs ?? [])
      .map((c: any) => String(c.name ?? '').trim())
      .filter((name: string) => name.length > 0)
    const uniqueServices = Array.from(new Set<string>(services))
    return uniqueServices.sort((a: string, b: string) => a.localeCompare(b))
  }, [catalogData])

  const environmentOptions = useMemo(() => {
    const envs: string[] = (eventsData?.events ?? [])
      .map((e: any) => e?.attributes?.environment)
      .filter((v: unknown) => v !== undefined && v !== null && String(v).trim() !== '')
      .map((v: unknown) => String(v))
    const values = Array.from(new Set<string>(envs))
    return values
      .map((value: string) => ({ value, label: getEnvironmentLabel(value) ?? value }))
      .sort((a: { value: string; label: string }, b: { value: string; label: string }) => a.label.localeCompare(b.label))
  }, [eventsData])

  // Reset form when dialog opens or target changes
  useEffect(() => {
    if (open) {
      setDraft(initial ? toDraft(initial) : emptyDraft())
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof FreezeWindowDraft>(key: K, value: FreezeWindowDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  function validate(): boolean {
    const e: Partial<Record<string, string>> = {}
    if (!draft.title.trim()) e.title = 'Title is required'
    if (!draft.startsAt) e.startsAt = 'Start date is required'
    if (!draft.endsAt) e.endsAt = 'End date is required'
    if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt)
      e.endsAt = 'End must be after start'
    if (draft.scopeType !== 'global' && (!draft.scopeIds || draft.scopeIds.length === 0))
      e.scopeIds = `At least one ${draft.scopeType} is required`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit({
      ...draft,
      startsAt: toISO(draft.startsAt),
      endsAt: toISO(draft.endsAt),
    })
    onClose()
  }

  const isEdit = !!initial
  const baseStyle = { background: 'rgb(var(--hud-surface))', color: 'rgb(var(--hud-on-surface))' }
  const inputStyle = {
    background: 'rgb(var(--hud-surface-high))',
    border: '1px solid rgb(var(--hud-outline-var) / 0.3)',
    color: 'rgb(var(--hud-on-surface))',
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent style={baseStyle}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit freeze window' : 'New freeze window'}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Title */}
          <Field label="Title" error={errors.title}>
            <Input
              placeholder="e.g. End of month freeze"
              value={draft.title}
              onChange={e => set('title', e.target.value)}
              style={inputStyle}
            />
          </Field>

          {/* Description */}
          <Field label="Description (optional)">
            <textarea
              className="w-full px-3 py-2 rounded-md text-sm resize-none"
              rows={2}
              placeholder="Context or rationale…"
              value={draft.description ?? ''}
              onChange={e => set('description', e.target.value)}
              style={inputStyle}
            />
          </Field>

          {/* Type */}
          <Field label="Freeze type">
            <div className="flex gap-2">
              {(['soft', 'hard'] as FreezeType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className="flex-1 py-2 rounded-md text-xs font-semibold capitalize transition-all"
                  style={
                    draft.type === t
                      ? t === 'hard'
                        ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }
                        : { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }
                      : { background: 'transparent', color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)' }
                  }
                >
                  <i className={`fa-solid ${t === 'hard' ? 'fa-lock' : 'fa-triangle-exclamation'} text-[10px] mr-1.5`} />
                  {t === 'hard' ? 'Hard' : 'Soft'}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
              {draft.type === 'hard'
                ? 'Hard freeze: events overlapping this window will be marked as blocked.'
                : 'Soft freeze: events will receive a warning but are not blocked.'}
            </p>
          </Field>

          {/* Scope type */}
          <Field label="Scope">
            <div className="grid grid-cols-4 gap-1.5">
              {(['global', 'environment', 'service', 'domain'] as FreezeScope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    set('scopeType', s)
                    set('scopeIds', [])
                  }}
                  className="py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all"
                  style={
                    draft.scopeType === s
                      ? { background: 'rgb(var(--hud-primary) / 0.15)', color: 'rgb(var(--hud-primary))', border: '1px solid rgb(var(--hud-primary) / 0.4)' }
                      : { background: 'transparent', color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.3)' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Scope IDs — use multi-select for environment/service */}
          {draft.scopeType === 'environment' && (
            <Field label="Environments" error={errors.scopeIds}>
              <MultiSelectScope
                options={environmentOptions}
                selected={draft.scopeIds ?? []}
                onToggle={(value) => {
                  const current = draft.scopeIds ?? []
                  set('scopeIds', current.includes(value)
                    ? current.filter(v => v !== value)
                    : [...current, value])
                }}
                emptyMessage="No environment found in events"
              />
            </Field>
          )}

          {draft.scopeType === 'service' && (
            <Field label="Services" error={errors.scopeIds}>
              <MultiSelectScope
                options={serviceOptions.map(value => ({ value, label: value }))}
                selected={draft.scopeIds ?? []}
                onToggle={(value) => {
                  const current = draft.scopeIds ?? []
                  set('scopeIds', current.includes(value)
                    ? current.filter(v => v !== value)
                    : [...current, value])
                }}
                emptyMessage="No service found in catalog"
              />
            </Field>
          )}

          {draft.scopeType === 'domain' && (
            <Field
              label="Domain IDs (comma-separated)"
              error={errors.scopeIds}
            >
              <Input
                placeholder="e.g. billing, security, customer-platform"
                value={(draft.scopeIds ?? []).join(', ')}
                onChange={e =>
                  set(
                    'scopeIds',
                    e.target.value
                      .split(',')
                      .map(v => v.trim())
                      .filter(Boolean),
                  )
                }
                style={inputStyle}
              />
            </Field>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts at" error={errors.startsAt}>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 rounded-md text-sm"
                value={draft.startsAt.slice(0, 16)}
                onChange={e => set('startsAt', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Ends at" error={errors.endsAt}>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 rounded-md text-sm"
                value={draft.endsAt.slice(0, 16)}
                onChange={e => set('endsAt', e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              id="fw-active"
              type="checkbox"
              checked={draft.active ?? true}
              onChange={e => set('active', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="fw-active" className="text-sm cursor-pointer" style={{ color: 'rgb(var(--hud-on-surface))' }}>
              Active
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            style={{ background: 'rgb(var(--hud-primary))', color: '#fff' }}
          >
            {isEdit ? 'Save changes' : 'Create freeze window'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Small form field wrapper ─────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
        {label}
      </Label>
      {children}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}

function MultiSelectScope({
  options,
  selected,
  onToggle,
  emptyMessage,
}: {
  options: Array<{ value: string; label: string }>
  selected: string[]
  onToggle: (value: string) => void
  emptyMessage: string
}) {
  const [search, setSearch] = useState('')

  if (options.length === 0) {
    return <p className="text-[11px]" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>{emptyMessage}</p>
  }

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'rgb(var(--hud-on-surface-var))' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs"
          style={{ border: '1px solid rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))', color: 'rgb(var(--hud-on-surface))' }}
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-md p-2 border" style={{ borderColor: 'rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}>
        <div className="flex flex-wrap gap-1.5">
          {filteredOptions.map((opt) => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                style={active
                  ? { background: 'rgb(var(--hud-primary) / 0.18)', color: 'rgb(var(--hud-primary))', border: '1px solid rgb(var(--hud-primary) / 0.4)' }
                  : { background: 'transparent', color: 'rgb(var(--hud-on-surface-var))', border: '1px solid rgb(var(--hud-outline-var) / 0.35)' }}
              >
                {opt.label}
              </button>
            )
          })}
          {filteredOptions.length === 0 && (
            <p className="text-[11px] px-1" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>No result</p>
          )}
        </div>
      </div>
      <p className="text-[10px]" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
        {selected.length} selected{search ? ` · ${filteredOptions.length} shown` : ''}
      </p>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
