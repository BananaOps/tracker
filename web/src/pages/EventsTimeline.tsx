import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, subDays, startOfDay, endOfDay, subHours, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import type { Event } from '../types/api'
import { 
  Filter, X, ArrowUp, ArrowDown, Calendar, ChevronLeft, 
  ChevronRight, CheckCircle, Search, SlidersHorizontal, Clock 
} from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel, isEventApproved } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

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

export default function EventsTimeline() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('Last 7 days')
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
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
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
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
      if (!event.metadata?.createdAt) return false
      const eventDate = new Date(event.metadata.createdAt)
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
      const dateA = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0
      const dateB = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return sorted
  }, [allEvents, startDate, endDate, searchQuery, selectedEnvironments, selectedTypes, selectedPriorities, selectedStatuses, selectedServices, sortOrder])

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
      if (!event.metadata?.createdAt) return
      const createdAt = new Date(event.metadata.createdAt)
      const groupKey = format(createdAt, 'yyyy-MM-dd')

      if (!groups[groupKey]) {
        const label = isToday(createdAt)
          ? `Today — ${format(createdAt, 'MMM dd', { locale: enUS })}`
          : isYesterday(createdAt)
            ? `Yesterday — ${format(createdAt, 'MMM dd', { locale: enUS })}`
            : format(createdAt, 'MMM dd, yyyy', { locale: enUS })

        groups[groupKey] = {
          label,
          sortKey: createdAt.getTime(),
          events: [],
        }
      }

      groups[groupKey].events.push(event)
    })

    return Object.values(groups).sort((a, b) => b.sortKey - a.sortKey)
  }, [events])

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

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="flex h-screen overflow-hidden">{/* Removed extra padding/borders */}
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0" style={{ background: 'rgb(var(--hud-surface))' }}>
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700" style={{ background: 'rgb(var(--hud-surface-high))' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </h3>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filters Content */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {/* Event Type Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Event Type
                </h4>
                <div className="space-y-2">
                  {uniqueTypes.map(type => (
                    <label
                      key={type}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedTypes.includes(String(type)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedTypes.includes(String(type))
                        const pal = getTypePalette(String(type))
                        return (
                          <div
                            onClick={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" style={{ color: selectedTypes.includes(String(type)) ? getTypePalette(String(type)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getEventTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Environment Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Environment
                </h4>
                <div className="space-y-2">
                  {uniqueEnvironments.map(env => (
                    <label
                      key={env}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedEnvironments.includes(String(env)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedEnvironments.includes(String(env))
                        const pal = getEnvironmentBadgeStyle(String(env))
                        return (
                          <div
                            onClick={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" style={{ color: selectedEnvironments.includes(String(env)) ? getEnvironmentBadgeStyle(String(env)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getEnvironmentLabel(env)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Priority Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Priority
                </h4>
                <div className="space-y-2">
                  {uniquePriorities.map(priority => (
                    <label
                      key={priority}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedPriorities.includes(String(priority)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedPriorities.includes(String(priority))
                        const pal = getPriorityPalette(String(priority))
                        return (
                          <div
                            onClick={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" style={{ color: selectedPriorities.includes(String(priority)) ? getPriorityPalette(String(priority)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getPriorityLabel(priority)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Status
                </h4>
                <div className="space-y-2">
                  {uniqueStatuses.map(status => (
                    <label
                      key={status}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedStatuses.includes(String(status)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedStatuses.includes(String(status))
                        const pal = getStatusPalette(String(status))
                        return (
                          <div
                            onClick={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" style={{ color: selectedStatuses.includes(String(status)) ? getStatusPalette(String(status)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getStatusLabel(status)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Service Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Service
                </h4>
                {catalogServices.length > 0 ? (
                  <div className="space-y-3">
                    {/* Service Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <Input
                        placeholder="Search services..."
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                      {serviceSearchQuery && (
                        <button
                          onClick={() => setServiceSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Services List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredCatalogServices.length > 0 ? (
                        filteredCatalogServices.map(service => (
                          <label
                            key={service}
                            className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                            style={{ background: selectedServices.includes(service) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                          >
                            {(() => {
                              const checked = selectedServices.includes(service)
                              return (
                                <div
                                  onClick={() => toggleFilter(service, selectedServices, setSelectedServices)}
                                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{ background: checked ? 'rgb(var(--hud-primary) / 0.18)' : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? 'rgb(var(--hud-primary) / 0.6)' : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                                >
                                  {checked && <div className="w-2 h-2 rounded-sm" style={{ background: 'rgb(var(--hud-primary))' }} />}
                                </div>
                              )
                            })()}
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 truncate" style={{ color: selectedServices.includes(service) ? 'rgb(var(--hud-primary))' : 'rgb(var(--hud-on-surface))' }} title={service}>
                              {service}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">No services found</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No services</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="p-4" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.25)', background: '#EEF1F8' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-9 w-9"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--hud-on-surface))' }}>Events Timeline</h2>
                <p className="text-sm" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                  {events.length} event{events.length > 1 ? 's' : ''}
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedTypes.map(type => (
                <Badge key={type} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getEventTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </Badge>
              ))}
              {selectedEnvironments.map(env => (
                <Badge key={env} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getEnvironmentLabel(env)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(env, selectedEnvironments, setSelectedEnvironments)} />
                </Badge>
              ))}
              {selectedPriorities.map(priority => (
                <Badge key={priority} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getPriorityLabel(priority)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(priority, selectedPriorities, setSelectedPriorities)} />
                </Badge>
              ))}
              {selectedStatuses.map(status => (
                <Badge key={status} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getStatusLabel(status)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)} />
                </Badge>
              ))}
              {selectedServices.map(service => (
                <Badge key={service} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {service}
                  <X className="w-3 h-3" onClick={() => toggleFilter(service, selectedServices, setSelectedServices)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3" style={{ background: 'rgb(var(--hud-surface))', borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
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
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.12)', background: 'rgb(var(--hud-bg))' }}>
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
        <ScrollArea className="flex-1 p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-4" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>No events found</p>
              {activeFiltersCount > 0 && (
                <Button onClick={clearAllFilters}>Clear All Filters</Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
                                <i className={`fa-solid ${statusIconClass} text-[11px]`} />
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
                                <i className="fa-solid fa-meteor text-[11px]" />
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
                                {event.metadata?.createdAt ? format(new Date(event.metadata.createdAt), 'HH:mm', { locale: enUS }) : '--:--'}
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
