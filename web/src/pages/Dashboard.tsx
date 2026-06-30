import { useMemo, useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, Bot, Calendar, Clock, Flame, GitBranch, LayoutDashboard, Radio, Rocket, Settings, Wrench } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMeteor } from '@fortawesome/free-solid-svg-icons'
import { eventsApi } from '../lib/api'
import { Priority } from '../types/api'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getPriorityLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

type DashStatus = 'ONGOING' | 'SCHEDULED' | 'COMPLETED' | 'CONFLICT'
type DashImpact = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type TimelineBucket = 'production' | 'preproduction' | 'other'

interface DerivedRow {
  event: Event
  status: DashStatus
  impact: DashImpact
  start: Date
  end: Date
  service: string
}

interface ServiceSummary {
  name: string
  count: number
  impact: DashImpact
}

const V = {
  bg: '--hud-bg',
  surface: '--hud-surface',
  surfaceLow: '--hud-surface-low',
  surfaceHigh: '--hud-surface-high',
  surfaceHighest: '--hud-surface-highest',
  onSurface: '--hud-on-surface',
  onSurfaceVar: '--hud-on-surface-var',
  outline: '--hud-outline',
  outlineVar: '--hud-outline-var',
  primary: '--hud-primary',
  success: '--hud-success',
  error: '--hud-error',
}

const T = Object.fromEntries(
  Object.entries(V).map(([k, v]) => [k, `rgb(var(${v}))`]),
) as Record<keyof typeof V, string>
const a = (key: keyof typeof V, opacity: number) => `rgb(var(${V[key]}) / ${opacity})`

const C = {
  primary: '#1B3575',
  accent: '#E8580A',
  accentDark: '#C0330A',
  amber: '#F59E0B',
  slate: '#6E7891',
}

const PANEL = {
  background: T.surface,
  border: `1px solid ${a('outlineVar', 0.24)}`,
}

const TL_START = 0
const TL_END = 24
const TL_SPAN = TL_END - TL_START
const tlPct = (hour: number) => Math.min(100, Math.max(0, ((hour - TL_START) / TL_SPAN) * 100))

function normalizeStatus(raw?: string): DashStatus {
  const s = String(raw || '').toLowerCase()
  if (['start', 'in_progress', '1', '12', 'open'].includes(s)) return 'ONGOING'
  if (['planned', 'waiting_approval', '13', '14'].includes(s)) return 'SCHEDULED'
  if (['failure', 'error', 'warning', '2', '4', '5'].includes(s)) return 'CONFLICT'
  if (['success', 'done', 'close', '3', '10', '11'].includes(s)) return 'COMPLETED'
  return 'SCHEDULED'
}

function impactFromEvent(event: Event): DashImpact {
  const p = event.attributes.priority
  if (p === Priority.P1) return 'CRITICAL'
  if (p === Priority.P2 || event.attributes.impact) return 'HIGH'
  if (p === Priority.P3) return 'MEDIUM'
  return 'LOW'
}

function impactScore(impact: DashImpact) {
  return impact === 'CRITICAL' ? 4 : impact === 'HIGH' ? 3 : impact === 'MEDIUM' ? 2 : 1
}

function toDate(value?: string) {
  return value ? new Date(value) : null
}

function eventWindow(event: Event) {
  const start = toDate(event.attributes.startDate) || toDate(event.metadata?.createdAt) || new Date()
  const end = toDate(event.attributes.endDate) || start
  return { start, end: end < start ? start : end }
}

function timeLabel(date?: Date) {
  return date
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—'
}

function hourFloat(date: Date) {
  return date.getHours() + date.getMinutes() / 60
}

function OperationalTypeIcon({ type, color }: { type: string; color: string }) {
  const t = String(type).toLowerCase()
  const className = 'w-3 h-3 shrink-0'
  if (t === 'deployment' || t === '1') return <Rocket className={className} style={{ color }} />
  if (t === 'operation' || t === '2') return <Wrench className={className} style={{ color }} />
  if (t === 'drift' || t === '3') return <Settings className={className} style={{ color }} />
  if (t === 'rpa_usage' || t === '5') return <Bot className={className} style={{ color }} />
  return <AlertTriangle className={className} style={{ color }} />
}

