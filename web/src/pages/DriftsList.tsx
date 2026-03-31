import { useState, useEffect, useMemo } from 'react'

import { eventsApi } from '../lib/api'
import type { Event } from '../types/api'
import { EventType, Status, Priority } from '../types/api'
import { AlertTriangle, AlertCircle, ExternalLink, CheckCircle, X, Search } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { faJira } from '@fortawesome/free-brands-svg-icons'
import { getEnvironmentLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const V = {
  bg:             '--hud-bg',
  surfaceLow:     '--hud-surface-low',
  surface:        '--hud-surface',
  surfaceHigh:    '--hud-surface-high',
  surfaceHighest: '--hud-surface-highest',
  primary:        '--hud-primary',
  tertiary:       '--hud-tertiary',
  onSurface:      '--hud-on-surface',
  onSurfaceVar:   '--hud-on-surface-var',
  outline:        '--hud-outline',
  outlineVar:     '--hud-outline-var',
  success:        '--hud-success',
  error:          '--hud-error',
}
const T = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, `rgb(var(${v}))`])) as Record<keyof typeof V, string>
const a = (key: keyof typeof V, opacity: number) => `rgb(var(${V[key]}) / ${opacity})`

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase()
  const isSuccess = s === 'success' || s === '3' || s === 'done' || s === '11'
  const isFail = s === 'failure' || s === '2' || s === 'error' || s === '5' || s === 'failed'
  const isRunning = s === 'start' || s === '1' || s === 'in_progress' || s === '12'
  const isWarning = s === 'warning' || s === '4'
  const isOpen = s === 'open' || s === '9'
  const isPlanned = s === 'planned' || s === '13'
  const isClosed = s === 'close' || s === '10' || s === 'closed'

  const color = isSuccess ? '#34d399' : isFail ? '#ff6e84' : isRunning ? '#40ceed' : isWarning ? '#fbbf24' : isOpen ? '#a78bfa' : isPlanned ? '#60a5fa' : isClosed ? '#6b7280' : T.onSurfaceVar
  const bg = isSuccess ? 'rgba(52,211,153,0.1)' : isFail ? 'rgba(255,110,132,0.1)' : isRunning ? 'rgba(64,206,237,0.1)' : isWarning ? 'rgba(251,191,36,0.1)' : isOpen ? 'rgba(167,139,250,0.1)' : isPlanned ? 'rgba(96,165,250,0.1)' : isClosed ? 'rgba(107,114,128,0.1)' : 'rgba(163,170,196,0.1)'
  const border = isSuccess ? 'rgba(52,211,153,0.2)' : isFail ? 'rgba(255,110,132,0.2)' : isRunning ? 'rgba(64,206,237,0.2)' : isWarning ? 'rgba(251,191,36,0.2)' : isOpen ? 'rgba(167,139,250,0.2)' : isPlanned ? 'rgba(96,165,250,0.2)' : isClosed ? 'rgba(107,114,128,0.2)' : 'rgba(163,170,196,0.2)'

  return (
    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full" style={{ background: bg, color, border: `1px solid ${border}` }}>
      {getStatusLabel(status)}
    </span>
  )
}

