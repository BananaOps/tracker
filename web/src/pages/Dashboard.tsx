import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { Plus, TrendingUp, CheckCircle, AlertTriangle, Zap, MoreVertical, Filter, ArrowRight, BarChart3, Clock, Rocket, AlertOctagon, Settings, Wrench, Bot, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Status, Priority } from '../types/api'
import type { Event } from '../types/api'
import {
  getEventTypeLabel,
  getEnvironmentLabel,
  getStatusLabel,
  getPriorityLabel,
} from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

// ─── Design Tokens (CSS variable references for light/dark) ──────────────────
// Helper: produce rgb(.../ alpha) from a CSS var reference
function alpha(cssVar: string, a: number) {
  // cssVar is like "var(--hud-primary)" — extract the var name
  const match = cssVar.match(/var\(([^)]+)\)/)
  if (match) return `rgb(${match[1].replace('var(', '').replace(')', '')} / ${a})`
  return cssVar
}
// Shorthand refs to CSS vars (raw var names for alpha helper)
const V = {
  bg:             '--hud-bg',
  surfaceLow:     '--hud-surface-low',
  surface:        '--hud-surface',
  surfaceHigh:    '--hud-surface-high',
  surfaceHighest: '--hud-surface-highest',
  primary:        '--hud-primary',
  primaryDim:     '--hud-primary-dim',
  secondary:      '--hud-secondary',
  tertiary:       '--hud-tertiary',
  onSurface:      '--hud-on-surface',
  onSurfaceVar:   '--hud-on-surface-var',
  outline:        '--hud-outline',
  outlineVar:     '--hud-outline-var',
  success:        '--hud-success',
  error:          '--hud-error',
}
// Resolved color strings
const T = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, `rgb(var(${v}))`])) as Record<keyof typeof V, string>
const a = (key: keyof typeof V, opacity: number) => `rgb(var(${V[key]}) / ${opacity})`

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase()
  const isSuccess = s === 'success' || s === '3' || s === 'done' || s === '11'
  const isFail = s === 'failure' || s === '2' || s === 'error' || s === '5'
  const isRunning = s === 'start' || s === '1' || s === 'in_progress' || s === '12'
  const isWarning = s === 'warning' || s === '4'
  const isOpen = s === 'open' || s === '9'
  const isClosed = s === 'close' || s === '10'
  const isPlanned = s === 'planned' || s === '13'

  const color = isSuccess ? '#26c06f' : isFail ? '#ff4953' : isRunning ? '#007be5' : isWarning ? '#ff8000' : isOpen ? '#8649e1' : isClosed ? '#6c6e79' : isPlanned ? '#3b9cf4' : T.onSurfaceVar
  const bg = isSuccess ? 'rgba(38,192,111,0.1)' : isFail ? 'rgba(255,73,83,0.1)' : isRunning ? 'rgba(0,123,229,0.1)' : isWarning ? 'rgba(255,128,0,0.1)' : isOpen ? 'rgba(134,73,225,0.1)' : isClosed ? 'rgba(108,110,121,0.1)' : isPlanned ? 'rgba(59,156,244,0.1)' : 'rgba(168,171,183,0.1)'
  const border = isSuccess ? 'rgba(38,192,111,0.2)' : isFail ? 'rgba(255,73,83,0.2)' : isRunning ? 'rgba(0,123,229,0.2)' : isWarning ? 'rgba(255,128,0,0.2)' : isOpen ? 'rgba(134,73,225,0.2)' : isClosed ? 'rgba(108,110,121,0.2)' : isPlanned ? 'rgba(59,156,244,0.2)' : 'rgba(168,171,183,0.2)'

  return (
    <span
      className="px-3 py-1 text-[10px] font-bold uppercase rounded-full"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function EventTypeIcon({ type, color }: { type: string; color: string }) {
  const t = String(type).toLowerCase()
  const cls = "w-4 h-4"
  if (t === 'deployment' || t === '1') return <Rocket className={cls} style={{ color }} />
  if (t === 'incident' || t === '4') return <AlertOctagon className={cls} style={{ color }} />
  if (t === 'drift' || t === '3') return <Settings className={cls} style={{ color }} />
  if (t === 'operation' || t === '2') return <Wrench className={cls} style={{ color }} />
  if (t === 'rpa_usage' || t === '5') return <Bot className={cls} style={{ color }} />
  return <BarChart3 className={cls} style={{ color }} />
}

function getEventTypeIconColor(type: string) {
  const t = String(type).toLowerCase()
  if (t === 'deployment' || t === '1') return T.tertiary
  if (t === 'incident' || t === '4') return T.error
  if (t === 'drift' || t === '3') return T.onSurfaceVar
  return T.primary
}

function getEnvBadgeColor(env?: string): { color: string; bg: string; border: string } {
  const e = String(env || '').toLowerCase()
  if (e === 'production' || e === '7') return { color: '#ff4953', bg: 'rgba(255,73,83,0.1)', border: 'rgba(255,73,83,0.2)' }
  if (e === 'preproduction' || e === '6') return { color: '#ff8000', bg: 'rgba(255,128,0,0.1)', border: 'rgba(255,128,0,0.2)' }
  if (e === 'uat' || e === '4' || e === 'recette' || e === '5' || e === 'tnr' || e === '3') return { color: '#007be5', bg: 'rgba(0,123,229,0.1)', border: 'rgba(0,123,229,0.2)' }
  if (e === 'integration' || e === '2') return { color: '#00b3bd', bg: 'rgba(0,179,189,0.1)', border: 'rgba(0,179,189,0.2)' }
  if (e === 'development' || e === '1') return { color: '#26c06f', bg: 'rgba(38,192,111,0.1)', border: 'rgba(38,192,111,0.2)' }
  if (e === 'mco' || e === '8') return { color: '#8649e1', bg: 'rgba(134,73,225,0.1)', border: 'rgba(134,73,225,0.2)' }
  return { color: T.onSurfaceVar, bg: 'rgba(168,171,183,0.1)', border: 'rgba(168,171,183,0.2)' }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [streamFilters, setStreamFilters] = useState<{ type?: string; status?: string; env?: string }>({})

  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsApi.today({ perPage: 100 }),
    refetchInterval: 30000,
  })
  const events: Event[] = todayEvents?.events || []

  const stats = useMemo(() => {
    const total = events.length
    const success = events.filter(e => e.attributes.status === Status.SUCCESS || e.attributes.status === Status.DONE).length
    const failure = events.filter(e => e.attributes.status === Status.FAILURE || e.attributes.status === Status.ERROR).length
    const inProgress = events.filter(e => e.attributes.status === Status.START || e.attributes.status === Status.IN_PROGRESS).length
    const critical = events.filter(e => e.attributes.priority === Priority.P1).length
    const completed = success + failure
    const successRate = completed > 0 ? ((success / completed) * 100).toFixed(1) : '—'
    return { total, success, failure, inProgress, critical, successRate, completed }
  }, [events])

  // Overlapping events: same service + environment with time overlap
  const overlapsCount = useMemo(() => {
    let count = 0
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i], b = events[j]
        if (a.attributes.service !== b.attributes.service) continue
        if (a.attributes.environment !== b.attributes.environment) continue
        const s1 = new Date(a.attributes.startDate || a.metadata?.createdAt || '')
        const e1 = a.attributes.endDate ? new Date(a.attributes.endDate) : s1
        const s2 = new Date(b.attributes.startDate || b.metadata?.createdAt || '')
        const e2 = b.attributes.endDate ? new Date(b.attributes.endDate) : s2
        if (s1 <= e2 && s2 <= e1) count++
      }
    }
    return count
  }, [events])

  // Filtered events for the stream table
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (streamFilters.type && String(e.attributes.type).toLowerCase() !== streamFilters.type) return false
      if (streamFilters.status) {
        const s = String(e.attributes.status).toLowerCase()
        const statusMap: Record<string, string[]> = {
          success: ['success', '3', 'done', '11'],
          failure: ['failure', '2', 'error', '5'],
          running: ['start', '1', 'in_progress', '12'],
          warning: ['warning', '4'],
          open: ['open', '9'],
          closed: ['close', '10'],
          planned: ['planned', '13'],
        }
        const allowed = statusMap[streamFilters.status]
        if (allowed && !allowed.includes(s)) return false
      }
      if (streamFilters.env) {
        const v = String(e.attributes.environment).toLowerCase()
        const envMap: Record<string, string[]> = {
          production: ['production', '7'],
          preproduction: ['preproduction', '6'],
          uat: ['uat', '4', 'recette', '5', 'tnr', '3'],
          development: ['development', '1', 'integration', '2'],
        }
        const allowed = envMap[streamFilters.env] || [streamFilters.env]
        if (!allowed.includes(v)) return false
      }
      return true
    })
  }, [events, streamFilters])

  const hasStreamFilters = !!(streamFilters.type || streamFilters.status || streamFilters.env)
  const toggleFilter = (key: 'type' | 'status' | 'env', value: string) => {
    setStreamFilters(prev => prev[key] === value ? { ...prev, [key]: undefined } : { ...prev, [key]: value })
  }

  // Environment distribution for donut
  const envDistribution = useMemo(() => {
    const total = events.length || 1
    const prod = events.filter(e => { const v = String(e.attributes.environment).toLowerCase(); return v === 'production' || v === '7' }).length
    const preprod = events.filter(e => { const v = String(e.attributes.environment).toLowerCase(); return v === 'preproduction' || v === '6' }).length
    const uat = events.filter(e => { const v = String(e.attributes.environment).toLowerCase(); return v === 'uat' || v === '4' || v === 'recette' || v === '5' || v === 'tnr' || v === '3' }).length
    const dev = events.filter(e => { const v = String(e.attributes.environment).toLowerCase(); return v === 'development' || v === '1' || v === 'integration' || v === '2' }).length
    const other = total - prod - preprod - uat - dev
    return {
      segments: [
        { label: 'Production', color: '#ff4953', count: prod, pct: Math.round((prod / total) * 100) },
        { label: 'Pré-production', color: '#ff8000', count: preprod, pct: Math.round((preprod / total) * 100) },
        { label: 'UAT / Recette', color: '#007be5', count: uat, pct: Math.round((uat / total) * 100) },
        { label: 'Dev / Integration', color: '#26c06f', count: dev, pct: Math.round((dev / total) * 100) },
        ...(other > 0 ? [{ label: 'Other', color: T.onSurfaceVar, count: other, pct: Math.round((other / total) * 100) }] : []),
      ],
      total: events.length,
    }
  }, [events])

  // Chart bars: 24h window, 1 bar per hour
  const chartBars = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) =>
      events.filter(e => new Date(e.metadata?.createdAt || '').getHours() === h).length
    )
    const max = Math.max(...counts, 1)
    return counts.map((count, h) => ({
      label: `${String(h).padStart(2, '0')}h`,
      count,
      pct: Math.max(4, (count / max) * 100),
    }))
  }, [events])

  // Donut SVG: cumulative offsets
  const circumference = 2 * Math.PI * 80
  const donutSegments = useMemo(() => {
    let cumulative = 0
    return envDistribution.segments.map(seg => {
      const length = (circumference * seg.pct) / 100
      const offset = circumference - length
      const rotation = (cumulative / 100) * 360
      cumulative += seg.pct
      return { ...seg, dashoffset: offset, rotation }
    })
  }, [envDistribution, circumference])

  return (
    <>
      <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
        <div className="p-10 space-y-10">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Events */}
            <div className="p-6 rounded-xl relative overflow-hidden group" style={{ background: T.surfaceLow }}>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-colors" style={{ background: a('primary', 0.03) }} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Total Events</span>
                <BarChart3 className="w-4 h-4" style={{ color: T.primary }} />
              </div>
              <div className="text-4xl font-black text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {stats.total.toLocaleString()}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: T.tertiary }}>
                <TrendingUp className="w-3 h-3" />
                <span>{stats.inProgress} in progress</span>
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-6 rounded-xl relative overflow-hidden group" style={{ background: T.surfaceLow }}>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-colors" style={{ background: a('tertiary', 0.03) }} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Success Rate (%)</span>
                <CheckCircle className="w-4 h-4" style={{ color: T.tertiary }} />
              </div>
              <div className="text-4xl font-black text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {stats.successRate}{stats.successRate !== '—' ? '%' : ''}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: T.onSurfaceVar }}>
                <CheckCircle className="w-3 h-3" />
                <span>{stats.success}/{stats.completed} completed</span>
              </div>
            </div>

            {/* Critical Failures */}
            <div className="p-6 rounded-xl relative overflow-hidden group" style={{ background: T.surfaceLow }}>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-colors" style={{ background: a('error', 0.03) }} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Critical Failures</span>
                <AlertTriangle className="w-4 h-4" style={{ color: T.error }} />
              </div>
              <div className="text-4xl font-black text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {String(stats.failure).padStart(2, '0')}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: T.error }}>
                <Clock className="w-3 h-3" />
                <span>{stats.failure > 0 ? `${stats.critical} critical` : 'No active failures'}</span>
              </div>
            </div>

            {/* Overlaps */}
            <div className="p-6 rounded-xl relative overflow-hidden group" style={{ background: T.surfaceLow, borderLeft: `2px solid ${overlapsCount > 0 ? '#fb923c' : T.success}` }}>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-colors" style={{ background: overlapsCount > 0 ? 'rgba(251,146,60,0.03)' : a('success', 0.03) }} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>Overlaps</span>
                <AlertTriangle className="w-4 h-4" style={{ color: overlapsCount > 0 ? '#fb923c' : T.success }} />
              </div>
              <div className="text-4xl font-black text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif", color: overlapsCount > 0 ? '#fb923c' : undefined }}>
                {String(overlapsCount).padStart(2, '0')}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: T.onSurfaceVar }}>
                {overlapsCount > 0
                  ? <Link to="/events/overlaps" className="font-semibold" style={{ color: '#fb923c' }}>View overlaps →</Link>
                  : <span>No time conflicts detected</span>
                }
              </div>
            </div>
          </div>

          {/* ── Main HUD: Chart + Health Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Velocity Chart */}
            <div className="lg:col-span-2 p-6 pb-3 rounded-2xl relative flex flex-col" style={{ background: T.surface }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Event Velocity</h3>
                  <p className="text-sm" style={{ color: T.onSurfaceVar }}>Events per hour — 24h window</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.success }} />
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: T.success }}>Live</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex items-end gap-1.5 px-1 relative" style={{ borderBottom: `1px solid ${a('outlineVar', 0.12)}`, borderLeft: `1px solid ${a('outlineVar', 0.12)}` }}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  {[0, 1, 2, 3].map(i => <div key={i} className="w-full h-px bg-hud-on-surface" />)}
                </div>
                {/* Bars */}
                {chartBars.map((bar, i) => {
                  const intensity = bar.count > 0 ? Math.min(1, bar.count / Math.max(...chartBars.map(b => b.count), 1)) : 0
                  const barVar = intensity > 0.7 ? 'primary' as const : intensity > 0.3 ? 'tertiary' as const : 'primary' as const
                  const barColor = intensity > 0.7 ? T.primary : intensity > 0.3 ? T.tertiary : a('primary', 0.56)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
                      {/* Tooltip */}
                      <div
                        className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-[10px] font-mono font-bold whitespace-nowrap z-10"
                        style={{ background: T.surfaceHighest, color: T.onSurface, border: `1px solid ${a('outlineVar', 0.5)}` }}
                      >
                        {bar.count} event{bar.count !== 1 ? 's' : ''}
                      </div>
                      <div
                        className="w-full rounded-t-sm hover:brightness-125 transition-all cursor-pointer"
                        style={{
                          height: `${bar.pct}%`,
                          background: bar.count === 0
                            ? a('outlineVar', 0.19)
                            : `linear-gradient(to top, ${a(barVar, 0.12)}, ${barColor})`,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* Hour labels */}
              <div className="flex gap-1.5 px-1 mt-1">
                {chartBars.map((bar, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] font-mono" style={{ color: T.outline }}>
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Health Distribution */}
            <div className="p-8 rounded-2xl flex flex-col justify-between" style={{ background: T.surface }}>
              <div>
                <h3 className="text-xl font-bold text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Environment Breakdown</h3>
                <p className="text-sm" style={{ color: T.onSurfaceVar }}>Event distribution by environment today</p>
              </div>

              <div className="relative w-48 h-48 mx-auto my-6">
                <svg className="w-full h-full" viewBox="0 0 192 192">
                  <circle cx="96" cy="96" r="80" fill="transparent" stroke={T.surfaceHighest} strokeWidth="20" />
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="96" cy="96" r="80" fill="transparent"
                      stroke={seg.color} strokeWidth="20"
                      strokeDasharray={circumference}
                      strokeDashoffset={seg.dashoffset}
                      transform={`rotate(${seg.rotation - 90} 96 96)`}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-hud-on-surface">{envDistribution.total}</span>
                  <span className="text-[10px] uppercase" style={{ color: T.outline }}>Events</span>
                </div>
              </div>

              <div className="space-y-3">
                {envDistribution.segments.map(({ label, color, pct, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-xs" style={{ color: T.onSurface }}>{label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold">{pct}% <span style={{ color: T.outline }}>({count})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Live Activity Stream ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>
            <div className="px-8 py-6" style={{ borderBottom: `1px solid ${a('outlineVar', 0.06)}` }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-hud-on-surface" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Live Activity Stream</h3>
                  <p className="text-sm" style={{ color: T.onSurfaceVar }}>Global execution log</p>
                </div>
                {hasStreamFilters && (
                  <button
                    onClick={() => setStreamFilters({})}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{ color: T.onSurfaceVar, background: a('outlineVar', 0.1) }}
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              {/* Quick filters — single scrollable row */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Type</span>
                {['deployment', 'operation', 'drift', 'incident'].map(t => (
                  <button key={t} onClick={() => toggleFilter('type', t)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                    style={{
                      background: streamFilters.type === t ? a('primary', 0.15) : 'transparent',
                      color: streamFilters.type === t ? T.primary : T.onSurfaceVar,
                      border: `1px solid ${streamFilters.type === t ? a('primary', 0.4) : a('outline', 0.2)}`,
                    }}
                  >{getEventTypeLabel(t)}</button>
                ))}
                <span className="w-px h-4 shrink-0" style={{ background: a('outline', 0.3) }} />
                <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Status</span>
                {[
                  { k: 'success', l: 'Success', c: '#34d399' },
                  { k: 'failure', l: 'Failed', c: '#ff6e84' },
                  { k: 'running', l: 'In Progress', c: '#40ceed' },
                  { k: 'warning', l: 'Warning', c: '#fbbf24' },
                  { k: 'open', l: 'Open', c: '#a78bfa' },
                  { k: 'planned', l: 'Planned', c: '#60a5fa' },
                ].map(({ k, l, c }) => (
                  <button key={k} onClick={() => toggleFilter('status', k)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                    style={{
                      background: streamFilters.status === k ? `${c}20` : 'transparent',
                      color: streamFilters.status === k ? c : T.onSurfaceVar,
                      border: `1px solid ${streamFilters.status === k ? `${c}50` : a('outline', 0.2)}`,
                    }}
                  >{l}</button>
                ))}
                <span className="w-px h-4 shrink-0" style={{ background: a('outline', 0.3) }} />
                <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: T.onSurfaceVar }}>Env</span>
                {[
                  { k: 'production', l: 'Prod', c: '#f87171' },
                  { k: 'preproduction', l: 'Preprod', c: '#fb923c' },
                  { k: 'development', l: 'Dev', c: '#4ade80' },
                ].map(({ k, l, c }) => (
                  <button key={k} onClick={() => toggleFilter('env', k)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0"
                    style={{
                      background: streamFilters.env === k ? `${c}20` : 'transparent',
                      color: streamFilters.env === k ? c : T.onSurfaceVar,
                      border: `1px solid ${streamFilters.env === k ? `${c}50` : a('outline', 0.2)}`,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: a('surfaceHigh', 0.31) }}>
                    {['Event ID', 'Title', 'Type', 'Service', 'Environment', 'Priority', 'Status', 'Timestamp', ''].map((h, i) => (
                      <th
                        key={h || i}
                        className={`px-6 py-4 text-[10px] uppercase tracking-widest font-bold ${i === 8 ? 'text-right' : ''}`}
                        style={{ color: T.onSurfaceVar }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-8 py-12 text-center text-sm" style={{ color: T.outline }}>
                        {hasStreamFilters ? 'No events match the current filters.' : 'No events today.'}
                      </td>
                    </tr>
                  )}
                  {filteredEvents.slice(0, 8).map((event) => (
                    <tr
                      key={event.metadata?.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${a('outlineVar', 0.03)}` }}
                      onClick={() => setSelectedEvent(event)}
                      onMouseEnter={e => (e.currentTarget.style.background = a('primary', 0.03))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-5 font-mono text-sm" style={{ color: T.primary }}>
                        #{event.metadata?.id?.slice(-8).toUpperCase() || '—'}
                      </td>
                      <td className="px-6 py-5 text-sm max-w-[200px] truncate" style={{ color: T.onSurface }}>
                        {event.title}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <EventTypeIcon type={event.attributes.type} color={getEventTypeIconColor(event.attributes.type)} />
                          <span className="text-sm font-medium">{getEventTypeLabel(event.attributes.type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm" style={{ color: T.onSurfaceVar }}>
                        {event.attributes.service || '—'}
                      </td>
                      <td className="px-6 py-5">
                        {event.attributes.environment ? (() => {
                          const ec = getEnvBadgeColor(event.attributes.environment)
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full"
                              style={{ background: ec.bg, color: ec.color, border: `1px solid ${ec.border}` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ec.color }} />
                              {getEnvironmentLabel(event.attributes.environment)}
                            </span>
                          )
                        })() : <span className="text-sm" style={{ color: T.outline }}>—</span>}
                      </td>
                      <td className="px-6 py-5">
                        {(() => {
                          const p = event.attributes.priority
                          const isP1 = p === Priority.P1
                          const isP2 = p === Priority.P2
                          const isP3 = p === Priority.P3
                          const c = isP1 ? '#ef4444' : isP2 ? '#fb923c' : isP3 ? '#fbbf24' : '#6b7280'
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold font-mono uppercase rounded-full"
                              style={{
                                background: `${c}15`,
                                color: c,
                                border: `1px solid ${c}30`,
                              }}
                            >
                              {isP1 && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }} />}
                              {getPriorityLabel(p)}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={event.attributes.status} />
                      </td>
                      <td className="px-6 py-5 text-sm font-mono" style={{ color: T.outline }}>
                        {event.metadata?.createdAt
                          ? new Date(event.metadata.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <MoreVertical className="w-4 h-4 inline-block" style={{ color: T.outline }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {events.length > 0 && (
              <div className="p-6 flex items-center justify-center" style={{ background: T.surfaceLow }}>
                <Link
                  to="/events/timeline"
                  className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
                  style={{ color: T.outline, fontFamily: "'Space Grotesk',sans-serif" }}
                >
                  View Historical Data Archive
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  )
}