function getTypePalette(type?: string) {
  const t = String(type || '').toLowerCase()

  if (t === 'deployment' || t === 'release' || t === '1') {
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', solid: '#1B3575' } // Blue
  }
  if (t === 'operation' || t === 'maintenance' || t === '2') {
    return { bg: '#F3EEFF', text: '#5B3AAE', border: '#D9CCFF', solid: '#6C4AB6' } // Violet
  }
  if (t === 'incident' || t === 'hotfix' || t === '4') {
    return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9', solid: '#C0330A' } // Red
  }
  if (t === 'drift' || t === 'infra' || t === 'platform' || t === '3') {
    return { bg: '#EAFBFA', text: '#0F766E', border: '#BDECE8', solid: '#0F9E95' } // Teal/Cyan
  }
  if (t === 'rpa_usage' || t === 'manual' || t === 'intervention' || t === 'change' || t === '5') {
    return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0', solid: '#E8580A' } // Orange
  }
  if (t === 'audit' || t === 'validation' || t === 'verification' || t === 'recommendation' || t === 'snapshot' || t === 'user_update') {
    return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', solid: '#16A34A' } // Green
  }

  return { bg: '#EEF1F8', text: '#4B5563', border: '#D5DBE8', solid: '#64748B' }
}

function TimelineStyleTypeBadge({ type }: { type?: string }) {
  const palette = getTypePalette(type)
  return (
    <span className="inline-flex items-center gap-1.5 text-left">
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center border"
        style={{ background: palette.bg, color: palette.text, borderColor: palette.border }}
      >
        {getEventTypeIcon(type || '', 'w-3.5 h-3.5')}
      </span>
      <span className="text-[10px] font-semibold uppercase max-w-[70px] truncate" style={{ color: '#6E7891' }}>
        {getEventTypeLabel(type || '')}
      </span>
    </span>
  )
}

