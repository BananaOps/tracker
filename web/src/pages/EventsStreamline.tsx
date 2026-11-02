import { useState, useMemo, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { format, addDays, isWithinInterval, isSameDay, startOfDay, endOfDay, addHours, getHours, subDays, subHours } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Package, Globe, Calendar, Clock, ChevronDown, AlertTriangle } from 'lucide-react'
import type { Event } from '../types/api'
import { getEnvironmentLabel, getEventTypeIcon, isEventApproved } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { TimeViewFilters } from '../components/filters/TimeViewFilters'
import { useTimeViewFilter } from '../hooks/useTimeViewFilter'

type GroupBy = 'service' | 'environment'
type ViewMode = 'week' | 'day'

type TimeRange = {
  label: string
  getValue: () => { start: Date; end: Date }
}

const timeRanges: TimeRange[] = [
  { label: 'Last 24 hours', getValue: () => ({ start: subHours(new Date(), 24), end: new Date() }) },
  { label: 'Last 2 days', getValue: () => ({ start: subDays(new Date(), 2), end: new Date() }) },
  { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 14 days', getValue: () => ({ start: subDays(new Date(), 14), end: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Last 60 days', getValue: () => ({ start: subDays(new Date(), 60), end: new Date() }) },
  { label: 'Last 90 days', getValue: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
]

export default function EventsStreamline() {
  const [groupBy, setGroupBy] = useState<GroupBy>('service')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  // Filters and period are shared by the time views and kept in the URL.
  const { query, setQuery, serverParams, filter, from: startDate, to: endDate, periodFromUrl, setPeriod } = useTimeViewFilter(() => ({
    from: subDays(new Date(), 7),
    to: new Date(),
  }))
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(periodFromUrl ? 'Custom range' : 'Last 7 days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'streamline', startDate.toISOString(), endDate.toISOString(), serverParams],
    queryFn: () => eventsApi.search({
      ...serverParams,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    refetchInterval: 30_000,
  })

  const allEvents = useMemo(() => data?.events ?? [], [data])
  const events = useMemo(() => filter(allEvents), [allEvents, filter])

  // Calculer la période affichée basée sur les dates sélectionnées
  const today = new Date()
  const focusedDay = viewMode === 'day' ? endDate : startDate
  const dayStart = startOfDay(focusedDay)
  const dayEnd = endOfDay(focusedDay)
  
  const handleTimeRangeSelect = (range: TimeRange) => {
    const { start, end } = range.getValue()
    setPeriod({ from: start, to: end })
    setSelectedTimeRange(range.label)
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      // Créer les dates et forcer l'heure à minuit pour le début et 23:59:59 pour la fin
      const start = startOfDay(new Date(customStartDate))
      const end = endOfDay(new Date(customEndDate))
      setPeriod({ from: start, to: end })
      setSelectedTimeRange('Custom range')
    }
  }
  
  // Générer les colonnes selon le mode
  const timeSlots = useMemo(() => {
    if (viewMode === 'week') {
      // Calculer le nombre de jours entre startDate et endDate
      const start = startOfDay(startDate)
      const end = startOfDay(endDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      // Générer les jours de la période sélectionnée
      return Array.from({ length: daysDiff }, (_, i) => addDays(start, i))
    } else {
      // 24 heures de la journée
      return Array.from({ length: 24 }, (_, i) => addHours(dayStart, i))
    }
  }, [viewMode, startDate, endDate, dayStart])

  // Grouper et filtrer les événements
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    const start = viewMode === 'day' ? dayStart : startOfDay(startDate)
    const end = viewMode === 'day' ? dayEnd : endOfDay(endDate)
    
    // Filtrer les événements de la période
    const periodEvents = events.filter(event => {
      if (!event.metadata?.createdAt) return false
      const eventDate = new Date(event.metadata.createdAt)
      return isWithinInterval(eventDate, { start, end })
    })

    periodEvents.forEach(event => {
      const key = groupBy === 'service' 
        ? event.attributes.service 
        : (event.attributes.environment || 'unknown')
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    })

    return groups
  }, [events, groupBy, viewMode, startDate, endDate, dayStart, dayEnd])

  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false)
  const timeRangeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeRangeRef.current && !timeRangeRef.current.contains(e.target as Node)) {
        setShowTimeRangePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'rgb(var(--hud-bg))' }}>
        <div className="text-sm font-medium" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Loading…</div>
      </div>
    )
  }

  const sortedGroups = Object.keys(groupedEvents).sort((a, b) => 
    groupedEvents[b].length - groupedEvents[a].length
  )

  const getEnvironmentBadgeStyle = (environment?: string) => {
    const env = String(environment || '').toLowerCase()
    if (env === 'production' || env === '7') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (env === 'preproduction' || env === '6') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    if (env === 'development' || env === '1' || env === 'integration' || env === '2') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
  }

  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:           'rgb(var(--hud-bg))',
    surface:      'rgb(var(--hud-surface))',
    surfaceLow:   'rgb(var(--hud-surface-low))',
    surfaceHigh:  'rgb(var(--hud-surface-high))',
    primary:      'rgb(var(--hud-primary))',
    error:        'rgb(var(--hud-error))',
    success:      'rgb(var(--hud-success))',
    onSurface:    'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outlineVar:   'rgb(var(--hud-outline-var))',
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden gap-4 p-4" style={{ background: T.bg, color: T.onSurface }}>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0" style={{ background: T.bg }}>

        <div className="flex flex-col gap-space-3">
          <h1 className="text-title-lg text-ink">Streamline</h1>
          <TimeViewFilters query={query} onChange={setQuery} events={allEvents} resultCount={events.length} />
        </div>

        {/* Time Controls Bar */}
        <div className="px-6 py-3 flex items-center justify-between shrink-0 rounded-xl"
          style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>

          {/* Left: Time Range Picker */}
          <div ref={timeRangeRef} className="relative">
            <button
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.3)}`, color: T.onSurface }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: T.primary }} />
              {selectedTimeRange}
              <ChevronDown className="w-3 h-3" style={{ color: T.onSurfaceVar }} />
            </button>
            {showTimeRangePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl p-4 w-72 space-y-4"
                style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}`, boxShadow: `0 16px 40px ${a('bg', 0.8)}` }}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Quick Ranges</div>
                  <div className="space-y-0.5">
                    {timeRanges.map(range => (
                      <button key={range.label}
                        onClick={() => { handleTimeRangeSelect(range); setShowTimeRangePicker(false) }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          background: selectedTimeRange === range.label ? a('primary', 0.12) : 'transparent',
                          color: selectedTimeRange === range.label ? T.primary : T.onSurface,
                          fontWeight: selectedTimeRange === range.label ? 600 : 400
                        }}>
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${a('outline-var', 0.12)}` }} />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Custom Range</div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: T.onSurfaceVar }}>From</label>
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs border-0 outline-hidden"
                        style={{ background: a('outline-var', 0.08), color: T.onSurface }} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: T.onSurfaceVar }}>To</label>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs border-0 outline-hidden"
                        style={{ background: a('outline-var', 0.08), color: T.onSurface }} />
                    </div>
                    <button onClick={() => { handleCustomDateApply(); setShowTimeRangePicker(false) }}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
                      style={{ background: T.primary, color: '#000' }}>
                      Apply Custom Range
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center: Date Display + View Mode */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4" style={{ color: T.primary }} />
              {viewMode === 'day' ? (
                <span className="font-medium tabular-nums" style={{ color: T.onSurface }}>
                  {format(dayStart, 'MMM dd, yyyy', { locale: enUS })}
                </span>
              ) : (
                <span className="font-medium tabular-nums" style={{ color: T.onSurface }}>
                  {format(startDate, 'MMM dd', { locale: enUS })} - {format(endDate, 'MMM dd, yyyy', { locale: enUS })}
                </span>
              )}
            </div>
            <div className="flex items-center rounded-lg p-0.5" style={{ background: a('outline-var', 0.08) }}>
              <button
                onClick={() => setViewMode('week')}
                className="flex items-center space-x-1 px-2 py-1 rounded-md transition-all text-xs"
                style={{
                  background: viewMode === 'week' ? T.surface : 'transparent',
                  color: viewMode === 'week' ? T.onSurface : T.onSurfaceVar,
                  boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                <Calendar className="w-3 h-3" />
                <span className="font-medium">Week</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                className="flex items-center space-x-1 px-2 py-1 rounded-md transition-all text-xs"
                style={{
                  background: viewMode === 'day' ? T.surface : 'transparent',
                  color: viewMode === 'day' ? T.onSurface : T.onSurfaceVar,
                  boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                <Clock className="w-3 h-3" />
                <span className="font-medium">Day</span>
              </button>
            </div>
          </div>

          {/* Right: Group By */}
          <div className="flex items-center rounded-lg p-0.5" style={{ background: a('outline-var', 0.08) }}>
            <button
              onClick={() => setGroupBy('service')}
              className="flex items-center space-x-1 px-2 py-1 rounded-md transition-all text-xs"
              style={{
                background: groupBy === 'service' ? T.surface : 'transparent',
                color: groupBy === 'service' ? T.onSurface : T.onSurfaceVar,
                boxShadow: groupBy === 'service' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              <Package className="w-3 h-3" />
              <span className="font-medium">Service</span>
            </button>
            <button
              onClick={() => setGroupBy('environment')}
              className="flex items-center space-x-1 px-2 py-1 rounded-md transition-all text-xs"
              style={{
                background: groupBy === 'environment' ? T.surface : 'transparent',
                color: groupBy === 'environment' ? T.onSurface : T.onSurfaceVar,
                boxShadow: groupBy === 'environment' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              <Globe className="w-3 h-3" />
              <span className="font-medium">Environment</span>
            </button>
          </div>

        </div>

        {/* Gantt Grid */}
        <div className="flex-1 overflow-auto p-6 rounded-xl" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
          <div className={viewMode === 'week' ? '' : 'overflow-x-auto'}>

            {/* Header */}
            <div className="grid gap-2 mb-4 pb-4" style={{
              gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))`,
              borderBottom: `1px solid ${a('outline-var', 0.15)}`
            }}>
              <div className="font-semibold text-sm" style={{ color: T.onSurface }}>
                {groupBy === 'service' ? 'Service' : 'Environment'}
              </div>
              {timeSlots.map(slot => {
                const isCurrent = viewMode === 'week' ? isSameDay(slot, today) : getHours(slot) === getHours(new Date())
                return (
                  <div key={slot.toISOString()} className="text-center">
                    {viewMode === 'week' ? (
                      <>
                        <div className="text-xs font-medium" style={{ color: isCurrent ? T.primary : T.onSurfaceVar }}>
                          {format(slot, 'EEE', { locale: enUS })}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: isCurrent ? T.primary : T.onSurface }}>
                          {format(slot, 'dd')}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs font-medium" style={{ color: isCurrent ? T.primary : T.onSurfaceVar }}>
                        {format(slot, 'HH:mm')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Rows */}
            {sortedGroups.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <Calendar className="w-10 h-10" style={{ color: T.onSurfaceVar }} />
                <span className="text-sm" style={{ color: T.onSurfaceVar }}>
                  {viewMode === 'week' ? 'No events this week' : 'No events today'}
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedGroups.map((groupName, groupIndex) => {
                  const displayName = groupBy === 'environment' ? getEnvironmentLabel(groupName) || groupName : groupName
                  const totalEvents = groupedEvents[groupName].length
                  const groupEventsArray = groupedEvents[groupName]

                  const uniqueEvents = groupEventsArray.filter((event, index, self) =>
                    index === self.findIndex(e => e.metadata?.id === event.metadata?.id)
                  )

                  const getEventSlotIndices = (event: Event) => {
                    const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                    if (!startDateStr) return { start: -1, end: -1 }

                    const startDate = new Date(startDateStr)
                    const endDateStr = event.attributes.endDate
                    const endDate = endDateStr ? new Date(endDateStr) : startDate

                    let startSlotIndex = -1
                    let endSlotIndex = -1

                    timeSlots.forEach((slot, index) => {
                      if (viewMode === 'week') {
                        if (isSameDay(slot, startDate) && startSlotIndex === -1) startSlotIndex = index
                        if (isSameDay(slot, endDate)) endSlotIndex = index
                      } else {
                        const slotHour = getHours(slot)
                        const startHour = getHours(startDate)
                        const endHour = getHours(endDate)

                        if (isSameDay(slot, startDate) && slotHour === startHour && startSlotIndex === -1) {
                          startSlotIndex = index
                        }
                        if (isSameDay(slot, endDate) && slotHour === endHour) {
                          endSlotIndex = index
                        }
                      }
                    })

                    if (endSlotIndex === -1) endSlotIndex = startSlotIndex
                    return { start: startSlotIndex, end: endSlotIndex }
                  }

                  const eventsOverlap = (event1Indices: { start: number, end: number }, event2Indices: { start: number, end: number }) => {
                    return event1Indices.start <= event2Indices.end && event2Indices.start <= event1Indices.end
                  }

                  const eventsWithTracks = uniqueEvents.map(event => {
                    const indices = getEventSlotIndices(event)
                    return { event, indices, track: 0 }
                  })

                  eventsWithTracks.forEach((eventData, index) => {
                    if (eventData.indices.start === -1) return

                    let track = 0
                    let trackAvailable = false

                    while (!trackAvailable) {
                      trackAvailable = true

                      for (let i = 0; i < index; i++) {
                        const otherEventData = eventsWithTracks[i]
                        if (otherEventData.track === track &&
                            otherEventData.indices.start !== -1 &&
                            eventsOverlap(eventData.indices, otherEventData.indices)) {
                          trackAvailable = false
                          track++
                          break
                        }
                      }
                    }

                    eventData.track = track
                  })

                  const maxTrack = Math.max(...eventsWithTracks.map(e => e.track), 0)
                  const hasOverlaps = maxTrack > 0

                  return (
                    <div key={groupName}>
                      <div className="relative">

                        {/* Background grid */}
                        <div className="grid gap-2 items-start" style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))` }}>

                          {/* Group name column */}
                          <div className="flex items-center space-x-2 py-2" style={{ minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}>
                            {groupBy === 'service' ? (
                              <Package className="w-4 h-4 shrink-0" style={{ color: T.primary }} />
                            ) : (
                              <Globe className="w-4 h-4 shrink-0" style={{ color: T.primary }} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-semibold text-sm truncate" style={{ color: T.onSurface }}>
                                  {displayName}
                                </div>
                                {hasOverlaps && (
                                  <div className="relative shrink-0" title="Overlapping events detected">
                                    <AlertTriangle className="w-4 h-4" style={{ color: '#E8580A' }} />
                                  </div>
                                )}
                              </div>
                              <div className="text-xs" style={{ color: T.onSurfaceVar }}>
                                {totalEvents} event{totalEvents > 1 ? 's' : ''}
                                {hasOverlaps && (
                                  <span className="ml-1 font-medium" style={{ color: '#E8580A' }}>
                                    • {maxTrack + 1} concurrent
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Time slot background cells */}
                          {timeSlots.map(slot => {
                            const isCurrent = viewMode === 'week' ? isSameDay(slot, today) : getHours(slot) === getHours(new Date())
                            return (
                              <div
                                key={slot.toISOString()}
                                style={{
                                  minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px`,
                                  borderRadius: '8px',
                                  background: isCurrent ? a('primary', 0.08) : a('outline-var', 0.04),
                                  border: `1px solid ${isCurrent ? a('primary', 0.2) : a('outline-var', 0.08)}`
                                }}
                              />
                            )
                          })}
                        </div>

                        {/* Event bars layer */}
                        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ paddingTop: '8px' }}>
                          <div className="grid gap-2" style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(${timeSlots.length}, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
                            <div />
                            {timeSlots.map((slot, slotIndex) => (
                              <div key={slot.toISOString()} className="relative" style={{ minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}>
                                {eventsWithTracks.map(({ event, indices, track }) => {
                                  if (indices.start !== slotIndex) return null

                                  const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                                  if (!startDateStr) return null

                                  const startDate = new Date(startDateStr)
                                  const endDateStr = event.attributes.endDate
                                  const endDate = endDateStr ? new Date(endDateStr) : startDate

                                  const spanCount = indices.end - indices.start + 1
                                  const envStyle = getEnvironmentBadgeStyle(event.attributes.environment)
                                  const approved = isEventApproved(event)

                                  return (
                                    <div
                                      key={event.metadata?.id}
                                      onClick={() => setSelectedEvent(event)}
                                      className="absolute pointer-events-auto cursor-pointer hover:shadow-md transition-all"
                                      style={{
                                        left: '2px',
                                        right: spanCount > 1 ? `calc(-${(spanCount - 1) * 100}% - ${(spanCount - 1) * 0.5}rem + 2px)` : '2px',
                                        top: `${track * 32}px`,
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 10,
                                        background: envStyle.bg,
                                        border: `1px solid ${envStyle.border}`,
                                        borderRadius: '8px',
                                        padding: '0 8px',
                                      }}
                                      title={`${event.title} - ${format(startDate, 'HH:mm')} to ${format(endDate, 'HH:mm')}`}
                                    >
                                      <span className="w-5 h-5 rounded-md flex items-center justify-center border mr-1.5 shrink-0" style={{ background: 'rgb(var(--hud-surface-high))', color: envStyle.text, borderColor: envStyle.border }}>
                                        {getEventTypeIcon(event.attributes.type, 'w-3 h-3')}
                                      </span>
                                      <div className="truncate flex-1 text-xs font-semibold" style={{ color: envStyle.text }}>
                                        {event.title}
                                      </div>
                                      {event.attributes.impact && (
                                        <i className="fa-solid fa-meteor fa-beat-fade text-[10px] ml-1 shrink-0" style={{ color: '#ff6e84', '--fa-animation-duration': '2s' } as CSSProperties} />
                                      )}
                                      {approved && <i className="fa-solid fa-circle-check text-[10px] ml-1 shrink-0" style={{ color: '#16A34A' }} />}
                                      {spanCount > 2 && viewMode === 'week' && (
                                        <div className="text-[10px] opacity-75 ml-2 tabular-nums" style={{ color: envStyle.text }}>
                                          {format(startDate, 'HH:mm')}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Row separator */}
                      {groupIndex < sortedGroups.length - 1 && (
                        <div className="mt-3" style={{ borderTop: `1px solid ${a('outline-var', 0.1)}` }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
