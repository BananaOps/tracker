import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { eventsApi, catalogApi } from '../lib/api'
import { format, subDays, startOfDay, endOfDay, subHours, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import type { Event, Catalog } from '../types/api'
import {
  ArrowUp, ArrowDown, Calendar,
  ChevronRight, CheckCircle, Clock 
} from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel, isEventApproved } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import PageFiltersHeader from '../components/filters/PageFiltersHeader'
import FiltersSidebar from '../components/filters/FiltersSidebar'
import { RiskScoreBadge, buildRiskContext, assessAppEvent } from '@/features/risk-engine'
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
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('Last 7 days')
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // États des filtres
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'timeline', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => eventsApi.search({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    refetchInterval: 30_000,
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
    refetchInterval: 30_000,
  })

  const allEvents: Event[] = (data?.events || []) as Event[]
  const catalogs = (catalogData?.catalogs || []) as Array<{ name: string }>

  const catalogServices = useMemo(() => {
    return catalogs.map((c) => c.name).sort()
  }, [catalogs])

  const filteredCatalogServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return catalogServices
    const query = serviceSearchQuery.toLowerCase()
    return catalogServices.filter((service: string) => service.toLowerCase().includes(query))
  }, [catalogServices, serviceSearchQuery])

  const uniqueEnvironments = useMemo<string[]>(() => {
    const invalidValues = ['environment', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map((e: Event) => String(e.attributes.environment || '').trim())
          .filter((env: string) => env && !invalidValues.includes(env.toLowerCase()))
      )
    ).sort()
  }, [allEvents])

  const uniqueTypes = useMemo<string[]>(() => {
    const invalidValues = ['event', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map((e: Event) => String(e.attributes.type || '').trim())
          .filter((type: string) => type && !invalidValues.includes(type.toLowerCase()))
      )
    ).sort()
  }, [allEvents])

  const uniquePriorities = useMemo<string[]>(() => {
    const invalidValues = ['priority', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map((e: Event) => String(e.attributes.priority || '').trim())
          .filter((priority: string) => priority && !invalidValues.includes(priority.toLowerCase()))
      )
    ).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo<string[]>(() => {
    const invalidValues = ['status', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map((e: Event) => String(e.attributes.status || '').trim())
          .filter((status: string) => status && !invalidValues.includes(status.toLowerCase()))
      )
    ).sort()
  }, [allEvents])

  const handleTimeRangeSelect = (range: TimeRange) => {
    const { start, end } = range.getValue()
    setStartDate(start)
    setEndDate(end)
    setSelectedTimeRange(range.label)
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      // Créer les dates et forcer l'heure à minuit pour le début et 23:59:59 pour la fin
      const start = startOfDay(new Date(customStartDate))
      const end = endOfDay(new Date(customEndDate))
      setStartDate(start)
      setEndDate(end)
      setSelectedTimeRange('Custom range')
    }
  }

  const events = useMemo(() => {
    const filtered = allEvents.filter((event: Event) => {
      const eventDate = getEventDateForSort(event, sortField)
      if (!eventDate) return false
      if (eventDate < startDate || eventDate > endDate) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = event.title.toLowerCase().includes(query)
        const matchesService = event.attributes.service.toLowerCase().includes(query)
        const matchesMessage = event.attributes.message?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesService && !matchesMessage) return false
      }

      if (selectedEnvironments.length > 0) {
        const eventEnv = String(event.attributes.environment || '').toLowerCase()
        const hasMatch = selectedEnvironments.some(env => env.toLowerCase() === eventEnv)
        if (!hasMatch) return false
      }

      if (selectedTypes.length > 0) {
        const eventType = String(event.attributes.type || '').toLowerCase()
        const hasMatch = selectedTypes.some(type => type.toLowerCase() === eventType)
        if (!hasMatch) return false
      }

      if (selectedPriorities.length > 0) {
        const eventPriority = String(event.attributes.priority || '').toLowerCase()
        const hasMatch = selectedPriorities.some(priority => priority.toLowerCase() === eventPriority)
        if (!hasMatch) return false
      }

      if (selectedStatuses.length > 0) {
        const eventStatus = String(event.attributes.status || '').toLowerCase()
        const hasMatch = selectedStatuses.some(status => status.toLowerCase() === eventStatus)
        if (!hasMatch) return false
      }

      if (selectedServices.length > 0) {
        if (!selectedServices.includes(event.attributes.service)) return false
      }

      return true
    })
    
    const sorted = [...filtered].sort((a, b) => {
      const dateA = getEventDateForSort(a, sortField)?.getTime() ?? 0
      const dateB = getEventDateForSort(b, sortField)?.getTime() ?? 0
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return sorted
  }, [allEvents, startDate, endDate, searchQuery, selectedEnvironments, selectedTypes, selectedPriorities, selectedStatuses, selectedServices, sortOrder, sortField])

  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value))
    } else {
      setter([...selected, value])
    }
  }

  const clearAllFilters = () => {
    setSelectedEnvironments([])
    setSelectedTypes([])
    setSelectedPriorities([])
    setSelectedStatuses([])
    setSelectedServices([])
    setSearchQuery('')
  }

  const activeFiltersCount = selectedEnvironments.length + selectedTypes.length + 
    selectedPriorities.length + selectedStatuses.length + selectedServices.length

  const riskContext = useMemo(() => buildRiskContext(events, (catalogData?.catalogs ?? []) as Catalog[]), [events, catalogData])

  const activeFilterTags = useMemo(() => ([
    ...selectedTypes.map((type) => ({ key: `type-${type}`, label: `Type: ${getEventTypeLabel(type)}`, onRemove: () => toggleFilter(type, selectedTypes, setSelectedTypes) })),
    ...selectedEnvironments.map((env) => ({ key: `environment-${env}`, label: `Environment: ${getEnvironmentLabel(env)}`, onRemove: () => toggleFilter(env, selectedEnvironments, setSelectedEnvironments) })),
    ...selectedPriorities.map((priority) => ({ key: `priority-${priority}`, label: `Priority: ${getPriorityLabel(priority)}`, onRemove: () => toggleFilter(priority, selectedPriorities, setSelectedPriorities) })),
    ...selectedStatuses.map((status) => ({ key: `status-${status}`, label: `Status: ${getStatusLabel(status)}`, onRemove: () => toggleFilter(status, selectedStatuses, setSelectedStatuses) })),
    ...selectedServices.map((service) => ({ key: `service-${service}`, label: `Service: ${service}`, onRemove: () => toggleFilter(service, selectedServices, setSelectedServices) })),
  ]), [selectedTypes, selectedEnvironments, selectedPriorities, selectedStatuses, selectedServices])

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

  const getTypePalette = (type?: string) => {
    const t = String(type || '').toLowerCase()
    if (t === 'deployment' || t === '1') return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
    if (t === 'operation' || t === '2') return { bg: '#F3EEFF', text: '#5B3AAE', border: '#D9CCFF' }
    if (t === 'incident' || t === '4') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (t === 'drift' || t === '3') return { bg: '#EAFBFA', text: '#0F766E', border: '#BDECE8' }
    if (t === 'rpa_usage' || t === '5') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  }

  const getPriorityPalette = (priority?: string) => {
    const p = String(priority || '').toLowerCase()
    if (p === 'p1' || p === '1') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
    if (p === 'p2' || p === '2') return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0' }
    if (p === 'p3' || p === '3') return { bg: '#FDFCE8', text: '#6B6000', border: '#F0EA90' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  }

  const getStatusPalette = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (s === 'success' || s === '3' || s === 'done' || s === '11') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
    if (s === 'failure' || s === '2' || s === 'error' || s === '5') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
    if (s === 'start' || s === '1' || s === 'in_progress' || s === '12') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
  }

  const sidebarSections = [
    {
      title: 'Event Type',
      options: uniqueTypes.map((type) => {
        const value = String(type)
        const checked = selectedTypes.includes(value)
        return {
          key: `type-${value}`,
          label: getEventTypeLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedTypes, setSelectedTypes),
          palette: getTypePalette(value),
        }
      }),
    },
    {
      title: 'Environment',
      options: uniqueEnvironments.map((env) => {
        const value = String(env)
        const checked = selectedEnvironments.includes(value)
        return {
          key: `environment-${value}`,
          label: getEnvironmentLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedEnvironments, setSelectedEnvironments),
          palette: getEnvironmentBadgeStyle(value),
        }
      }),
    },
    {
      title: 'Priority',
      options: uniquePriorities.map((priority) => {
        const value = String(priority)
        const checked = selectedPriorities.includes(value)
        return {
          key: `priority-${value}`,
          label: getPriorityLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedPriorities, setSelectedPriorities),
          palette: getPriorityPalette(value),
        }
      }),
    },
    {
      title: 'Status',
      options: uniqueStatuses.map((status) => {
        const value = String(status)
        const checked = selectedStatuses.includes(value)
        return {
          key: `status-${value}`,
          label: getStatusLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedStatuses, setSelectedStatuses),
          palette: getStatusPalette(value),
        }
      }),
    },
  ]

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="flex h-screen overflow-hidden gap-4 p-4" style={{ background: 'rgb(var(--hud-bg))' }}>{/* Removed extra padding/borders */}
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <FiltersSidebar
          activeFiltersCount={activeFiltersCount}
          onClearAllFilters={clearAllFilters}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sections={sidebarSections}
          serviceFilter={{
            title: 'Service',
            searchQuery: serviceSearchQuery,
            onSearchQueryChange: setServiceSearchQuery,
            options: filteredCatalogServices.map((service) => ({
              key: `service-${service}`,
              label: service,
              checked: selectedServices.includes(service),
              onToggle: () => toggleFilter(service, selectedServices, setSelectedServices),
            })),
            emptyText: 'No services found',
            noDataText: 'No services',
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0">
        {/* Top Bar */}
        <div>
          <PageFiltersHeader
            title="Events Timeline"
            subtitle={`${events.length} event${events.length > 1 ? 's' : ''}${activeFiltersCount > 0 ? ` • ${activeFiltersCount} active` : ''}`}
            filterCount={activeFiltersCount}
            isSidebarOpen={showSidebar}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onClearAllFilters={clearAllFilters}
            tags={activeFilterTags}
          />
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
              {activeFiltersCount > 0 && (
                <Button onClick={clearAllFilters}>Clear All Filters</Button>
              )}
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
                      const risk = assessAppEvent(event, riskContext)
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
                            <div className="shrink-0 w-[104px] flex items-center justify-start">
                              <RiskScoreBadge level={risk.level} score={risk.score} />
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
          riskContext={riskContext}
        />
      )}
    </div>
  )
}