function EnvBadge({ env }: { env?: string }) {
  const e = String(env || '').toLowerCase()
  const color =
    e === 'production' || e === '7' ? '#f87171' :
    e === 'preproduction' || e === '6' ? '#fb923c' :
    e === 'uat' || e === '4' || e === 'recette' || e === '5' || e === 'tnr' || e === '3' ? '#60a5fa' :
    e === 'integration' || e === '2' ? '#2dd4bf' :
    e === 'development' || e === '1' ? '#4ade80' :
    T.onSurfaceVar
  return (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {getEnvironmentLabel(env || '')}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function HudModal({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-md p-6 shadow-2xl" style={{ background: T.surface, border: `1px solid ${a('outlineVar', 0.15)}` }}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-bold text-sm" style={{ color: T.onSurface, fontFamily: "'Space Grotesk',sans-serif" }}>{title}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: T.onSurfaceVar, background: a('outlineVar', 0.08) }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
type ViewMode = 'active' | 'all'

export default function DriftsList() {
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [allDrifts, setAllDrifts] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrift, setSelectedDrift] = useState<Event | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')

  // Mark as done
  const [showMarkDonePrompt, setShowMarkDonePrompt] = useState(false)
  const [driftToMarkDone, setDriftToMarkDone] = useState<Event | null>(null)
  const [markDoneUser, setMarkDoneUser] = useState('')
  const [markDoneUserError, setMarkDoneUserError] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)

  // Add ticket
  const [showCreateTicketPrompt, setShowCreateTicketPrompt] = useState(false)
  const [driftToCreateTicket, setDriftToCreateTicket] = useState<Event | null>(null)
  const [ticketUrl, setTicketUrl] = useState('')
  const [ticketUrlError, setTicketUrlError] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)

  const loadDrifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await eventsApi.search({ type: EventType.DRIFT as unknown as number })
      setAllDrifts(data.events || [])
    } catch (err) {
      setError('Error loading drifts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrifts() }, [])

  // Active drifts = exclude done/close/closed/failed
  const activeDrifts = useMemo(() =>
    allDrifts.filter(d => !['failed', 'done', 'closed', 'close'].includes(String(d.attributes.status || '').toLowerCase())),
    [allDrifts]
  )

  const baseDrifts = viewMode === 'active' ? activeDrifts : allDrifts

  // Unique filter values from current base
  const uniqueStatuses = useMemo(() => [...new Set(baseDrifts.map(d => String(d.attributes.status || '').toLowerCase()))].filter(Boolean), [baseDrifts])
  const uniqueEnvironments = useMemo(() => [...new Set(baseDrifts.map(d => String(d.attributes.environment || '').toLowerCase()))].filter(Boolean), [baseDrifts])
  const uniqueServices = useMemo(() => [...new Set(baseDrifts.map(d => d.attributes.service))].filter(Boolean).sort(), [baseDrifts])

  const filteredDrifts = useMemo(() => {
    let list = baseDrifts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.attributes.service?.toLowerCase().includes(q) ||
        d.attributes.message?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') list = list.filter(d => String(d.attributes.status || '').toLowerCase() === statusFilter)
    if (environmentFilter !== 'all') list = list.filter(d => String(d.attributes.environment || '').toLowerCase() === environmentFilter)
    if (serviceFilter !== 'all') list = list.filter(d => d.attributes.service === serviceFilter)
    return list
  }, [baseDrifts, searchQuery, statusFilter, environmentFilter, serviceFilter])

  const hasFilters = searchQuery || statusFilter !== 'all' || environmentFilter !== 'all' || serviceFilter !== 'all'
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setEnvironmentFilter('all'); setServiceFilter('all') }

  // KPI stats (always based on allDrifts)
  const stats = useMemo(() => ({
    active: activeDrifts.length,
    services: new Set(activeDrifts.map(d => d.attributes.service)).size,
    critical: activeDrifts.filter(d => String(d.attributes.status || '').toLowerCase() === 'error' || d.attributes.priority === Priority.P1).length,
    total: allDrifts.length,
    resolved: allDrifts.filter(d => ['done', 'closed', 'close'].includes(String(d.attributes.status || '').toLowerCase())).length,
  }), [allDrifts, activeDrifts])

  // Helpers
  const parseTimestamp = (ts: any): Date | null => {
    if (!ts) return null
    if (typeof ts === 'string') { const d = new Date(ts); return isNaN(d.getTime()) ? null : d }
    if (ts.seconds !== undefined) return new Date(Number(ts.seconds) * 1000 + (ts.nanos || 0) / 1000000)
    return null
  }

  const getTimeSince = (ts: any) => {
    const created = parseTimestamp(ts)
    if (!created) return '-'
    const diffMs = Date.now() - created.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return '< 1m'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const isJiraTicket = (url: string) =>
    url.toLowerCase().includes('atlassian.net') || url.toLowerCase().includes('jira') || /[a-z]+-\d+/i.test(url)

  const handleCreateJiraTicket = (drift: Event) => {
    setDriftToCreateTicket(drift); setShowCreateTicketPrompt(true); setTicketUrl(''); setTicketUrlError(false)
  }

  const handleCreateTicketConfirm = async () => {
    if (!ticketUrl.trim()) { setTicketUrlError(true); return }
    if (!driftToCreateTicket?.metadata?.id) return
    try {
      setCreatingTicket(true); setShowCreateTicketPrompt(false)
      await eventsApi.update(driftToCreateTicket.metadata.id, {
        title: driftToCreateTicket.title,
        attributes: driftToCreateTicket.attributes,
        links: { ...driftToCreateTicket.links, ticket: ticketUrl.trim() },
      })
      await loadDrifts()
    } catch (err) { console.error(err); setError('Error adding ticket') }
    finally { setCreatingTicket(false); setDriftToCreateTicket(null) }
  }

  const handleMarkAsDone = (drift: Event) => {
    setDriftToMarkDone(drift); setShowMarkDonePrompt(true); setMarkDoneUser(''); setMarkDoneUserError(false)
  }

  const handleMarkDoneConfirm = async () => {
    if (!markDoneUser.trim()) { setMarkDoneUserError(true); return }
    if (!driftToMarkDone?.metadata?.id) return
    try {
      setMarkingDone(true); setShowMarkDonePrompt(false)
      await eventsApi.update(driftToMarkDone.metadata.id, {
        title: driftToMarkDone.title,
        attributes: { ...driftToMarkDone.attributes, status: Status.DONE, owner: markDoneUser.trim() },
        links: driftToMarkDone.links,
      })
      await loadDrifts()
    } catch (err) { console.error(err); setError('Error marking drift as done') }
    finally { setMarkingDone(false); setDriftToMarkDone(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: T.primary, borderTopColor: 'transparent' }} />
          <p className="text-sm font-mono" style={{ color: T.onSurfaceVar }}>Loading drifts…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="p-10 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Configuration Drifts</h1>
            <p className="text-sm mt-1" style={{ color: T.onSurfaceVar }}>
              {stats.active} active drift{stats.active !== 1 ? 's' : ''} — {stats.total} total
            </p>
          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: a('error', 0.1), color: T.error, border: `1px solid ${a('error', 0.2)}` }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            { label: 'Active Drifts', value: stats.active, color: '#fbbf24', glow: 'rgba(251,191,36,0.04)', icon: <FontAwesomeIcon icon={faCodeBranch} className="w-4 h-4" style={{ color: '#fbbf24' }} />, sub: `${stats.total} total` },
            { label: 'Affected Services', value: stats.services, color: T.primary, glow: a('primary', 0.04), icon: <AlertCircle className="w-4 h-4" style={{ color: T.primary }} />, sub: 'unique services' },
            { label: 'Critical Issues', value: stats.critical, color: T.error, glow: a('error', 0.04), icon: <AlertTriangle className="w-4 h-4" style={{ color: T.error }} />, sub: 'P1 or error status', borderLeft: stats.critical > 0 ? `2px solid ${T.error}` : undefined },
            { label: 'Total Recorded', value: stats.total, color: T.tertiary, glow: a('tertiary', 0.04), icon: <FontAwesomeIcon icon={faCodeBranch} className="w-4 h-4" style={{ color: T.tertiary }} />, sub: 'all time' },
            { label: 'Resolved', value: stats.resolved, color: '#34d399', glow: 'rgba(52,211,153,0.04)', icon: <CheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />, sub: 'done / closed' },
          ].map(({ label, value, color, glow, icon, sub, borderLeft }) => (
            <div key={label} className="p-6 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow, borderLeft }}>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: glow }} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>{label}</span>
                {icon}
              </div>
              <div className="text-4xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif", color: value > 0 && label === 'Critical Issues' ? color : T.onSurface }}>
                {String(value).padStart(2, '0')}
              </div>
              <div className="mt-4 text-xs" style={{ color: T.onSurfaceVar }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── View Toggle + Filters ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>
          <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.surfaceLow }}>
              {(['active', 'all'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); clearFilters() }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize"
                  style={viewMode === mode
                    ? { background: T.surface, color: T.onSurface, boxShadow: `0 2px 8px ${a('outlineVar', 0.2)}` }
                    : { background: 'transparent', color: T.onSurfaceVar }
                  }
                >
                  {mode === 'active' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#fbbf24' }} />}
                  {mode === 'active' ? 'Active' : 'All Drifts'}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: a('outlineVar', 0.1), color: T.onSurfaceVar }}>
                    {mode === 'active' ? activeDrifts.length : allDrifts.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.onSurfaceVar }} />
                <input
                  type="text"
                  placeholder="Search drifts…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none"
                  style={{
                    background: a('outlineVar', 0.07),
                    color: T.onSurface,
                    border: `1px solid ${a('outlineVar', 0.15)}`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                color: T.onSurfaceVar,
                background: a('outlineVar', 0.08),
                visibility: hasFilters ? 'visible' : 'hidden',
              }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>

          {/* Inline quick filters */}
          <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ borderBottom: `1px solid ${a('outlineVar', 0.06)}` }}>
            {/* Status filters */}
            <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Status</span>
            {uniqueStatuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
                className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                style={{
                  background: statusFilter === s ? a('primary', 0.15) : 'transparent',
                  color: statusFilter === s ? T.primary : T.onSurfaceVar,
                  border: `1px solid ${statusFilter === s ? a('primary', 0.4) : a('outline', 0.2)}`,
                }}
              >{getStatusLabel(s)}</button>
            ))}

            <span className="w-px h-4 shrink-0" style={{ background: a('outline', 0.3) }} />

            {/* Env filters */}
            <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Env</span>
            {uniqueEnvironments.map(e => {
              const color =
                e === 'production' || e === '7' ? '#f87171' :
                e === 'preproduction' || e === '6' ? '#fb923c' :
                e === 'uat' || e === '4' || e === 'recette' || e === '5' ? '#60a5fa' :
                e === 'integration' || e === '2' ? '#2dd4bf' :
                e === 'development' || e === '1' ? '#4ade80' : T.onSurfaceVar
              return (
                <button
                  key={e}
                  onClick={() => setEnvironmentFilter(prev => prev === e ? 'all' : e)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                  style={{
                    background: environmentFilter === e ? `${color}20` : 'transparent',
                    color: environmentFilter === e ? color : T.onSurfaceVar,
                    border: `1px solid ${environmentFilter === e ? `${color}50` : a('outline', 0.2)}`,
                  }}
                >{getEnvironmentLabel(e)}</button>
              )
            })}

            {uniqueServices.length > 0 && <>
              <span className="w-px h-4 shrink-0" style={{ background: a('outline', 0.3) }} />
              <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Service</span>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="px-2 py-0.5 rounded text-[11px] font-medium focus:outline-none shrink-0"
                style={{
                  background: serviceFilter !== 'all' ? a('tertiary', 0.15) : 'transparent',
                  color: serviceFilter !== 'all' ? T.tertiary : T.onSurfaceVar,
                  border: `1px solid ${serviceFilter !== 'all' ? a('tertiary', 0.4) : a('outline', 0.2)}`,
                }}
              >
                <option value="all">All services</option>
                {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>}
          </div>

          {/* Results count */}
          <div className="px-6 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${a('outlineVar', 0.06)}` }}>
            <span className="text-[11px] font-mono" style={{ color: T.onSurfaceVar }}>
              {filteredDrifts.length} / {baseDrifts.length} drifts
            </span>
          </div>

          {/* ── Table ── */}
          {filteredDrifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FontAwesomeIcon icon={faCodeBranch} className="w-8 h-8 mb-4" style={{ color: T.onSurfaceVar } as any} />
              <p className="text-sm font-bold" style={{ color: T.onSurface }}>
                {hasFilters ? 'No drifts match your filters' : viewMode === 'active' ? 'No active drifts' : 'No drifts recorded'}
              </p>
              <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>
                {hasFilters ? 'Try adjusting your search or filters' : viewMode === 'active' ? 'All configurations are in sync' : 'No configuration drift has been recorded yet'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: a('outlineVar', 0.1), color: T.onSurfaceVar }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
                    {['Service', 'Title', 'Environment', 'Status', 'Age', 'Ticket', ''].map(col => (
                      <th key={col} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDrifts.map((drift, idx) => (
                    <tr
                      key={drift.metadata?.id || idx}
                      onClick={() => setSelectedDrift(drift)}
                      className="cursor-pointer transition-all"
                      style={{ borderBottom: `1px solid ${a('outlineVar', 0.05)}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = a('outlineVar', 0.05))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Service */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCodeBranch} className="w-3.5 h-3.5 shrink-0" style={{ color: '#fbbf24' } as any} />
                          <span className="text-xs font-mono font-medium truncate max-w-[120px]" style={{ color: T.onSurface }} title={drift.attributes.service}>
                            {drift.attributes.service}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4 max-w-[220px]">
                        <div className="text-xs font-semibold truncate" style={{ color: T.onSurface }} title={drift.title}>
                          {drift.title}
                        </div>
                        {drift.attributes.message && (
                          <div className="text-[10px] truncate mt-0.5" style={{ color: T.onSurfaceVar }} title={drift.attributes.message}>
                            {drift.attributes.message}
                          </div>
                        )}
                      </td>

                      {/* Environment */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {drift.attributes.environment && <EnvBadge env={drift.attributes.environment} />}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={String(drift.attributes.status || '')} />
                      </td>

                      {/* Age */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}>
                          {getTimeSince(drift.metadata?.createdAt)}
                        </span>
                      </td>

                      {/* Ticket */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {drift.links?.ticket ? (
                          <a
                            href={drift.links.ticket}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[11px] font-bold transition-opacity hover:opacity-70"
                            style={{ color: '#0052cc' }}
                            title={isJiraTicket(drift.links.ticket) ? 'View Jira ticket' : 'View ticket'}
                          >
                            {isJiraTicket(drift.links.ticket)
                              ? <FontAwesomeIcon icon={faJira} className="w-3.5 h-3.5" />
                              : <ExternalLink className="w-3.5 h-3.5" />
                            }
                          </a>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); handleCreateJiraTicket(drift) }}
                            className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
                            style={{ color: T.onSurfaceVar }}
                            title="Add Jira ticket"
                          >
                            <FontAwesomeIcon icon={faJira} className="w-3.5 h-3.5" />
                            <span>Link</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkAsDone(drift) }}
                          title="Mark as done"
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Details Modal ── */}
      {selectedDrift && (
        <EventDetailsModal event={selectedDrift} onClose={() => setSelectedDrift(null)} />
      )}

      {/* ── Mark as Done Modal ── */}
      {showMarkDonePrompt && driftToMarkDone && (
        <HudModal title="Mark Drift as Done" onClose={() => setShowMarkDonePrompt(false)}>
          <p className="text-xs mb-4" style={{ color: T.onSurfaceVar }}>
            Mark <span className="font-bold" style={{ color: T.onSurface }}>{driftToMarkDone.title}</span> as resolved for service{' '}
            <span className="font-mono font-bold" style={{ color: T.onSurface }}>{driftToMarkDone.attributes.service}</span>
          </p>
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
              Your Name <span style={{ color: T.error }}>*</span>
            </label>
            <input
              type="text"
              value={markDoneUser}
              onChange={e => { setMarkDoneUser(e.target.value); setMarkDoneUserError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleMarkDoneConfirm()}
              placeholder="e.g., john.doe"
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
              style={{
                background: a('outlineVar', 0.08),
                color: T.onSurface,
                border: `1px solid ${markDoneUserError ? T.error : a('outlineVar', 0.2)}`,
              }}
            />
            {markDoneUserError && <p className="mt-1 text-[10px]" style={{ color: T.error }}>Name is required</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMarkDonePrompt(false)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}
            >
              Cancel
            </button>
            <button
              onClick={handleMarkDoneConfirm}
              disabled={markingDone}
              className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: '#34d399', color: '#fff' }}
            >
              {markingDone
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><CheckCircle className="w-3.5 h-3.5" /> Mark as Done</>
              }
            </button>
          </div>
        </HudModal>
      )}

      {/* ── Add Jira Ticket Modal ── */}
      {showCreateTicketPrompt && driftToCreateTicket && (
        <HudModal
          title={<span className="flex items-center gap-2"><FontAwesomeIcon icon={faJira} style={{ color: '#0052cc' }} /> Add Jira Ticket</span>}
          onClose={() => setShowCreateTicketPrompt(false)}
        >
          <p className="text-xs mb-4" style={{ color: T.onSurfaceVar }}>
            Link a Jira ticket to <span className="font-bold" style={{ color: T.onSurface }}>{driftToCreateTicket.title}</span>
          </p>
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
              Ticket URL <span style={{ color: T.error }}>*</span>
            </label>
            <input
              type="url"
              value={ticketUrl}
              onChange={e => { setTicketUrl(e.target.value); setTicketUrlError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleCreateTicketConfirm()}
              placeholder={`${import.meta.env.VITE_JIRA_DOMAIN || 'https://company.atlassian.net'}/browse/DRIFT-123`}
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
              style={{
                background: a('outlineVar', 0.08),
                color: T.onSurface,
                border: `1px solid ${ticketUrlError ? T.error : a('outlineVar', 0.2)}`,
              }}
            />
            {ticketUrlError && <p className="mt-1 text-[10px]" style={{ color: T.error }}>Ticket URL is required</p>}
            <div className="mt-2">
              <a
                href={import.meta.env.VITE_JIRA_DOMAIN || 'https://company.atlassian.net'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
                style={{ color: '#0052cc' }}
              >
                <FontAwesomeIcon icon={faJira} className="w-3 h-3" />
                Open Jira
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateTicketPrompt(false)}
              className="flex-1 py-2 rounded-lg text-xs font-bold"
              style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTicketConfirm}
              disabled={creatingTicket}
              className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              style={{ background: '#0052cc', color: '#fff' }}
            >
              {creatingTicket
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                : <><FontAwesomeIcon icon={faJira} className="w-3.5 h-3.5" /> Add Ticket</>
              }
            </button>
          </div>
        </HudModal>
      )}
    </div>
  )
}