function TimelineStyleStatusBadge({ status }: { status: DashStatus }) {
  const style =
    status === 'COMPLETED'
      ? { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', label: 'Success', icon: 'fa-circle-check' }
      : status === 'CONFLICT'
        ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Conflict', icon: 'fa-triangle-exclamation' }
        : status === 'ONGOING'
          ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Live', icon: 'fa-satellite-dish' }
          : { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', label: 'Scheduled', icon: 'fa-clock' }

  return (
    <span className="inline-flex items-center gap-1.5 text-left">
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center border"
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
      >
        <i className={`fa-solid ${style.icon} text-[11px]${style.icon === 'fa-satellite-dish' ? ' fa-fade' : ''}`} />
      </span>
      <span className="text-[10px] font-semibold uppercase" style={{ color: style.text }}>
        {style.label}
      </span>
    </span>
  )
}

function TimelineStylePriorityBadge({ priority }: { priority?: string }) {
  const p = String(priority || '').toLowerCase()
  const label = getPriorityLabel(priority || '')
  const style =
    p === 'p1' || p === '1'
      ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
      : p === 'p2' || p === '2'
        ? { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0' }
        : p === 'p3' || p === '3'
          ? { bg: '#FDFCE8', text: '#6B6000', border: '#F0EA90' }
          : { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }

  return (
    <span className="inline-flex items-center gap-1.5 text-left">
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center border"
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
      >
        <span className="text-[9px] font-bold leading-none">{label.toUpperCase()}</span>
      </span>
    </span>
  )
}

function TimelineStyleEnvBadge({ env }: { env?: string }) {
  const raw = String(env || '').toLowerCase()
  const label =
    raw === 'production' || raw === '7'
      ? 'Production'
      : raw === 'preproduction' || raw === '6'
        ? 'Pre-production'
        : raw === 'integration' || raw === '2'
          ? 'Integration'
          : raw === 'development' || raw === '1'
            ? 'Development'
            : raw === 'uat' || raw === '4'
              ? 'UAT'
              : raw === 'recette' || raw === '5'
                ? 'Testing'
                : raw === 'tnr' || raw === '3'
                  ? 'TNR'
                  : raw === 'mco' || raw === '8'
                    ? 'MCO'
                    : 'N/A'
  const style =
    raw === 'production' || raw === '7'
      ? { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
      : raw === 'preproduction' || raw === '6'
        ? { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
        : raw === 'development' || raw === '1' || raw === 'integration' || raw === '2'
          ? { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
          : raw
            ? { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
            : { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }

  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      {label.toUpperCase()}
    </span>
  )
}

function EnvBadge({ env }: { env?: string }) {
  const raw = String(env || '').toLowerCase()
  const label =
    raw === 'production' || raw === '7'
      ? 'Production'
      : raw === 'preproduction' || raw === '6'
        ? 'Pre-production'
        : raw === 'integration' || raw === '2'
          ? 'Integration'
          : raw === 'development' || raw === '1'
            ? 'Development'
            : raw === 'uat' || raw === '4'
              ? 'UAT'
              : raw === 'recette' || raw === '5'
                ? 'Testing'
                : raw === 'tnr' || raw === '3'
                  ? 'TNR'
                  : raw === 'mco' || raw === '8'
                    ? 'MCO'
                    : 'N/A'
  const color =
    raw === 'production' || raw === '7'
      ? C.accent
      : raw === 'preproduction' || raw === '6'
        ? C.amber
        : raw
          ? C.primary
          : C.slate
  return (
    <span
      className="inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-[10px] font-medium rounded-[3px] border"
      style={{ color, borderColor: `${color}4d`, background: `${color}12` }}
    >
      {label}
    </span>
  )
}

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [countdown, setCountdown] = useState(30)

  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsApi.today({ perPage: 100 }),
    refetchInterval: 30000,
  })

  const { data: allEventsData } = useQuery({
    queryKey: ['events', 'dashboard-all'],
    queryFn: () => eventsApi.list({ perPage: 1000, page: 1 }),
    refetchInterval: 30000,
  })

  // Update lastUpdated timestamp whenever data changes
  useEffect(() => {
    setLastUpdated(new Date())
    setCountdown(30)
  }, [todayEvents, allEventsData])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const events: Event[] = useMemo(() => (todayEvents?.events || []) as Event[], [todayEvents])
  const allEvents: Event[] = useMemo(() => (allEventsData?.events || []) as Event[], [allEventsData])

  const derived = useMemo(() => {
    const toDerivedRow = (event: Event): DerivedRow => {
      const status = normalizeStatus(event.attributes.status)
      const impact = impactFromEvent(event)
      const { start, end } = eventWindow(event)
      const service = event.attributes.service || 'unknown-service'
      return { event, status, impact, start, end, service }
    }
    const rows: DerivedRow[] = events.map(toDerivedRow)

    const sortedByTimeDesc = [...rows].sort((aRow: DerivedRow, bRow: DerivedRow) => bRow.start.getTime() - aRow.start.getTime())

    const serviceCount = rows.reduce<Record<string, ServiceSummary>>((acc: Record<string, ServiceSummary>, row: DerivedRow) => {
      if (!acc[row.service]) acc[row.service] = { name: row.service, count: 0, impact: row.impact }
      acc[row.service].count += 1
      if (impactScore(row.impact) > impactScore(acc[row.service].impact)) {
        acc[row.service].impact = row.impact
      }
      return acc
    }, {})

    const now = new Date()
    const nextRows: DerivedRow[] = (allEvents.length > 0 ? allEvents : events)
      .map((event: Event) => toDerivedRow(event))
      .filter((row: DerivedRow) => row.start >= now)
      .sort((aRow: DerivedRow, bRow: DerivedRow) => {
        const byTime = aRow.start.getTime() - bRow.start.getTime()
        if (byTime !== 0) return byTime
        return impactScore(bRow.impact) - impactScore(aRow.impact)
      })
    const nextCritical = nextRows.find((row) => row.impact !== 'LOW') ?? nextRows[0]

    let overlapCount = 0
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const left = rows[i]
        const right = rows[j]
        if (left.service !== right.service) continue
        if (String(left.event.attributes.environment || '') !== String(right.event.attributes.environment || '')) continue
        if (left.start <= right.end && right.start <= left.end) overlapCount += 1
      }
    }

    const byEnv = (name: TimelineBucket) =>
      rows.filter((row: DerivedRow) => {
        const env = String(row.event.attributes.environment || '').toLowerCase()
        if (name === 'production') return env === 'production' || env === '7'
        if (name === 'preproduction') return env === 'preproduction' || env === '6'
        return env !== 'production' && env !== '7' && env !== 'preproduction' && env !== '6'
      })

    return {
      rows,
      priorityRows: sortedByTimeDesc.slice(0, 8),
      ongoing: rows.filter((row) => row.status === 'ONGOING').length,
      highImpact: rows.filter((row) => row.impact === 'CRITICAL' || row.impact === 'HIGH').length,
      overlapCount,
      nextCritical,
      services: (Object.values(serviceCount) as ServiceSummary[]).sort((aRow: ServiceSummary, bRow: ServiceSummary) => bRow.count - aRow.count).slice(0, 5),
      timeline: [
        { label: 'Production', env: 'production', events: byEnv('production').slice(0, 8) },
        { label: 'Pre-production', env: 'preproduction', events: byEnv('preproduction').slice(0, 8) },
      ],
    }
  }, [events, allEvents])

  const nowHour = new Date().getHours() + new Date().getMinutes() / 60

  return (
    <>
      <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
        <main className="px-6 py-5 pb-16 flex flex-col gap-4 min-h-full">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] tabular-nums" style={{ color: T.onSurfaceVar }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums" style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar, border: `1px solid ${a('outlineVar', 0.15)}` }}>
              <span className="w-1.5 h-1.5 rounded-full fa-fade" style={{ background: countdown <= 5 ? C.accent : '#22c55e', display: 'inline-block' }} />
              {countdown}s
            </span>
          </div>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl p-5 border" style={{ ...PANEL, borderColor: a('outlineVar', 0.2) }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Ongoing interventions</span>
                <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${C.primary}14` }}>
                  <Radio className="w-3.5 h-3.5" style={{ color: C.primary }} />
                </span>
              </div>
              <p className="text-[32px] leading-none font-semibold tabular-nums tracking-tight">{derived.ongoing}</p>
              <p className="text-[11px] mt-1.5" style={{ color: T.onSurfaceVar }}>{derived.rows.length - derived.ongoing} scheduled today</p>
            </article>

            <article className="rounded-xl p-5 border" style={{ ...PANEL, borderColor: `${C.accent}66`, background: `${C.accent}08` }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>High impact</span>
                <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${C.accent}14` }}>
                  <Flame className="w-3.5 h-3.5" style={{ color: C.accent }} />
                </span>
              </div>
              <p className="text-[32px] leading-none font-semibold tabular-nums tracking-tight" style={{ color: C.accentDark }}>{derived.highImpact}</p>
              <p className="text-[11px] mt-1.5" style={{ color: T.onSurfaceVar }}>Critical and high-priority events</p>
            </article>

            <article className="rounded-xl p-5 border" style={{ ...PANEL, borderColor: `${C.accent}66`, background: `${C.accent}08` }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Potential conflicts</span>
                <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${C.accent}14` }}>
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: C.accentDark }} />
                </span>
              </div>
              <p className="text-[32px] leading-none font-semibold tabular-nums tracking-tight" style={{ color: C.accentDark }}>{derived.overlapCount}</p>
              <p className="text-[11px] mt-1.5" style={{ color: T.onSurfaceVar }}>Service/environment overlaps</p>
            </article>

            <article className="rounded-xl p-5 border" style={PANEL}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Next critical window</span>
                <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: a('outlineVar', 0.12) }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: C.slate }} />
                </span>
              </div>
              <p className="text-[32px] leading-none font-semibold tabular-nums tracking-tight">
                {timeLabel(derived.nextCritical?.start)}
              </p>
              <p className="text-[11px] mt-1.5 truncate" style={{ color: T.onSurfaceVar }}>
                {derived.nextCritical ? `${derived.nextCritical.service} · ${derived.nextCritical.event.title}` : 'No upcoming event'}
              </p>
            </article>
          </section>

          <section className="grid gap-4 min-h-0 shrink-0">
            <article className="rounded-xl overflow-hidden flex flex-col min-h-[300px]" style={PANEL}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${a('outlineVar', 0.1)}` }}>
                <div>
                  <h2 className="text-[13px] font-semibold">Operational window</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: T.onSurfaceVar }}>00:00–24:00 · by environment</p>
                </div>
                <div className="px-2.5 py-1 text-[10px] font-medium rounded-md" style={{ color: C.accentDark, background: `${C.accent}14`, border: `1px solid ${C.accent}4d` }}>
                  {derived.overlapCount} conflicts
                </div>
              </div>
              <div className="flex-1 px-5 py-5 flex flex-col gap-5 overflow-y-auto">
                <div className="pl-[120px]">
                  <div className="flex justify-between mb-1.5">
                    {[0, 4, 8, 12, 16, 20, 24].map((h) => (
                      <span key={h} className="text-[10px] tabular-nums" style={{ color: T.onSurfaceVar }}>{h}:00</span>
                    ))}
                  </div>
                  <div className="h-px" style={{ background: a('outlineVar', 0.2) }} />
                </div>

                {derived.timeline.map((group) => (
                  <div key={group.label} className="flex items-center gap-3">
                    <div className="w-[120px] shrink-0 text-right pr-3">
                      <EnvBadge env={group.env} />
                    </div>
                    {(() => {
                      const sortedEvents = [...group.events].sort((left, right) => left.start.getTime() - right.start.getTime())
                      const laneEndTimes: Date[] = []
                      const placed = sortedEvents.map((row) => {
                        let laneIndex = laneEndTimes.findIndex((laneEnd) => row.start >= laneEnd)
                        if (laneIndex === -1) {
                          laneIndex = laneEndTimes.length
                          laneEndTimes.push(row.end)
                        } else {
                          laneEndTimes[laneIndex] = row.end
                        }
                        return { row, laneIndex }
                      })
                      const laneCount = Math.max(1, laneEndTimes.length)
                      const rowHeight = laneCount * 24 + 8

                      return (
                        <div className="flex-1 relative" style={{ height: `${rowHeight}px` }}>
                          <div className="absolute inset-0 rounded-md" style={{ background: a('surfaceHigh', 0.22), border: `1px solid ${a('outlineVar', 0.14)}` }} />
                      {[4, 8, 12, 16, 20].map((h) => (
                            <div key={h} className="absolute top-0 bottom-0 w-px" style={{ left: `${tlPct(h)}%`, background: a('outlineVar', 0.12) }} />
                      ))}
                          {placed.map(({ row, laneIndex }) => {
                        const left = tlPct(hourFloat(row.start))
                        const right = tlPct(hourFloat(row.end))
                        const width = Math.max(right - left, 2)
                        const typePalette = getTypePalette(row.event.attributes.type)
                        return (
                          <button
                            key={`${row.event.metadata?.id}-${laneIndex}`}
                            title={row.event.title}
                            onClick={() => setSelectedEvent(row.event)}
                            className="absolute rounded px-1.5 text-[9px] font-semibold hover:brightness-95 transition-all flex items-center gap-1 overflow-hidden"
                            style={{
                              top: `${4 + laneIndex * 24}px`,
                              height: '20px',
                              left: `${left}%`,
                              width: `${width}%`,
                              background: typePalette.bg,
                              color: typePalette.text,
                              border: `1px solid ${typePalette.border}`,
                            }}
                          >
                            <OperationalTypeIcon type={row.event.attributes.type} color={typePalette.text} />
                            <span className="truncate">{row.event.title}</span>
                          </button>
                        )
                          })}
                          <div className="absolute top-0 bottom-[-6px] w-px z-40 pointer-events-none" style={{ left: `${tlPct(nowHour)}%`, background: C.accent }}>
                            <div className="absolute top-[-17px] left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap" style={{ color: C.accent }}>now</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 min-h-0 flex-1">
            <article className="rounded-xl overflow-hidden flex flex-col h-full min-h-[320px]" style={PANEL}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${a('outlineVar', 0.1)}` }}>
                <div>
                  <h2 className="text-[13px] font-semibold">Event</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: T.onSurfaceVar }}>Sorted by intervention window</p>
                </div>
                <Link to="/events/timeline" className="text-[12px] font-medium inline-flex items-center gap-1" style={{ color: C.primary }}>
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto">
                {derived.priorityRows.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: T.onSurfaceVar }}>
                    No events today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: a('surfaceHigh', 0.22), borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
                          {['Event ID', 'Priority', 'Status', 'Title', 'Type', 'Service', 'Environment', 'Impact', 'Window'].map((header) => (
                            <th
                              key={header}
                              className={`px-5 py-3 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${header === 'Window' ? 'text-center' : ''}`}
                              style={{ color: T.onSurfaceVar }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {derived.priorityRows.map((row) => (
                          <tr
                            key={row.event.metadata?.id}
                            onClick={() => setSelectedEvent(row.event)}
                            className="cursor-pointer transition-colors hover:bg-hud-surface-high"
                            style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}
                          >
                            <td className="px-5 py-3 text-[11px] font-mono tabular-nums whitespace-nowrap" style={{ color: T.onSurfaceVar }}>
                              #{row.event.metadata?.id?.slice(-6).toUpperCase()}
                            </td>
                            <td className="px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: T.onSurfaceVar }}>
                              <TimelineStylePriorityBadge priority={row.event.attributes.priority} />
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <TimelineStyleStatusBadge status={row.status} />
                            </td>
                            <td className="px-5 py-3 text-[13px] font-medium max-w-[280px] truncate">
                              {row.event.title}
                            </td>
                            <td className="px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: T.onSurfaceVar }}>
                              <TimelineStyleTypeBadge type={row.event.attributes.type} />
                            </td>
                            <td className="px-5 py-3 text-[12px] whitespace-nowrap" style={{ color: T.onSurfaceVar }}>
                              {row.service}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <TimelineStyleEnvBadge env={row.event.attributes.environment} />
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md border"
                                style={{ borderColor: a('outlineVar', 0.28), background: a('surfaceHigh', 0.35) }}
                                title={row.event.attributes.impact ? 'Impact' : 'No impact'}
                              >
                                <FontAwesomeIcon
                                  icon={faMeteor}
                                  className={`text-[12px]${row.event.attributes.impact ? ' fa-beat-fade' : ''}`}
                                  style={row.event.attributes.impact
                                    ? ({ color: C.accent, '--fa-animation-duration': '2s' } as CSSProperties)
                                    : { color: T.onSurfaceVar }}
                                />
                              </span>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap text-center">
                              <div className="text-[12px] font-semibold tabular-nums">{timeLabel(row.start)}</div>
                              <div className="text-[10px] tabular-nums" style={{ color: T.onSurfaceVar }}>→ {timeLabel(row.end)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-3 auto-rows-fr">
            {[
              { to: '/events/calendar', label: 'Calendar', desc: 'Time-based intervention view', icon: Calendar, badge: `${events.length} events today` },
              { to: '/events/streamline', label: 'Streamline', desc: 'Change history', icon: GitBranch, badge: 'Change history' },
              { to: '/catalog', label: 'Service Catalog', desc: 'Services, owners and SLA', icon: LayoutDashboard, badge: `${derived.services.length} active services` },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-hud-surface-high h-full"
                style={PANEL}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${C.primary}14` }}>
                  <item.icon className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">{item.label}</div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: T.onSurfaceVar }}>{item.desc}</div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{ color: T.onSurfaceVar, background: a('outlineVar', 0.12) }}>{item.badge}</span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: T.onSurfaceVar }} />
                </div>
              </Link>
            ))}
          </section>
        </main>
      </div>

      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  )
}
