import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { ScrollArea } from '../components/ui/scroll-area'
import { catalogApi, eventsApi } from '../lib/api'
import { getEnvironmentLabel } from '../lib/eventUtils'
import { useFreezeWindows } from '../hooks/useFreezeWindows'
import type { FreezeWindow, FreezeWindowDraft, FreezeScope, FreezeType } from '../types/freezeWindow'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
const T = {
  bg: 'rgb(var(--hud-bg))',
  surface: 'rgb(var(--hud-surface))',
  surfaceHigh: 'rgb(var(--hud-surface-high))',
  surfaceHighest: 'rgb(var(--hud-surface-highest))',
  surfaceLow: 'rgb(var(--hud-surface-low))',
  primary: 'rgb(var(--hud-primary))',
  onSurface: 'rgb(var(--hud-on-surface))',
  onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
  error: 'rgb(var(--hud-error))',
  success: 'rgb(var(--hud-success))',
  outline: 'rgb(var(--hud-outline-var))',
}

function freezeTypeBadge(type: FreezeType) {
  return type === 'hard'
    ? { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.35)', label: 'Hard', icon: 'fa-lock' }
    : { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)', label: 'Soft', icon: 'fa-triangle-exclamation' }
}

function scopeIcon(scope: FreezeScope) {
  switch (scope) {
    case 'global': return <i className="fa-solid fa-globe text-[12px]" />
    case 'environment': return <i className="fa-solid fa-layer-group text-[12px]" />
    case 'service': return <i className="fa-solid fa-server text-[12px]" />
    case 'domain': return <i className="fa-solid fa-diagram-project text-[12px]" />
  }
}

function isOngoing(fw: FreezeWindow): boolean {
  if (fw.active === false) return false
  const now = new Date()
  try {
    return isWithinInterval(now, { start: parseISO(fw.startsAt), end: parseISO(fw.endsAt) })
  } catch { return false }
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
    startsAt: start.toISOString().slice(0, 16),
    endsAt: end.toISOString().slice(0, 16),
    active: true,
  }
}

