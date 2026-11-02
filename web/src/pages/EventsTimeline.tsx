import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { eventsApi } from '../lib/api'
import { format, subDays, startOfDay, endOfDay, subHours, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import type { Event } from '../types/api'
import { 
  ArrowUp, ArrowDown, Calendar,
  ChevronRight, CheckCircle, Clock 
} from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, isEventApproved } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { TimeViewFilters } from '../components/filters/TimeViewFilters'
import { useTimeViewFilter } from '../hooks/useTimeViewFilter'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

type TimeRange = {
  label: string
  getValue: () => { start: Date; end: Date }
}

type SortField = 'createdAt' | 'startDate' | 'endDate'

const getEventDateForSort = (event: Event, field: SortField): Date | null => {
  const dateCandidate = field === 'createdAt'
    ? event.metadata?.createdAt
    : field === 'startDate'
      ? event.attributes.startDate || event.metadata?.createdAt
      : event.attributes.endDate || event.attributes.startDate || event.metadata?.createdAt

  if (!dateCandidate) return null
  const parsedDate = new Date(dateCandidate)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
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

export default function EventsTimeline() {
  // Filters and period are shared by the time views and kept in the URL.
  const { query, setQuery, serverParams, filter, from: startDate, to: endDate, periodFromUrl, setPeriod } = useTimeViewFilter(() => ({
    from: subDays(new Date(), 7),
    to: new Date(),
  }))
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(periodFromUrl ? 'Custom range' : 'Last 7 days')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'timeline', startDate.toISOString(), endDate.toISOString(), serverParams],
    queryFn: () => eventsApi.search({
      ...serverParams,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    refetchInterval: 30_000,
  })

  const allEvents = useMemo(() => data?.events ?? [], [data])

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

  const events = useMemo(() => {
    const filtered = filter(allEvents).filter((event: Event) => {
      const eventDate = getEventDateForSort(event, sortField)
      return !!eventDate && eventDate >= startDate && eventDate <= endDate
    })
    
    const sorted = [...filtered].sort((a, b) => {
      const dateA = getEventDateForSort(a, sortField)?.getTime() ?? 0
      const dateB = getEventDateForSort(b, sortField)?.getTime() ?? 0
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return sorted
  }, [allEvents, filter, startDate, endDate, sortOrder, sortField])

  const liveEventsCount = events.filter((event) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'start' || status === 'in_progress' || status === '1' || status === '12'
  }).length

  const doneEventsCount = events.filter((event) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'completed' || status === 'success' || status === 'done' || status === '3' || status === '11'
  }).length

  const conflictEventsCount = events.filter((event) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'failure' || status === 'error' || status === 'warning' || status === '2' || status === '4' || status === '5'
  }).length

  const groupedTimelineEvents = useMemo(() => {
    const groups: Record<string, { label: string; sortKey: number; events: Event[] }> = {}

    events.forEach((event) => {
      const groupedDate = getEventDateForSort(event, sortField)
      if (!groupedDate) return
      const groupKey = format(groupedDate, 'yyyy-MM-dd')

      if (!groups[groupKey]) {
        const label = isToday(groupedDate)
          ? `Today — ${format(groupedDate, 'MMM dd', { locale: enUS })}`
          : isYesterday(groupedDate)
            ? `Yesterday — ${format(groupedDate, 'MMM dd', { locale: enUS })}`
            : format(groupedDate, 'MMM dd, yyyy', { locale: enUS })

        groups[groupKey] = {
          label,
          sortKey: groupedDate.getTime(),
          events: [],
        }
      }

      groups[groupKey].events.push(event)
    })

    return Object.values(groups).sort((a, b) => sortOrder === 'desc' ? b.sortKey - a.sortKey : a.sortKey - b.sortKey)
  }, [events, sortOrder, sortField])

  const getEnvironmentBadgeStyle = (environment?: string) => {
    const e = String(environment || '').toLowerCase()
    if (e === 'production' || e === '7') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (e === 'preproduction' || e === '6') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    if (e === 'development' || e === '1' || e === 'integration' || e === '2') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
    if (e) return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="flex h-screen overflow-hidden gap-4 p-4" style={{ background: 'rgb(var(--hud-bg))' }}>{/* Removed extra padding/borders */}
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0">
        {/* Top Bar */}
        <div className="flex flex-col gap-space-3">
          <h1 className="text-title-lg text-ink">Timeline</h1>
          <TimeViewFilters query={query} onChange={setQuery} events={allEvents} resultCount={events.length} />
        </div>

        <div className="px-4 py-3 rounded-xl" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
          <div className="flex items-center gap-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-semibold tabular-nums" style={{ color: 'rgb(var(--hud-on-surface))' }}>{events.length}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>total events</span>
            </div>
            <div className="w-px h-8" style={{ background: 'rgb(var(--hud-outline-var) / 0.2)' }} />
            <div className="flex items-center gap-4 text-xs">
              <span className="font-medium" style={{ color: '#E85D04' }}>{liveEventsCount} live</span>
              <span style={{ color: '#9CA3AF' }}>·</span>
              <span className="font-medium" style={{ color: '#B84400' }}>{conflictEventsCount} conflict</span>
              <span style={{ color: '#9CA3AF' }}>·</span>
              <span className="font-medium" style={{ color: '#166534' }}>{doneEventsCount} completed</span>
            </div>
          </div>
        </div>

        {/* Time Controls Bar */}
        <div>
          <div className="rounded-xl p-3" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.18)' }}>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-xs min-w-[180px] justify-between" style={{ background: '#F3F6FC', color: '#1B3575', border: '1px solid #D7E0F0' }}>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedTimeRange}
                      </span>
                      <ChevronRight className="w-3 h-3 rotate-90" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-3 space-y-3">
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Quick Ranges
                        </div>
                        <div className="space-y-1 mt-2">
                          {timeRanges.map((range) => (
                            <button
                              key={range.label}
                              onClick={() => handleTimeRangeSelect(range)}
                              className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                selectedTimeRange === range.label
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Custom Range
                        </div>
                        <div className="space-y-2 mt-2">
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">From</label>
                            <Input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">To</label>
                            <Input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={handleCustomDateApply}
                            disabled={!customStartDate || !customEndDate}
                            className="w-full h-7 text-xs"
                          >
                            Apply Custom Range
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2 text-sm justify-center min-w-0 px-3 py-2 rounded-md" style={{ color: '#51607F', background: '#F8FAFD', border: '1px solid #E1E7F2' }}>
                <Calendar className="w-4 h-4 shrink-0" style={{ color: '#1B3575' }} />
                <span className="font-medium truncate">
                  {format(startDate, 'MMM dd, HH:mm', { locale: enUS })} - {format(endDate, 'MMM dd, HH:mm', { locale: enUS })}
                </span>
              </div>

              <div className="flex items-center justify-end">
                <div className="flex items-center h-9 rounded-md overflow-hidden mr-2" style={{ background: '#F3F6FC', border: '1px solid #D7E0F0' }}>
                  {([
                    { value: 'createdAt', label: 'Created' },
                    { value: 'startDate', label: 'Start' },
                    { value: 'endDate', label: 'End' },
                  ] as Array<{ value: SortField; label: string }>).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSortField(option.value)}
                      className="h-full px-2.5 text-xs border-r last:border-r-0 transition-colors"
                      style={sortField === option.value
                        ? { background: '#1B3575', color: '#FFFFFF', borderColor: '#D7E0F0' }
                        : { color: '#1B3575', borderColor: '#D7E0F0' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="h-9 gap-1 text-xs"
                  style={{ background: '#F3F6FC', color: '#1B3575', border: '1px solid #D7E0F0' }}
                >
                  {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                  {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <ScrollArea className="flex-1">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-4" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>No events found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-2 pr-1">
              {groupedTimelineEvents.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6E7891' }}>{group.label}</span>
                    <div className="flex-1 h-px" style={{ background: 'rgb(var(--hud-outline-var) / 0.2)' }} />
                    <span className="text-[10px] tabular-nums" style={{ color: '#B0BAD0' }}>{group.events.length} event{group.events.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
                    {group.events.map((event) => {
                      const typeColor = getEventTypeColor(event.attributes.type)
                      const impactRaw = String(event.attributes.impact || '').toLowerCase().trim()
                      const hasImpact = impactRaw !== '' && impactRaw !== 'false' && impactRaw !== '0' && impactRaw !== 'none' && impactRaw !== 'null' && impactRaw !== 'undefined'
                      const priority = String(event.attributes.priority || '').toLowerCase()
                      const priorityStyle = priority === 'p1' || priority === '1'
                        ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
                        : priority === 'p2' || priority === '2'
                          ? { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0' }
                          : priority === 'p3' || priority === '3'
                            ? { bg: '#FDFCE8', text: '#6B6000', border: '#F0EA90' }
                            : { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
                      const status = String(event.attributes.status || '').toLowerCase()
                      const statusStyle = status === 'success' || status === '3' || status === 'done' || status === '11'
                        ? { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', label: 'Success' }
                        : status === 'failure' || status === '2' || status === 'error' || status === '5'
                          ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Conflict' }
                          : status === 'start' || status === '1' || status === 'in_progress' || status === '12'
                            ? { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Live' }
                            : { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', label: 'Scheduled' }
                      const statusIconClass = statusStyle.label === 'Success'
                        ? 'fa-circle-check'
                        : statusStyle.label === 'Conflict'
                          ? 'fa-triangle-exclamation'
                          : statusStyle.label === 'Live'
                            ? 'fa-satellite-dish'
                            : 'fa-clock'
                      const displayDate = getEventDateForSort(event, sortField)
                      return (
                        <button
                          key={event.metadata?.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left px-5 py-3.5 transition-colors hover:bg-[#FAFBFF]"
                          style={{ borderTop: '1px solid rgb(var(--hud-outline-var) / 0.1)' }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-[84px] shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: '#B0BAD0' }}>
                              #{String(event.metadata?.id || '').slice(-6).toUpperCase() || '------'}
                            </span>
                            <div className="shrink-0 w-[84px] flex items-center justify-start gap-1.5 text-left">
                              <span
                                className="w-7 h-7 rounded-md flex items-center justify-center border"
                                style={{ background: priorityStyle.bg, color: priorityStyle.text, borderColor: priorityStyle.border }}
                              >
                                <span className="text-[9px] font-bold leading-none">{getPriorityLabel(event.attributes.priority).toUpperCase()}</span>
                              </span>
                            </div>
                            <div className="shrink-0 w-[120px] flex items-center justify-start gap-1.5 text-left">
                              <span
                                className="w-7 h-7 rounded-md flex items-center justify-center border"
                                style={{ background: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
                              >
                                <i className={`fa-solid ${statusIconClass} text-[11px]${statusIconClass === 'fa-satellite-dish' ? ' fa-fade' : ''}`} />
                              </span>
                              <span className="text-[10px] font-semibold uppercase" style={{ color: statusStyle.text }}>
                                {statusStyle.label}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate" style={{ color: 'rgb(var(--hud-on-surface))' }}>{event.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <code className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{event.attributes.service}</code>
                              </div>
                            </div>
                            {isEventApproved(event) && (
                              <div className="shrink-0 w-[120px] flex items-center justify-start gap-1.5 text-left">
                                <span
                                  className="w-7 h-7 rounded-md flex items-center justify-center border"
                                  style={{ background: '#ECFDF3', color: '#166534', borderColor: '#BBF7D0' }}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-[10px] font-semibold uppercase" style={{ color: '#166534' }}>
                                  Approved
                                </span>
                              </div>
                            )}
                            <div className="shrink-0 w-[130px] flex items-center justify-start">
                              {event.attributes.environment && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap"
                                  style={(() => {
                                    const envStyle = getEnvironmentBadgeStyle(event.attributes.environment)
                                    return { background: envStyle.bg, color: envStyle.text, borderColor: envStyle.border }
                                  })()}
                                >
                                  {String(getEnvironmentLabel(event.attributes.environment) || 'N/A').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="shrink-0 w-[120px] flex items-center justify-start gap-1.5 text-left">
                              <span
                                className="w-7 h-7 rounded-md flex items-center justify-center border"
                                style={hasImpact
                                  ? { background: '#FFF0E8', color: '#B84400', borderColor: '#FFC8A0' }
                                  : { background: '#EEF1F8', color: '#6E7891', borderColor: '#D5DBE8' }}
                              >
                                <i
                                  className={`fa-solid fa-meteor text-[11px]${hasImpact ? ' fa-beat-fade' : ''}`}
                                  style={hasImpact ? ({ '--fa-animation-duration': '2s' } as CSSProperties) : undefined}
                                />
                              </span>
                              <span
                                className="text-[10px] font-semibold uppercase"
                                style={hasImpact ? { color: '#B84400' } : { color: '#6E7891' }}
                              >
                                Impact
                              </span>
                            </div>
                            <div className="shrink-0 w-[120px] flex items-center justify-start gap-1.5 text-left">
                              <span className={`w-7 h-7 rounded-md flex items-center justify-center border ${typeColor.border}`} style={{ background: 'rgb(var(--hud-surface-high))' }}>
                                {getEventTypeIcon(event.attributes.type, 'w-3.5 h-3.5')}
                              </span>
                              <span className="text-[10px] font-semibold uppercase max-w-[70px] truncate" style={{ color: '#6E7891' }}>{getEventTypeLabel(event.attributes.type)}</span>
                            </div>
                            <div className="shrink-0 text-right w-[180px]">
                              <div className="flex items-center justify-end gap-1 mb-0.5" style={{ color: '#9CA3AF' }}>
                                <SourceIcon source={String(event.attributes.source || 'tracker')} />
                                <span className="text-[11px] truncate max-w-[150px]">{event.attributes.owner || '-'}</span>
                              </div>
                              <div className="text-[10px] tabular-nums" style={{ color: '#9CA3AF' }}>
                                {displayDate ? format(displayDate, 'HH:mm', { locale: enUS }) : '--:--'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="h-1 shrink-0" />
            </div>
          )}
        </ScrollArea>
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
