import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { eventsApi } from '../lib/api'
import { EventType } from '../types/api'
import type { Event } from '../types/api'
import { TrendingUp, Clock, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import EventDetailsModal from '../components/EventDetailsModal'
import { getStatusLabel, getEnvironmentLabel } from '../lib/eventUtils'

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
  const isFail = s === 'failure' || s === '2' || s === 'error' || s === '5'
  const isRunning = s === 'start' || s === '1' || s === 'in_progress' || s === '12'
  const isWarning = s === 'warning' || s === '4'
  const isOpen = s === 'open' || s === '9'
  const isPlanned = s === 'planned' || s === '13'

  const color = isSuccess ? '#34d399' : isFail ? '#ff6e84' : isRunning ? '#40ceed' : isWarning ? '#fbbf24' : isOpen ? '#a78bfa' : isPlanned ? '#60a5fa' : T.onSurfaceVar
  const bg = isSuccess ? 'rgba(52,211,153,0.1)' : isFail ? 'rgba(255,110,132,0.1)' : isRunning ? 'rgba(64,206,237,0.1)' : isWarning ? 'rgba(251,191,36,0.1)' : isOpen ? 'rgba(167,139,250,0.1)' : isPlanned ? 'rgba(96,165,250,0.1)' : 'rgba(163,170,196,0.1)'
  const border = isSuccess ? 'rgba(52,211,153,0.2)' : isFail ? 'rgba(255,110,132,0.2)' : isRunning ? 'rgba(64,206,237,0.2)' : isWarning ? 'rgba(251,191,36,0.2)' : isOpen ? 'rgba(167,139,250,0.2)' : isPlanned ? 'rgba(96,165,250,0.2)' : 'rgba(163,170,196,0.2)'

  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="px-2 py-0.5 rounded-full" style={{ background: bg, border: `1px solid ${border}` }}>
        {getStatusLabel(status)}
      </span>
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

function OwnerAvatar({ name }: { name?: string }) {
  if (!name) return <span style={{ color: T.onSurfaceVar }}>—</span>
  const initials = name.split(/[\s._-]/).map(p => p[0]?.toUpperCase() || '').join('').slice(0, 2) || '??'
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ background: a('primary', 0.2), color: T.primary }}>
        {initials}
      </div>
      <span className="text-xs truncate max-w-[80px]" style={{ color: T.onSurface }} title={name}>{name}</span>
    </div>
  )
}

