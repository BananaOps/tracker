import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, addDays, isWithinInterval, isSameDay, startOfDay, endOfDay, addHours, getHours, subDays, subHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Package, Globe, Filter, X, Calendar, Clock, ChevronDown, AlertTriangle, Search, SlidersHorizontal } from 'lucide-react'
import type { Event } from '../types/api'
import { getEnvironmentLabel, getEventTypeLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

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
  const [showSidebar, setShowSidebar] = useState(true)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('Last 7 days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')
  
  // États des filtres
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])

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

  // Extraire les valeurs uniques pour les filtres
  const catalogServices = useMemo(() => {
    return catalogs.map(c => c.name).sort()
  }, [catalogs])

  const filteredCatalogServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return catalogServices
    const query = serviceSearchQuery.toLowerCase()
    return catalogServices.filter(service => service.toLowerCase().includes(query))
  }, [catalogServices, serviceSearchQuery])

  const uniqueEnvironments = useMemo(() => {
    const invalidValues = ['environment', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map(e => e.attributes.environment)
          .filter(env => env && !invalidValues.includes(env.toLowerCase().trim()))
      )
    ).sort()
  }, [allEvents])

  const uniqueTypes = useMemo(() => {
    const invalidValues = ['event', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map(e => e.attributes.type)
          .filter(type => type && !invalidValues.includes(type.toLowerCase().trim()))
      )
    ).sort()
  }, [allEvents])

  const uniquePriorities = useMemo(() => {
    const invalidValues = ['priority', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map(e => e.attributes.priority)
          .filter(priority => priority && !invalidValues.includes(priority.toLowerCase().trim()))
      )
    ).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo(() => {
    const invalidValues = ['status', 'unspecified', 'unknown', '']
    return Array.from(
      new Set(
        allEvents
          .map(e => e.attributes.status)
          .filter(status => status && !invalidValues.includes(status.toLowerCase().trim()))
      )
    ).sort()
  }, [allEvents])

  // Appliquer les filtres
  const events = useMemo(() => {
    return allEvents.filter(event => {
      if (selectedEnvironments.length > 0) {
        const eventEnv = String(event.attributes.environment || '').toLowerCase()
        if (!selectedEnvironments.some(env => env.toLowerCase() === eventEnv)) return false
      }

      if (selectedTypes.length > 0) {
        const eventType = String(event.attributes.type || '').toLowerCase()
        if (!selectedTypes.some(type => type.toLowerCase() === eventType)) return false
      }

      if (selectedPriorities.length > 0) {
        const eventPriority = String(event.attributes.priority || '').toLowerCase()
        if (!selectedPriorities.some(priority => priority.toLowerCase() === eventPriority)) return false
      }

      if (selectedStatuses.length > 0) {
        const eventStatus = String(event.attributes.status || '').toLowerCase()
        if (!selectedStatuses.some(status => status.toLowerCase() === eventStatus)) return false
      }

      if (selectedServices.length > 0) {
        if (!selectedServices.includes(event.attributes.service)) return false
      }

      return true
    })
  }, [allEvents, selectedEnvironments, selectedTypes, selectedPriorities, selectedStatuses, selectedServices])

  // Calculer la période affichée basée sur les dates sélectionnées
  const today = new Date()
  const dayStart = startOfDay(startDate)
  const dayEnd = endOfDay(endDate)
  
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
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    
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
  }, [events, groupBy, startDate, endDate])

  // Fonctions pour gérer les filtres
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
  }

  const activeFiltersCount = selectedEnvironments.length + selectedTypes.length + 
    selectedPriorities.length + selectedStatuses.length + selectedServices.length

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

  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'rgb(var(--hud-bg))' }}>
        <div className="text-sm font-medium" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Loading…</div>
      </div>
    )
  }

  const sortedGroups = Object.keys(groupedEvents).sort((a, b) => 
    groupedEvents[b].length - groupedEvents[a].length
  )

  const getEventHexColor = (type: string) => {
    const t = String(type).toLowerCase()
    if (t === 'deployment' || t === '1') return '#40ceed'
    if (t === 'incident'   || t === '4') return '#ff6e84'
    if (t === 'drift'      || t === '3') return '#f5c842'
    if (t === 'operation'  || t === '2') return '#bd9dff'
    if (t === 'rpa_usage'  || t === '5') return '#818cf8'
    return '#a78bfa'
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
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg, color: T.onSurface }}>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 flex flex-col shrink-0" style={{ background: T.surfaceLow, borderRight: `1px solid ${a('outline-var', 0.15)}` }}>

          {/* Sidebar Header */}
          <div className="p-4" style={{ borderBottom: `1px solid ${a('outline-var', 0.12)}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: T.onSurface }}>
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </h3>
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs font-medium" style={{ color: T.primary }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filters scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">

            {/* Event Type */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Event Type</div>
              <div className="space-y-2">
                {uniqueTypes.map(type => {
                  const checked = selectedTypes.includes(String(type))
                  const color = getEventHexColor(String(type))
                  return (
                    <label key={String(type)} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: checked ? color : a('outline-var', 0.1),
                          border: `1.5px solid ${checked ? color : a('outline-var', 0.4)}`
                        }}
                      >
                        {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span className="text-sm" style={{ color: T.onSurface }}>{getEventTypeLabel(String(type))}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid ' + a('outline-var', 0.12) }} />

            {/* Environment */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Environment</div>
              <div className="space-y-2">
                {uniqueEnvironments.map(env => {
                  const checked = selectedEnvironments.includes(String(env))
                  return (
                    <label key={String(env)} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: checked ? T.primary : a('outline-var', 0.1),
                          border: `1.5px solid ${checked ? T.primary : a('outline-var', 0.4)}`
                        }}
                      >
                        {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span className="text-sm" style={{ color: T.onSurface }}>{getEnvironmentLabel(String(env))}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid ' + a('outline-var', 0.12) }} />

            {/* Priority */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Priority</div>
              <div className="space-y-2">
                {uniquePriorities.map(priority => {
                  const checked = selectedPriorities.includes(String(priority))
                  return (
                    <label key={String(priority)} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: checked ? T.primary : a('outline-var', 0.1),
                          border: `1.5px solid ${checked ? T.primary : a('outline-var', 0.4)}`
                        }}
                      >
                        {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span className="text-sm" style={{ color: T.onSurface }}>{getPriorityLabel(String(priority))}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid ' + a('outline-var', 0.12) }} />

            {/* Status */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Status</div>
              <div className="space-y-2">
                {uniqueStatuses.map(status => {
                  const checked = selectedStatuses.includes(String(status))
                  return (
                    <label key={String(status)} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: checked ? T.primary : a('outline-var', 0.1),
                          border: `1.5px solid ${checked ? T.primary : a('outline-var', 0.4)}`
                        }}
                      >
                        {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span className="text-sm" style={{ color: T.onSurface }}>{getStatusLabel(String(status))}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid ' + a('outline-var', 0.12) }} />

            {/* Service */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>Service</div>
              {catalogServices.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: T.onSurfaceVar }} />
                    <input
                      placeholder="Search services..."
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                      className="w-full px-7 py-1.5 rounded-lg text-xs"
                      style={{ background: a('outline-var', 0.07), color: T.onSurface, border: 'none', outline: 'none' }}
                    />
                    {serviceSearchQuery && (
                      <button
                        onClick={() => setServiceSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: T.onSurfaceVar }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredCatalogServices.length > 0 ? (
                      filteredCatalogServices.map(service => {
                        const checked = selectedServices.includes(service)
                        return (
                          <label key={service} className="flex items-center gap-2 cursor-pointer">
                            <div
                              onClick={() => toggleFilter(service, selectedServices, setSelectedServices)}
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                background: checked ? T.primary : a('outline-var', 0.1),
                                border: `1.5px solid ${checked ? T.primary : a('outline-var', 0.4)}`
                              }}
                            >
                              {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                            </div>
                            <span className="text-sm truncate" style={{ color: T.onSurface }} title={service}>{service}</span>
                          </label>
                        )
                      })
                    ) : (
                      <p className="text-xs italic" style={{ color: T.onSurfaceVar }}>No services found</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: T.onSurfaceVar }}>No services</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="px-6 py-4 flex-shrink-0" style={{ background: T.surface, borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: showSidebar ? a('primary', 0.12) : a('outline-var', 0.08),
                border: `1px solid ${showSidebar ? a('primary', 0.25) : 'transparent'}`,
                color: showSidebar ? T.primary : T.onSurfaceVar
              }}
            >
              <Filter className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.onSurface }}>
              Events Streamline
            </h2>
          </div>

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedTypes.map(type => (
                <span key={type} className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ background: a('primary', 0.12), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  {getEventTypeLabel(type)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </span>
              ))}
              {selectedEnvironments.map(env => (
                <span key={env} className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ background: a('primary', 0.12), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  {getEnvironmentLabel(env)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(env, selectedEnvironments, setSelectedEnvironments)} />
                </span>
              ))}
              {selectedPriorities.map(priority => (
                <span key={priority} className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ background: a('primary', 0.12), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  {getPriorityLabel(priority)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(priority, selectedPriorities, setSelectedPriorities)} />
                </span>
              ))}
              {selectedStatuses.map(status => (
                <span key={status} className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ background: a('primary', 0.12), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  {getStatusLabel(status)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)} />
                </span>
              ))}
              {selectedServices.map(service => (
                <span key={service} className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{ background: a('primary', 0.12), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  {service}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(service, selectedServices, setSelectedServices)} />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time Controls Bar */}
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: a('outline-var', 0.04), borderBottom: `1px solid ${a('outline-var', 0.12)}` }}>

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
                        className="w-full px-3 py-1.5 rounded-lg text-xs border-0 outline-none"
                        style={{ background: a('outline-var', 0.08), color: T.onSurface }} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: T.onSurfaceVar }}>To</label>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs border-0 outline-none"
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
              <span className="font-medium" style={{ color: T.onSurface }}>
                {format(startDate, 'MMM dd', { locale: fr })} - {format(endDate, 'MMM dd, yyyy', { locale: fr })}
              </span>
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
        <div className="flex-1 overflow-auto p-6">
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
                          {format(slot, 'EEE', { locale: fr })}
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
                              <Package className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                            ) : (
                              <Globe className="w-4 h-4 flex-shrink-0" style={{ color: T.primary }} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-semibold text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.onSurface }}>
                                  {displayName}
                                </div>
                                {hasOverlaps && (
                                  <div className="relative flex-shrink-0" title="Overlapping events detected">
                                    <AlertTriangle className="w-4 h-4 text-orange-400 animate-pulse" />
                                    <div className="absolute inset-0 animate-ping">
                                      <AlertTriangle className="w-4 h-4 text-orange-400 opacity-75" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs" style={{ color: T.onSurfaceVar }}>
                                {totalEvents} event{totalEvents > 1 ? 's' : ''}
                                {hasOverlaps && (
                                  <span className="ml-1 text-orange-400 font-medium">
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
                                  const c = getEventHexColor(event.attributes.type)

                                  return (
                                    <div
                                      key={event.metadata?.id}
                                      onClick={() => setSelectedEvent(event)}
                                      className="absolute pointer-events-auto cursor-pointer hover:opacity-90 hover:shadow-md transition-all"
                                      style={{
                                        left: '2px',
                                        right: spanCount > 1 ? `calc(-${(spanCount - 1) * 100}% - ${(spanCount - 1) * 0.5}rem + 2px)` : '2px',
                                        top: `${track * 32}px`,
                                        height: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 10,
                                        background: `${c}22`,
                                        borderLeft: `3px solid ${c}`,
                                        borderRadius: '0 6px 6px 0',
                                        padding: '0 8px',
                                      }}
                                      title={`${event.title} - ${format(startDate, 'HH:mm')} to ${format(endDate, 'HH:mm')}`}
                                    >
                                      <div className="truncate flex-1 text-xs font-semibold" style={{ color: c, fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {event.title}
                                      </div>
                                      {spanCount > 2 && viewMode === 'week' && (
                                        <div className="text-[10px] opacity-75 ml-2" style={{ color: c }}>
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