function toISO(local: string): string {
  return new Date(local).toISOString()
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FreezeWindows() {
  const { windows, add, update, remove, toggle } = useFreezeWindows()
  const { data: catalogData } = useQuery({
    queryKey: ['catalogs', 'list', 'freeze-windows-page'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'list', 'freeze-windows-page'],
    queryFn: () => eventsApi.list({ perPage: 1000 }),
  })

  // ── Filter state ──────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | FreezeType>('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | FreezeScope>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // ── Right panel state ─────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState<FreezeWindowDraft>(emptyDraft())
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({})
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const selectedFreeze = windows.find(w => w.id === selectedId) ?? null

  // Reset edit state when selection changes
  useEffect(() => {
    setIsEditing(false)
    setDeleteConfirm(false)
    setFormErrors({})
    if (selectedFreeze) setDraft(toDraft(selectedFreeze))
  }, [selectedId])

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = windows.length
    const active = windows.filter(w => w.active !== false).length
    const hard = windows.filter(w => w.type === 'hard').length
    const soft = windows.filter(w => w.type === 'soft').length
    const ongoing = windows.filter(isOngoing).length
    return { total, active, hard, soft, ongoing }
  }, [windows])

  const filtered = useMemo(() => {
    return windows.filter(fw => {
      if (typeFilter !== 'all' && fw.type !== typeFilter) return false
      if (scopeFilter !== 'all' && fw.scopeType !== scopeFilter) return false
      if (statusFilter === 'active' && fw.active === false) return false
      if (statusFilter === 'inactive' && fw.active !== false) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          fw.title.toLowerCase().includes(q) ||
          fw.description?.toLowerCase().includes(q) ||
          fw.scopeIds?.some(id => id.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [windows, typeFilter, scopeFilter, statusFilter, search])

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

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = <K extends keyof FreezeWindowDraft>(key: K, value: FreezeWindowDraft[K]) =>
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
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const resolved = { ...draft, startsAt: toISO(draft.startsAt), endsAt: toISO(draft.endsAt) }
    if (isCreating) {
      add(resolved)
      setIsCreating(false)
      setSelectedId(null)
    } else if (selectedFreeze) {
      update(selectedFreeze.id, resolved)
      setIsEditing(false)
    }
  }

  function handleNew() {
    setSelectedId(null)
    setDraft(emptyDraft())
    setFormErrors({})
    setIsCreating(true)
    setIsEditing(false)
    setDeleteConfirm(false)
  }

  function handleDelete(fw: FreezeWindow) {
    remove(fw.id)
    setSelectedId(null)
    setDeleteConfirm(false)
  }

  function closePanel() {
    setSelectedId(null)
    setIsCreating(false)
    setIsEditing(false)
    setDeleteConfirm(false)
    setFormErrors({})
  }

  const panelOpen = selectedFreeze !== null || isCreating
  const inputStyle = {
    background: T.surfaceHigh,
    border: `1px solid ${ha('outline-var', 0.3)}`,
    color: T.onSurface,
  }

  // ─── Sidebar filter item ───────────────────────────────────────────────────
  function FilterChip({
    active, onClick, children
  }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
        style={{
          background: active ? ha('primary', 0.1) : 'transparent',
          color: active ? T.primary : T.onSurfaceVar,
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg }}>

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      {showSidebar && (
        <div className="w-64 flex flex-col shrink-0 transition-all" style={{ background: T.surface, borderRight: `1px solid ${ha('outline-var', 0.15)}` }}>
          <div className="px-4 py-4" style={{ borderBottom: `1px solid ${ha('outline-var', 0.15)}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.onSurfaceVar }}>
                <i className="fa-solid fa-sliders text-[12px]" />
                Filters
              </h3>
              {(typeFilter !== 'all' || scopeFilter !== 'all' || statusFilter !== 'all' || search) && (
                <button className="text-[10px] px-2 py-0.5 rounded" style={{ color: T.primary, background: ha('primary', 0.1) }}
                  onClick={() => { setTypeFilter('all'); setScopeFilter('all'); setStatusFilter('all'); setSearch('') }}>
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: T.onSurfaceVar }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs"
                style={{ background: T.surfaceHigh, border: `1px solid ${ha('outline-var', 0.2)}`, color: T.onSurface }}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">

              {/* Status */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold px-3 mb-1" style={{ color: T.onSurfaceVar }}>Status</p>
                <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterChip>
                <FilterChip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                  <span className="w-2 h-2 rounded-full" style={{ background: T.success }} />Active
                </FilterChip>
                <FilterChip active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>
                  <span className="w-2 h-2 rounded-full" style={{ background: T.onSurfaceVar, opacity: 0.4 }} />Inactive
                </FilterChip>
              </div>

              {/* Type */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold px-3 mb-1" style={{ color: T.onSurfaceVar }}>Type</p>
                <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All types</FilterChip>
                <FilterChip active={typeFilter === 'hard'} onClick={() => setTypeFilter('hard')}>
                  <i className="fa-solid fa-lock text-[11px]" /> Hard freeze
                </FilterChip>
                <FilterChip active={typeFilter === 'soft'} onClick={() => setTypeFilter('soft')}>
                  <i className="fa-solid fa-triangle-exclamation text-[11px]" /> Soft freeze
                </FilterChip>
              </div>

              {/* Scope */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold px-3 mb-1" style={{ color: T.onSurfaceVar }}>Scope</p>
                {(['all', 'global', 'environment', 'service', 'domain'] as const).map(s => (
                  <FilterChip key={s} active={scopeFilter === s} onClick={() => setScopeFilter(s)}>
                    {s === 'all' ? 'All scopes' : capitalize(s)}
                  </FilterChip>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Stats summary */}
          <div className="p-4 space-y-2 text-xs" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <div className="flex justify-between"><span style={{ color: T.onSurfaceVar }}>Total</span><span className="font-semibold tabular-nums" style={{ color: T.onSurface }}>{stats.total}</span></div>
            <div className="flex justify-between"><span style={{ color: T.onSurfaceVar }}>Active</span><span className="font-semibold tabular-nums" style={{ color: T.success }}>{stats.active}</span></div>
            <div className="flex justify-between"><span style={{ color: T.onSurfaceVar }}>Ongoing now</span><span className="font-semibold tabular-nums" style={{ color: T.primary }}>{stats.ongoing}</span></div>
            <div className="flex justify-between"><span style={{ color: T.onSurfaceVar }}>Hard / Soft</span><span className="font-semibold tabular-nums" style={{ color: T.onSurface }}>{stats.hard} / {stats.soft}</span></div>
          </div>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="px-6 py-4 flex items-center gap-4 shrink-0" style={{ background: T.surface, borderBottom: `1px solid ${ha('outline-var', 0.15)}` }}>
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(v => !v)} className="h-8 w-8 shrink-0">
            <i className="fa-solid fa-sliders text-[13px]" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: ha('error', 0.1) }}>
              <i className="fa-solid fa-snowflake text-[13px]" style={{ color: T.error }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.onSurface }}>
                Freeze Windows
              </h1>
              <p className="text-[11px] truncate" style={{ color: T.onSurfaceVar }}>
                {filtered.length} window{filtered.length !== 1 ? 's' : ''}
                {typeFilter !== 'all' || scopeFilter !== 'all' || statusFilter !== 'all' || search ? ' · filtered' : ''}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-[11px] mr-2" style={{ color: T.onSurfaceVar }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)' }} />
                Hard — blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)' }} />
                Soft — warning
              </span>
            </div>
            <Button
              onClick={handleNew}
              className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5"
              style={{ background: T.primary, color: '#fff' }}
            >
              <i className="fa-solid fa-plus text-[11px]" />
              New freeze window
            </Button>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: ha('outline-var', 0.08) }}>
                  <i className="fa-solid fa-snowflake text-[22px]" style={{ color: T.onSurfaceVar, opacity: 0.5 }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: T.onSurface }}>
                    {windows.length === 0 ? 'No freeze windows yet' : 'No results'}
                  </p>
                  <p className="text-xs" style={{ color: T.onSurfaceVar }}>
                    {windows.length === 0
                      ? 'Create your first blackout period to restrict deployments during sensitive times.'
                      : 'Try adjusting your filters.'}
                  </p>
                </div>
                {windows.length === 0 && (
                  <Button onClick={handleNew} size="sm" className="mt-2 text-xs" style={{ background: T.primary, color: '#fff' }}>
                    <i className="fa-solid fa-plus text-[10px] mr-1.5" /> Create freeze window
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ha('outline-var', 0.15)}` }}>
                {filtered.map((fw, idx) => {
                  const typeBadge = freezeTypeBadge(fw.type)
                  const ongoing = isOngoing(fw)
                  const isSelected = fw.id === selectedId
                  return (
                    <button
                      key={fw.id}
                      onClick={() => { setSelectedId(isSelected ? null : fw.id); setIsCreating(false) }}
                      className="w-full text-left flex items-center gap-4 px-5 py-4 transition-all"
                      style={{
                        background: isSelected ? ha('primary', 0.06) : T.surface,
                        borderBottom: idx < filtered.length - 1 ? `1px solid ${ha('outline-var', 0.1)}` : 'none',
                        borderLeft: isSelected ? `3px solid ${T.primary}` : '3px solid transparent',
                      }}
                    >
                      {/* Type indicator */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeBadge.bg, border: `1px solid ${typeBadge.border}` }}>
                        <i className="fa-solid fa-snowflake text-[12px]" style={{ color: typeBadge.text }} />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate" style={{ color: fw.active === false ? T.onSurfaceVar : T.onSurface }}>
                            {fw.title}
                          </span>
                          {fw.active === false && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0" style={{ background: ha('outline-var', 0.12), color: T.onSurfaceVar }}>
                              Inactive
                            </span>
                          )}
                          {ongoing && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0 flex items-center gap-1" style={{ background: ha('primary', 0.12), color: T.primary }}>
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: T.primary }} />
                              Ongoing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: T.onSurfaceVar }}>
                          <span className="flex items-center gap-1">{scopeIcon(fw.scopeType)}{capitalize(fw.scopeType)}</span>
                          {fw.scopeIds && fw.scopeIds.length > 0 && (
                            <span className="truncate max-w-[160px]">{fw.scopeIds.join(', ')}</span>
                          )}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="hidden md:flex flex-col items-end text-[11px] shrink-0" style={{ color: T.onSurfaceVar }}>
                        <span className="tabular-nums">{format(parseISO(fw.startsAt), 'dd MMM yyyy', { locale: enUS })}</span>
                        <span className="tabular-nums">→ {format(parseISO(fw.endsAt), 'dd MMM yyyy', { locale: enUS })}</span>
                      </div>

                      {/* Type badge */}
                      <span className="hidden lg:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                        style={{ background: typeBadge.bg, color: typeBadge.text, border: `1px solid ${typeBadge.border}` }}>
                        <i className={`fa-solid ${typeBadge.icon} text-[10px] mr-1`} />
                        {typeBadge.label}
                      </span>

                      {/* Chevron */}
                      <i className="fa-solid fa-chevron-right text-[12px] shrink-0 transition-transform" style={{ color: T.onSurfaceVar, transform: isSelected ? 'rotate(90deg)' : 'none' }} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right detail panel ────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closePanel} />

          {/* Panel */}
          <div className="animate-slide-in relative h-full w-full max-w-xl flex flex-col shadow-2xl overflow-hidden"
            style={{ background: T.bg, borderLeft: `1px solid ${ha('outline-var', 0.2)}` }}>

            {/* Panel header */}
            <div className="px-6 py-5 shrink-0 flex items-start justify-between gap-4" style={{ background: T.surface, borderBottom: `1px solid ${ha('outline-var', 0.15)}` }}>
              <div className="min-w-0">
                {isCreating ? (
                  <>
                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.onSurface }}>
                      New freeze window
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: T.onSurfaceVar }}>Define a new blackout period</p>
                  </>
                ) : selectedFreeze ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.onSurface }}>
                        {selectedFreeze.title}
                      </h2>
                      {isOngoing(selectedFreeze) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 shrink-0"
                          style={{ background: ha('primary', 0.12), color: T.primary }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.primary }} />
                          Ongoing
                        </span>
                      )}
                    </div>
                    {selectedFreeze.description && (
                      <p className="text-xs" style={{ color: T.onSurfaceVar }}>{selectedFreeze.description}</p>
                    )}
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isCreating && selectedFreeze && !isEditing && (
                  <>
                    <button
                      onClick={() => { toggle(selectedFreeze.id); }}
                      className="p-2 rounded-lg transition-all"
                      title={selectedFreeze.active === false ? 'Activate' : 'Deactivate'}
                      style={{ background: ha('outline-var', 0.08), color: T.onSurfaceVar }}
                    >
                      <i className="fa-solid fa-power-off text-[13px]" />
                    </button>
                    <button
                      onClick={() => { setDraft(toDraft(selectedFreeze)); setIsEditing(true); setFormErrors({}) }}
                      className="p-2 rounded-lg transition-all"
                      style={{ background: ha('primary', 0.1), color: T.primary }}
                    >
                      <i className="fa-solid fa-pen-to-square text-[13px]" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="p-2 rounded-lg transition-all"
                      style={{ background: ha('error', 0.1), color: T.error }}
                    >
                      <i className="fa-solid fa-trash text-[13px]" />
                    </button>
                  </>
                )}
                <button onClick={closePanel} className="p-2 rounded-lg transition-all" style={{ color: T.onSurfaceVar }}>
                  <i className="fa-solid fa-xmark text-[16px]" />
                </button>
              </div>
            </div>

            {/* Delete confirm */}
            {deleteConfirm && selectedFreeze && (
              <div className="mx-6 mt-4 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: ha('error', 0.08), border: `1px solid ${ha('error', 0.2)}` }}>
                <p className="text-sm" style={{ color: T.error }}>Delete <strong>{selectedFreeze.title}</strong>?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="text-xs h-7" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                  <Button size="sm" className="text-xs h-7" style={{ background: T.error, color: '#fff' }} onClick={() => handleDelete(selectedFreeze)}>Delete</Button>
                </div>
              </div>
            )}

            {/* Panel body */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-6 space-y-6">

                {/* ── View mode ── */}
                {!isEditing && !isCreating && selectedFreeze && (
                  <>
                    {/* Type + Scope row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl" style={{ background: T.surface, border: `1px solid ${ha('outline-var', 0.1)}` }}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>Type</p>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const b = freezeTypeBadge(selectedFreeze.type)
                            return (
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: b.bg, color: b.text, border: `1px solid ${b.border}` }}>
                                {b.label}
                              </span>
                            )
                          })()}
                        </div>
                        <p className="text-[11px] mt-2" style={{ color: T.onSurfaceVar }}>
                          {selectedFreeze.type === 'hard'
                            ? 'Events are blocked during this period.'
                            : 'Events receive a warning only.'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ background: T.surface, border: `1px solid ${ha('outline-var', 0.1)}` }}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>Scope</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: T.onSurface }}>
                          {scopeIcon(selectedFreeze.scopeType)}
                          {capitalize(selectedFreeze.scopeType)}
                        </div>
                        {selectedFreeze.scopeIds && selectedFreeze.scopeIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedFreeze.scopeIds.map(id => (
                              <span key={id} className="text-[10px] px-2 py-0.5 rounded font-medium"
                                style={{ background: ha('primary', 0.08), color: T.primary }}>
                                {id}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date range */}
                    <div className="p-4 rounded-xl" style={{ background: T.surface, border: `1px solid ${ha('outline-var', 0.1)}` }}>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>Window</p>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>From</span>
                          <span className="text-sm font-semibold tabular-nums" style={{ color: T.onSurface }}>
                            {format(parseISO(selectedFreeze.startsAt), 'dd MMM yyyy HH:mm', { locale: enUS })}
                          </span>
                        </div>
                        <i className="fa-solid fa-chevron-right text-[12px] shrink-0" style={{ color: T.onSurfaceVar }} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>To</span>
                          <span className="text-sm font-semibold tabular-nums" style={{ color: T.onSurface }}>
                            {format(parseISO(selectedFreeze.endsAt), 'dd MMM yyyy HH:mm', { locale: enUS })}
                          </span>
                        </div>
                      </div>
                      {selectedFreeze.timezone && (
                        <p className="text-[11px] mt-2" style={{ color: T.onSurfaceVar }}>Timezone: {selectedFreeze.timezone}</p>
                      )}
                    </div>

                    {/* Meta */}
                    {(selectedFreeze.createdBy || selectedFreeze.createdAt) && (
                      <div className="flex items-center gap-3 text-xs" style={{ color: T.onSurfaceVar }}>
                        {selectedFreeze.createdBy && (
                          <span>Created by <strong style={{ color: T.onSurface }}>{selectedFreeze.createdBy}</strong></span>
                        )}
                        {selectedFreeze.createdAt && (
                          <span>{format(parseISO(selectedFreeze.createdAt), 'dd MMM yyyy', { locale: enUS })}</span>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Edit / Create form ── */}
                {(isEditing || isCreating) && (
                  <div className="space-y-5">

                    {/* Title */}
                    <FormField label="Title" error={formErrors.title}>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        placeholder="e.g. End of month freeze"
                        value={draft.title}
                        onChange={e => setField('title', e.target.value)}
                        style={inputStyle}
                      />
                    </FormField>

                    {/* Description */}
                    <FormField label="Description (optional)">
                      <textarea
                        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                        rows={2}
                        placeholder="Context or rationale…"
                        value={draft.description ?? ''}
                        onChange={e => setField('description', e.target.value)}
                        style={inputStyle}
                      />
                    </FormField>

                    {/* Type */}
                    <FormField label="Freeze type">
                      <div className="flex gap-2">
                        {(['soft', 'hard'] as FreezeType[]).map(t => {
                          const b = freezeTypeBadge(t)
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setField('type', t)}
                              className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                              style={
                                draft.type === t
                                  ? { background: b.bg, color: b.text, border: `1px solid ${b.border}` }
                                  : { background: 'transparent', color: T.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.3)}` }
                              }
                            >
                              <i className={`fa-solid ${t === 'hard' ? 'fa-lock' : 'fa-triangle-exclamation'} text-[10px] mr-1.5`} />
                              {t === 'hard' ? 'Hard' : 'Soft'}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: T.onSurfaceVar }}>
                        {draft.type === 'hard'
                          ? 'Hard freeze: events overlapping this window will be marked as blocked.'
                          : 'Soft freeze: events will receive a warning but are not blocked.'}
                      </p>
                    </FormField>

                    {/* Scope type */}
                    <FormField label="Scope">
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['global', 'environment', 'service', 'domain'] as FreezeScope[]).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setField('scopeType', s)
                              setField('scopeIds', [])
                            }}
                            className="py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all"
                            style={
                              draft.scopeType === s
                                ? { background: ha('primary', 0.15), color: T.primary, border: `1px solid ${ha('primary', 0.4)}` }
                                : { background: 'transparent', color: T.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.3)}` }
                            }
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </FormField>

                    {/* Scope IDs */}
                    {draft.scopeType === 'environment' && (
                      <FormField label="Environments" error={formErrors.scopeIds}>
                        <MultiSelectScope
                          options={environmentOptions}
                          selected={draft.scopeIds ?? []}
                          onToggle={(value) => {
                            const current = draft.scopeIds ?? []
                            setField('scopeIds', current.includes(value)
                              ? current.filter(v => v !== value)
                              : [...current, value])
                          }}
                          emptyMessage="No environment found in events"
                        />
                      </FormField>
                    )}

                    {draft.scopeType === 'service' && (
                      <FormField label="Services" error={formErrors.scopeIds}>
                        <MultiSelectScope
                          options={serviceOptions.map(value => ({ value, label: value }))}
                          selected={draft.scopeIds ?? []}
                          onToggle={(value) => {
                            const current = draft.scopeIds ?? []
                            setField('scopeIds', current.includes(value)
                              ? current.filter(v => v !== value)
                              : [...current, value])
                          }}
                          emptyMessage="No service found in catalog"
                        />
                      </FormField>
                    )}

                    {draft.scopeType === 'domain' && (
                      <FormField label="Domain IDs (comma-separated)" error={formErrors.scopeIds}>
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          placeholder="e.g. billing, security, customer-platform"
                          value={(draft.scopeIds ?? []).join(', ')}
                          onChange={e =>
                            setField('scopeIds', e.target.value.split(',').map(v => v.trim()).filter(Boolean))
                          }
                          style={inputStyle}
                        />
                      </FormField>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Starts at" error={formErrors.startsAt}>
                        <input
                          type="datetime-local"
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          value={draft.startsAt.slice(0, 16)}
                          onChange={e => setField('startsAt', e.target.value)}
                          style={inputStyle}
                        />
                      </FormField>
                      <FormField label="Ends at" error={formErrors.endsAt}>
                        <input
                          type="datetime-local"
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          value={draft.endsAt.slice(0, 16)}
                          onChange={e => setField('endsAt', e.target.value)}
                          style={inputStyle}
                        />
                      </FormField>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        id="fw-active"
                        type="checkbox"
                        checked={draft.active ?? true}
                        onChange={e => setField('active', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="fw-active" className="text-sm cursor-pointer select-none" style={{ color: T.onSurface }}>
                        Active
                      </label>
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>

            {/* Panel footer */}
            {(isEditing || isCreating) && (
              <div className="px-6 py-4 flex justify-end gap-2 shrink-0" style={{ background: T.surface, borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => isCreating ? closePanel() : setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  style={{ background: T.primary, color: '#fff' }}
                >
                  {isCreating ? 'Create freeze window' : 'Save changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

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

      <div
        className="max-h-44 overflow-y-auto rounded-md p-2 border"
        style={{ borderColor: 'rgb(var(--hud-outline-var) / 0.3)', background: 'rgb(var(--hud-surface-high))' }}
      >
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

function FormField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
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