const PAGE_SIZE = 10

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RpaUsage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'rpa_usage'],
    queryFn: () => eventsApi.search({ type: EventType.RPA_USAGE as unknown as number }),
  })

  const rpaOperations: Event[] = data?.events || []

  // ── Computed stats ────────────────────────────────────────────────────────
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  const thisMonthOps = useMemo(() =>
    rpaOperations.filter(op => {
      if (!op.metadata?.createdAt) return false
      const d = new Date(op.metadata.createdAt)
      return d >= monthStart && d <= monthEnd
    }),
    [rpaOperations]
  )

  const byService = useMemo(() =>
    rpaOperations.reduce((acc, op) => {
      const s = op.attributes.service
      acc[s] = acc[s] || []
      acc[s].push(op)
      return acc
    }, {} as Record<string, Event[]>),
    [rpaOperations]
  )

  const maxServiceOps = useMemo(() =>
    Math.max(1, ...Object.values(byService).map(ops => ops.length)),
    [byService]
  )

  // Mini sparkline: last 5 months op counts
  const sparkline = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
      const end = endOfMonth(month)
      return rpaOperations.filter(op => {
        if (!op.metadata?.createdAt) return false
        const d = new Date(op.metadata.createdAt)
        return d >= month && d <= end
      }).length
    })
  }, [rpaOperations])
  const sparkMax = Math.max(1, ...sparkline)

  // All statuses present in ops
  const uniqueStatuses = useMemo(() =>
    [...new Set(rpaOperations.map(op => String(op.attributes.status || '').toLowerCase()))].filter(Boolean),
    [rpaOperations]
  )

  // Filtered + paginated
  const filteredOps = useMemo(() => {
    let list = [...rpaOperations].sort((a, b) => {
      const da = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0
      const db = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0
      return db - da
    })
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(op =>
        op.title.toLowerCase().includes(q) ||
        op.attributes.service?.toLowerCase().includes(q) ||
        op.attributes.source?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter(op => String(op.attributes.status || '').toLowerCase() === statusFilter)
    }
    return list
  }, [rpaOperations, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOps.length / PAGE_SIZE))
  const pageOps = filteredOps.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const hasFilters = search || statusFilter !== 'all'
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setPage(0) }

  const getTimeSince = (ts: any): string => {
    if (!ts) return '-'
    const diffMs = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return '< 1m'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: T.primary, borderTopColor: 'transparent' }} />
          <p className="text-sm font-mono" style={{ color: T.onSurfaceVar }}>Loading RPA data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="p-10 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>RPA Usage</h1>
            <p className="text-sm mt-2 max-w-xl font-light leading-relaxed" style={{ color: T.onSurfaceVar }}>
              Real-time monitoring of automated processes. Granular analysis of RPA flows, performance metrics and critical transaction monitoring.
            </p>
          </div>

        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Operations */}
          <div className="p-8 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow, borderLeft: `2px solid ${T.primary}` }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: a('primary', 0.06) }} />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Total RPA Operations</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a('primary', 0.12) }}>
                <FontAwesomeIcon icon={faRobot} className="w-5 h-5" style={{ color: T.primary }} />
              </div>
            </div>
            <p className="text-5xl font-medium tracking-tighter font-mono" style={{ color: T.onSurface }}>
              {rpaOperations.length.toLocaleString()}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs" style={{ color: T.tertiary }}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{thisMonthOps.length} this month</span>
            </div>
          </div>

          {/* This Month + sparkline */}
          <div className="p-8 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow, borderLeft: `2px solid ${T.tertiary}` }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: a('tertiary', 0.06) }} />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>This Month</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a('tertiary', 0.12) }}>
                <TrendingUp className="w-5 h-5" style={{ color: T.tertiary }} />
              </div>
            </div>
            <p className="text-5xl font-medium tracking-tighter font-mono" style={{ color: T.onSurface }}>
              {thisMonthOps.length.toLocaleString()}
            </p>
            {/* Mini sparkline */}
            <div className="mt-6 h-10 flex items-end gap-1">
              {sparkline.map((v, i) => {
                const pct = Math.max(8, (v / sparkMax) * 100)
                const isCurrent = i === 4
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${pct}%`,
                    background: isCurrent ? T.tertiary : a('tertiary', 0.25),
                    boxShadow: isCurrent ? `0 0 10px ${a('tertiary', 0.4)}` : undefined,
                  }} />
                )
              })}
            </div>
          </div>

          {/* Active Services */}
          <div className="p-8 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow, borderLeft: `2px solid ${a('outlineVar', 0.6)}` }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: a('outlineVar', 0.04) }} />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Active RPA Services</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a('outlineVar', 0.1) }}>
                <Clock className="w-5 h-5" style={{ color: T.onSurfaceVar }} />
              </div>
            </div>
            <p className="text-5xl font-medium tracking-tighter font-mono" style={{ color: T.onSurface }}>
              {Object.keys(byService).length.toLocaleString()}
            </p>
            <p className="mt-6 text-xs" style={{ color: T.onSurfaceVar }}>
              distinct services
            </p>
          </div>
        </div>

        {/* ── Usage by Service ── */}
        <div>
          <div className="p-8 rounded-2xl" style={{ background: T.surface }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.tertiary }} />
                Usage by Service
              </h3>
            </div>

            {Object.keys(byService).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FontAwesomeIcon icon={faRobot} className="w-8 h-8 mb-3" style={{ color: T.onSurfaceVar } as any} />
                <p className="text-sm" style={{ color: T.onSurfaceVar }}>No RPA operations recorded yet</p>
              </div>
            ) : (
              <div className="space-y-7">
                {Object.entries(byService)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([service, ops]) => {
                    const pct = Math.round((ops.length / maxServiceOps) * 100)
                    return (
                      <div key={service}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ background: a('primary', 0.1) }}>
                              <FontAwesomeIcon icon={faRobot} className="w-4 h-4" style={{ color: T.primary } as any} />
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono" style={{ color: T.onSurface }}>{service}</p>
                              <p className="text-[10px] uppercase tracking-tighter" style={{ color: T.onSurfaceVar }}>RPA Service</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-medium font-mono" style={{ color: T.onSurface }}>{((ops.length / rpaOperations.length) * 100).toFixed(1)}%</span>
                            <p className="text-[10px]" style={{ color: T.onSurfaceVar }}>{ops.length} ops</p>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: a('outlineVar', 0.15) }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(to right, ${T.primary}, ${T.tertiary})`,
                              boxShadow: `0 0 12px ${a('primary', 0.3)}`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

        </div>

        {/* ── Recent Executions Table ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>

          {/* Table header + filters */}
          <div className="px-8 py-6" style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Recent Executions</h3>
                <p className="text-xs mt-0.5" style={{ color: T.onSurfaceVar }}>
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredOps.length)} of {filteredOps.length} operations
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.onSurfaceVar }} />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                    className="pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none w-48"
                    style={{ background: a('outlineVar', 0.07), color: T.onSurface, border: `1px solid ${a('outlineVar', 0.15)}` }}
                  />
                </div>
                {/* Clear */}
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    color: T.onSurfaceVar,
                    background: a('outlineVar', 0.08),
                    visibility: hasFilters ? 'visible' : 'hidden',
                  }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>

            {/* Status quick filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Status</span>
              {uniqueStatuses.map(s => (
                <button key={s}
                  onClick={() => { setStatusFilter(prev => prev === s ? 'all' : s); setPage(0) }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                  style={{
                    background: statusFilter === s ? a('primary', 0.15) : 'transparent',
                    color: statusFilter === s ? T.primary : T.onSurfaceVar,
                    border: `1px solid ${statusFilter === s ? a('primary', 0.4) : a('outline', 0.2)}`,
                  }}
                >{getStatusLabel(s)}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          {pageOps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FontAwesomeIcon icon={faRobot} className="w-8 h-8 mb-4" style={{ color: T.onSurfaceVar } as any} />
              <p className="text-sm font-bold" style={{ color: T.onSurface }}>
                {hasFilters ? 'No operations match your filters' : 'No RPA operations recorded'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold"
                  style={{ background: a('outlineVar', 0.1), color: T.onSurfaceVar }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
                    {['Task Name', 'Service', 'Source', 'Environment', 'Status', 'Owner', 'Time'].map(col => (
                      <th key={col} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageOps.map((op, idx) => (
                    <tr
                      key={op.metadata?.id || idx}
                      onClick={() => setSelectedEvent(op)}
                      className="cursor-pointer transition-all"
                      style={{ borderBottom: `1px solid ${a('outlineVar', 0.05)}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = a('outlineVar', 0.05))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Task Name */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{
                            background: ['success', 'done'].includes(String(op.attributes.status).toLowerCase()) ? '#34d399'
                              : ['failure', 'error'].includes(String(op.attributes.status).toLowerCase()) ? '#ff6e84'
                              : ['start', 'in_progress'].includes(String(op.attributes.status).toLowerCase()) ? T.tertiary
                              : T.onSurfaceVar
                          }} />
                          <span className="font-medium text-sm font-mono truncate max-w-[160px]" style={{ color: T.onSurface }} title={op.title}>
                            {op.title}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-6 py-5">
                        <span className="text-sm truncate max-w-[100px] block" style={{ color: T.onSurface }} title={op.attributes.service}>
                          {op.attributes.service}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-6 py-5">
                        <span className="text-sm" style={{ color: a('onSurface', 0.8) }}>
                          {op.attributes.source || '—'}
                        </span>
                      </td>

                      {/* Environment */}
                      <td className="px-6 py-5">
                        {op.attributes.environment
                          ? <EnvBadge env={op.attributes.environment} />
                          : <span style={{ color: T.onSurfaceVar }}>—</span>
                        }
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <StatusBadge status={String(op.attributes.status || '')} />
                      </td>

                      {/* Owner */}
                      <td className="px-6 py-5">
                        <OwnerAvatar name={op.attributes.owner} />
                      </td>

                      {/* Time */}
                      <td className="px-6 py-5 text-right">
                        <span className="text-xs font-mono" style={{ color: T.onSurfaceVar }}>
                          {getTimeSince(op.metadata?.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-8 py-5 flex items-center justify-between" style={{ borderTop: `1px solid ${a('outlineVar', 0.06)}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
              {filteredOps.length} result{filteredOps.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: a('outlineVar', 0.1), color: T.onSurfaceVar }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8 rounded text-xs font-bold transition-all"
                    style={pageNum === page
                      ? { background: T.primary, color: '#1a0050' }
                      : { background: a('outlineVar', 0.1), color: T.onSurfaceVar }
                    }
                  >
                    {pageNum + 1}
                  </button>
                )
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: a('outlineVar', 0.1), color: T.onSurfaceVar }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
