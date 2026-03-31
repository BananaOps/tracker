import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mail, User, Users, ExternalLink, Layers, Globe, CheckCircle } from 'lucide-react'
import type { Event, Catalog } from '../types/api'
import { getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
const T = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, `rgb(var(${v}))`])) as Record<keyof typeof V, string>
const a = (key: keyof typeof V, opacity: number) => `rgb(var(${V[key]}) / ${opacity})`

// ─── Types ────────────────────────────────────────────────────────────────────
type OverlapMode = 'strict' | 'env-only'

type OverlapPair = {
  event1: Event
  event2: Event
  overlapStart: Date
  overlapEnd: Date
  catalog1?: Catalog
  catalog2?: Catalog
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase()
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
    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full" style={{ background: bg, color, border: `1px solid ${border}` }}>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EventsOverlaps() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDays, setSelectedDays] = useState<number>(7)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)
  const [overlapMode, setOverlapMode] = useState<OverlapMode>('strict')

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'list'],
    queryFn: () => eventsApi.list({ perPage: 500 }),
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const allEvents = data?.events || []
  const catalogs = catalogData?.catalogs || []

  const catalogMap = useMemo(() => {
    const map = new Map<string, Catalog>()
    catalogs.forEach(catalog => map.set(catalog.name, catalog))
    return map
  }, [catalogs])

  const startDate = useMemo(() => {
    if (isCustomPeriod && customStartDate) {
      try { return startOfDay(new Date(customStartDate)) } catch { return startOfDay(currentDate) }
    }
    return startOfDay(currentDate)
  }, [isCustomPeriod, customStartDate, currentDate])

  const endDate = useMemo(() => {
    if (isCustomPeriod && customEndDate) {
      try { return endOfDay(new Date(customEndDate)) } catch { return endOfDay(addDays(currentDate, selectedDays - 1)) }
    }
    return endOfDay(addDays(currentDate, selectedDays - 1))
  }, [isCustomPeriod, customEndDate, currentDate, selectedDays])

  const periodEvents = useMemo(() => {
    return allEvents.filter(event => {
      const eventStartStr = event.attributes.startDate || event.metadata?.createdAt
      if (!eventStartStr) return false
      const eventStart = new Date(eventStartStr)
      const eventEnd = event.attributes.endDate ? new Date(event.attributes.endDate) : eventStart
      return eventStart <= endDate && eventEnd >= startDate
    })
  }, [allEvents, startDate, endDate])

  const overlaps = useMemo(() => {
    const overlappingPairs: OverlapPair[] = []

    for (let i = 0; i < periodEvents.length; i++) {
      for (let j = i + 1; j < periodEvents.length; j++) {
        const event1 = periodEvents[i]
        const event2 = periodEvents[j]

        const env1 = event1.attributes.environment
        const env2 = event2.attributes.environment
        if (!env1 || !env2 || env1.toLowerCase() !== env2.toLowerCase()) continue

        // Mode strict: même environnement + même service
        if (overlapMode === 'strict') {
          const svc1 = event1.attributes.service
          const svc2 = event2.attributes.service
          if (!svc1 || !svc2 || svc1 !== svc2) continue
        }

        const start1Str = event1.attributes.startDate || event1.metadata?.createdAt
        const start2Str = event2.attributes.startDate || event2.metadata?.createdAt
        if (!start1Str || !start2Str) continue

        const start1 = new Date(start1Str)
        const end1 = event1.attributes.endDate ? new Date(event1.attributes.endDate) : start1
        const start2 = new Date(start2Str)
        const end2 = event2.attributes.endDate ? new Date(event2.attributes.endDate) : start2

        if (start1 <= end2 && start2 <= end1) {
          overlappingPairs.push({
            event1,
            event2,
            overlapStart: start1 > start2 ? start1 : start2,
            overlapEnd: end1 < end2 ? end1 : end2,
            catalog1: catalogMap.get(event1.attributes.service),
            catalog2: catalogMap.get(event2.attributes.service),
          })
        }
      }
    }

    return overlappingPairs.sort((a, b) => a.overlapStart.getTime() - b.overlapStart.getTime())
  }, [periodEvents, catalogMap, overlapMode])

  const overlapsByDay = useMemo(() => {
    const grouped = new Map<string, OverlapPair[]>()
    overlaps.forEach(overlap => {
      const dayKey = format(overlap.overlapStart, 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) grouped.set(dayKey, [])
      grouped.get(dayKey)!.push(overlap)
    })
    return grouped
  }, [overlaps])

  const servicesInvolved = useMemo(() =>
    new Set(overlaps.flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])).size,
    [overlaps]
  )

  const mostAffectedServices = useMemo(() =>
    Array.from(
      overlaps
        .flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])
        .reduce((acc, service) => { acc.set(service, (acc.get(service) || 0) + 1); return acc }, new Map<string, number>())
        .entries()
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [overlaps]
  )

  const goToPreviousPeriod = () => setCurrentDate(subDays(currentDate, selectedDays))
  const goToNextPeriod = () => setCurrentDate(addDays(currentDate, selectedDays))
  const goToToday = () => { setCurrentDate(new Date()); setIsCustomPeriod(false) }

  const handlePeriodChange = (days: number) => {
    if (days === -1) {
      setIsCustomPeriod(true)
      setCustomStartDate(format(new Date(), 'yyyy-MM-dd'))
      setCustomEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
    } else {
      setIsCustomPeriod(false)
      setSelectedDays(days)
    }
  }

  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: T.primary, borderTopColor: 'transparent' }} />
          <p className="text-sm font-mono" style={{ color: T.onSurfaceVar }}>Analyzing overlaps…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="p-10 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Event Overlaps</h1>
            <p className="text-sm mt-1" style={{ color: T.onSurfaceVar }}>
              {overlaps.length} conflict{overlaps.length !== 1 ? 's' : ''} detected over {format(startDate, 'dd MMM', { locale: fr })} – {format(endDate, 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>

          {/* Period Nav */}
          <div className="flex items-center gap-3 flex-wrap">
            {!isCustomPeriod && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPreviousPeriod}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}
                >
                  Today
                </button>
                <button
                  onClick={goToNextPeriod}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: a('outlineVar', 0.08), color: T.onSurfaceVar }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <select
              value={isCustomPeriod ? -1 : selectedDays}
              onChange={(e) => handlePeriodChange(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
              style={{
                background: a('outlineVar', 0.08),
                color: T.onSurface,
                border: `1px solid ${a('outlineVar', 0.2)}`,
              }}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={-1}>Custom</option>
            </select>
          </div>
        </div>

        {/* Custom date inputs */}
        {isCustomPeriod && (
          <div className="flex items-center gap-4 flex-wrap p-4 rounded-xl" style={{ background: T.surfaceLow, border: `1px solid ${a('outlineVar', 0.12)}` }}>
            <CalendarIcon className="w-4 h-4" style={{ color: T.onSurfaceVar }} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: T.onSurfaceVar }}>From</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{ background: a('outlineVar', 0.08), color: T.onSurface, border: `1px solid ${a('outlineVar', 0.2)}` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: T.onSurfaceVar }}>To</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{ background: a('outlineVar', 0.08), color: T.onSurface, border: `1px solid ${a('outlineVar', 0.2)}` }}
              />
            </div>
            <button
              onClick={() => { setIsCustomPeriod(false); setSelectedDays(7) }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: a('error', 0.1), color: T.error, border: `1px solid ${a('error', 0.2)}` }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Overlap Mode Toggle ── */}
        <div className="flex items-center gap-2 p-1 rounded-xl w-fit" style={{ background: T.surfaceLow }}>
          <button
            onClick={() => setOverlapMode('strict')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={overlapMode === 'strict'
              ? { background: T.surface, color: T.onSurface, boxShadow: `0 2px 8px ${a('outlineVar', 0.2)}` }
              : { background: 'transparent', color: T.onSurfaceVar }
            }
          >
            <Layers className="w-3.5 h-3.5" />
            Same service + environment
          </button>
          <button
            onClick={() => setOverlapMode('env-only')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={overlapMode === 'env-only'
              ? { background: T.surface, color: T.onSurface, boxShadow: `0 2px 8px ${a('outlineVar', 0.2)}` }
              : { background: 'transparent', color: T.onSurfaceVar }
            }
          >
            <Globe className="w-3.5 h-3.5" />
            Same environment only
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Overlaps */}
          <div className="p-6 rounded-xl relative overflow-hidden" style={{
            background: T.surfaceLow,
            borderLeft: `2px solid ${overlaps.length > 0 ? '#fb923c' : T.success}`,
          }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl"
              style={{ background: overlaps.length > 0 ? 'rgba(251,146,60,0.06)' : a('success', 0.04) }} />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>
                Total Overlaps
              </span>
              <AlertTriangle className="w-4 h-4" style={{ color: overlaps.length > 0 ? '#fb923c' : T.success }} />
            </div>
            <div className="text-4xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif", color: overlaps.length > 0 ? '#fb923c' : T.onSurface }}>
              {String(overlaps.length).padStart(2, '0')}
            </div>
            <div className="mt-4 text-xs" style={{ color: T.onSurfaceVar }}>
              {overlaps.length > 0 ? `${overlapsByDay.size} day${overlapsByDay.size !== 1 ? 's' : ''} affected` : 'No conflicts detected'}
            </div>
          </div>

          {/* Days Affected */}
          <div className="p-6 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: a('primary', 0.04) }} />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>
                Days Affected
              </span>
              <CalendarIcon className="w-4 h-4" style={{ color: T.primary }} />
            </div>
            <div className="text-4xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {String(overlapsByDay.size).padStart(2, '0')}
            </div>
            <div className="mt-4 text-xs" style={{ color: T.onSurfaceVar }}>
              over {isCustomPeriod ? 'custom range' : `${selectedDays} day${selectedDays !== 1 ? 's' : ''}`}
            </div>
          </div>

          {/* Services Involved */}
          <div className="p-6 rounded-xl relative overflow-hidden" style={{ background: T.surfaceLow }}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl" style={{ background: a('tertiary', 0.04) }} />
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk',sans-serif" }}>
                Services Involved
              </span>
              <Users className="w-4 h-4" style={{ color: T.tertiary }} />
            </div>
            <div className="text-4xl font-black" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {String(servicesInvolved).padStart(2, '0')}
            </div>
            <div className="mt-4 text-xs" style={{ color: T.onSurfaceVar }}>
              {overlaps.length > 0 ? `across ${overlapsByDay.size} day${overlapsByDay.size !== 1 ? 's' : ''}` : 'No services in conflict'}
            </div>
          </div>
        </div>

        {/* ── Content: Overlaps List + Summary ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Overlaps List */}
          <div className="xl:col-span-2 space-y-6">
            {overlaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: T.surface }}>
                <CheckCircle className="w-10 h-10 mb-4" style={{ color: T.success }} />
                <p className="text-sm font-bold" style={{ color: T.onSurface }}>No Overlaps Detected</p>
                <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>All events are well coordinated in this period.</p>
              </div>
            ) : (
              Array.from(overlapsByDay.entries()).map(([dayKey, dayOverlaps]) => {
                const day = new Date(dayKey)
                return (
                  <div key={dayKey} className="rounded-2xl overflow-hidden" style={{ background: T.surface }}>
                    {/* Day header */}
                    <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${a('outlineVar', 0.08)}` }}>
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4" style={{ color: T.primary }} />
                        <span className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                          {format(day, 'EEEE dd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}
                      >
                        {dayOverlaps.length} overlap{dayOverlaps.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Overlap pairs */}
                    <div className="p-4 space-y-4">
                      {dayOverlaps.map((overlap, idx) => {
                        const durationMin = Math.round((overlap.overlapEnd.getTime() - overlap.overlapStart.getTime()) / 60000)
                        return (
                          <div
                            key={idx}
                            className="rounded-xl p-4"
                            style={{ background: a('outlineVar', 0.04), border: `1px solid rgba(251,146,60,0.2)` }}
                          >
                            {/* Overlap period */}
                            <div className="flex items-center gap-3 mb-4">
                              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#fb923c' }} />
                              <div className="flex items-center gap-2 text-xs font-mono">
                                <span className="font-bold" style={{ color: '#fb923c' }}>
                                  {format(overlap.overlapStart, 'HH:mm')} → {format(overlap.overlapEnd, 'HH:mm')}
                                </span>
                                <span style={{ color: T.onSurfaceVar }}>·</span>
                                <span style={{ color: T.onSurfaceVar }}>{durationMin} min</span>
                              </div>
                            </div>

                            {/* Two event cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {([overlap.event1, overlap.event2] as const).map((event, ei) => {
                                const catalog = ei === 0 ? overlap.catalog1 : overlap.catalog2
                                const startStr = event.attributes.startDate || event.metadata?.createdAt || ''
                                const endStr = event.attributes.endDate
                                return (
                                  <div
                                    key={ei}
                                    className="rounded-xl p-4 flex flex-col gap-3"
                                    style={{ background: T.surfaceHigh }}
                                  >
                                    {/* Badges row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                                        style={{
                                          background: a('primary', 0.12),
                                          color: T.primary,
                                          border: `1px solid ${a('primary', 0.25)}`,
                                        }}
                                      >
                                        {getEventTypeLabel(event.attributes.type)}
                                      </span>
                                      <EnvBadge env={event.attributes.environment} />
                                      <StatusBadge status={event.attributes.status} />
                                    </div>

                                    {/* Title */}
                                    <button
                                      onClick={() => setSelectedEvent(event)}
                                      className="text-left text-sm font-bold leading-snug transition-opacity hover:opacity-70"
                                      style={{ color: T.onSurface }}
                                    >
                                      {event.title}
                                    </button>

                                    {/* Service + times */}
                                    <div className="space-y-1">
                                      {event.attributes.service && (
                                        <p className="text-xs font-mono" style={{ color: T.onSurfaceVar }}>{event.attributes.service}</p>
                                      )}
                                      <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: T.outline }}>
                                        <span>{format(new Date(startStr), 'HH:mm')}</span>
                                        <span>→</span>
                                        <span>{endStr ? format(new Date(endStr), 'HH:mm') : '—'}</span>
                                      </div>
                                    </div>

                                    {/* Team contact */}
                                    {catalog && (
                                      <div className="pt-3 space-y-1.5" style={{ borderTop: `1px solid ${a('outlineVar', 0.1)}` }}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Team Contact</p>
                                        {catalog.owner && (
                                          <div className="flex items-center gap-2 text-xs" style={{ color: T.onSurfaceVar }}>
                                            <User className="w-3 h-3" />
                                            <span>{catalog.owner}</span>
                                          </div>
                                        )}
                                        {catalog.email && (
                                          <a
                                            href={`mailto:${catalog.email}`}
                                            className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
                                            style={{ color: T.primary }}
                                          >
                                            <Mail className="w-3 h-3" />
                                            <span>{catalog.email}</span>
                                          </a>
                                        )}
                                        {catalog.slackChannel && (
                                          <a
                                            href={`https://slack.com/app_redirect?channel=${catalog.slackChannel}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
                                            style={{ color: T.primary }}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            <span>#{catalog.slackChannel}</span>
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Summary Panel ── */}
          <div className="space-y-6">
            {/* Period summary */}
            <div className="p-6 rounded-2xl space-y-4" style={{ background: T.surface }}>
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Period Summary</h3>
                <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>
                  {format(startDate, 'dd MMM', { locale: fr })} – {format(endDate, 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Total Overlaps', value: overlaps.length, color: '#fb923c', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                  { label: 'Days Affected', value: overlapsByDay.size, color: T.primary, icon: <CalendarIcon className="w-3.5 h-3.5" /> },
                  { label: 'Services', value: servicesInvolved, color: T.tertiary, icon: <Users className="w-3.5 h-3.5" /> },
                ].map(({ label, value, color, icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: a('outlineVar', 0.06) }}
                  >
                    <div className="flex items-center gap-2 text-xs" style={{ color: T.onSurfaceVar }}>
                      <span style={{ color }}>{icon}</span>
                      {label}
                    </div>
                    <span className="text-sm font-black font-mono" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most affected services */}
            {mostAffectedServices.length > 0 && (
              <div className="p-6 rounded-2xl" style={{ background: T.surface }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Most Affected Services</h3>
                <div className="space-y-3">
                  {mostAffectedServices.map(([service, count], i) => {
                    const max = mostAffectedServices[0][1]
                    const pct = Math.round((count / max) * 100)
                    return (
                      <div key={service}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono truncate flex-1 mr-2" style={{ color: T.onSurface }} title={service}>{service}</span>
                          <span className="font-bold font-mono shrink-0" style={{ color: '#fb923c' }}>{count}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: a('outlineVar', 0.1) }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#fb923c' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mode explanation */}
            <div className="p-4 rounded-xl" style={{ background: a('primary', 0.06), border: `1px solid ${a('primary', 0.15)}` }}>
              <div className="flex items-center gap-2 mb-2">
                {overlapMode === 'strict' ? <Layers className="w-3.5 h-3.5" style={{ color: T.primary }} /> : <Globe className="w-3.5 h-3.5" style={{ color: T.primary }} />}
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.primary }}>
                  {overlapMode === 'strict' ? 'Strict Mode' : 'Environment Mode'}
                </span>
              </div>
              <p className="text-xs" style={{ color: T.onSurfaceVar }}>
                {overlapMode === 'strict'
                  ? 'Showing overlaps where events share the same service and environment simultaneously.'
                  : 'Showing overlaps where events share the same environment, regardless of service.'}
              </p>
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
