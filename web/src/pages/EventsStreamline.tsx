import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, addDays, isWithinInterval, isSameDay, startOfDay, endOfDay, addHours, getHours, subDays, subHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Package, Globe, Filter, X, Plus, Calendar, Clock, ChevronRight, AlertTriangle, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event } from '../types/api'
import { getEventTypeColor, getEnvironmentLabel, getEventTypeLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

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

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const sortedGroups = Object.keys(groupedEvents).sort((a, b) => 
    groupedEvents[b].length - groupedEvents[a].length
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
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
                    <label key={String(type)} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedTypes.includes(String(type))}
                        onCheckedChange={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getEventTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Environment Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Environment
                </h4>
                <div className="space-y-2">
                  {uniqueEnvironments.map(env => (
                    <label key={String(env)} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedEnvironments.includes(String(env))}
                        onCheckedChange={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getEnvironmentLabel(env)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Priority Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Priority
                </h4>
                <div className="space-y-2">
                  {uniquePriorities.map(priority => (
                    <label key={String(priority)} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedPriorities.includes(String(priority))}
                        onCheckedChange={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getPriorityLabel(priority)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Status
                </h4>
                <div className="space-y-2">
                  {uniqueStatuses.map(status => (
                    <label key={String(status)} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedStatuses.includes(String(status))}
                        onCheckedChange={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getStatusLabel(status)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Service Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Service
                </h4>
                {catalogServices.length > 0 ? (
                  <div className="space-y-3">
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
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredCatalogServices.length > 0 ? (
                        filteredCatalogServices.map(service => (
                          <label key={service} className="flex items-center space-x-2 cursor-pointer group">
                            <Checkbox
                              checked={selectedServices.includes(service)}
                              onCheckedChange={() => toggleFilter(service, selectedServices, setSelectedServices)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 truncate" title={service}>
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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Events Streamline</h2>
                {activeFiltersCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedTypes.map(type => (
                <Badge key={type} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getEventTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </Badge>
              ))}
              {selectedEnvironments.map(env => (
                <Badge key={env} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getEnvironmentLabel(env)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(env, selectedEnvironments, setSelectedEnvironments)} />
                </Badge>
              ))}
              {selectedPriorities.map(priority => (
                <Badge key={priority} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getPriorityLabel(priority)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(priority, selectedPriorities, setSelectedPriorities)} />
                </Badge>
              ))}
              {selectedStatuses.map(status => (
                <Badge key={status} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getStatusLabel(status)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)} />
                </Badge>
              ))}
              {selectedServices.map(service => (
                <Badge key={service} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {service}
                  <X className="w-3 h-3" onClick={() => toggleFilter(service, selectedServices, setSelectedServices)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Time Controls Bar */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {/* Left: Time Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-2 text-xs">
                  <Clock className="w-3 h-3" />
                  {selectedTimeRange}
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

            {/* Center: Date Display & View Mode */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {format(startDate, 'MMM dd', { locale: fr })} - {format(endDate, 'MMM dd, yyyy', { locale: fr })}
                </span>
              </div>

              <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors text-xs ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">Week</span>
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors text-xs ${
                    viewMode === 'day'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">Day</span>
                </button>
              </div>
            </div>

            {/* Right: Group By & Create */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setGroupBy('service')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors text-xs ${
                    groupBy === 'service'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span className="font-medium">Service</span>
                </button>
                <button
                  onClick={() => setGroupBy('environment')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors text-xs ${
                    groupBy === 'environment'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span className="font-medium">Environment</span>
                </button>
              </div>

              <Link to="/events/create">
                <Button size="sm" className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" />
                  Create Event
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Gantt View */}
        <ScrollArea className="flex-1 p-6">
          <div className={viewMode === 'week' ? '' : 'overflow-x-auto'}>
            {/* Header avec les colonnes de temps */}
           <div className={`grid gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700`} style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                {groupBy === 'service' ? 'Service' : 'Environment'}
              </div>
              {timeSlots.map(slot => {
                const isCurrent = viewMode === 'week' ? isSameDay(slot, today) : getHours(slot) === getHours(new Date())
                return (
                  <div key={slot.toISOString()} className="text-center">
                    {viewMode === 'week' ? (
                      <>
                        <div className={`text-xs font-medium ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {format(slot, 'EEE', { locale: fr })}
                        </div>
                        <div className={`text-sm font-semibold ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {format(slot, 'dd')}
                        </div>
                      </>
                    ) : (
                      <div className={`text-xs font-medium ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {format(slot, 'HH:mm')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Lignes pour chaque groupe */}
            {sortedGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {viewMode === 'week' ? 'No events this week' : 'No events today'}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedGroups.map((groupName, groupIndex) => {
                  const displayName = groupBy === 'environment' ? getEnvironmentLabel(groupName) || groupName : groupName
                  const totalEvents = groupedEvents[groupName].length
                  const groupEventsArray = groupedEvents[groupName]

                  // Calculer les événements uniques (éviter les doublons multi-slots)
                  const uniqueEvents = groupEventsArray.filter((event, index, self) => 
                    index === self.findIndex(e => e.metadata?.id === event.metadata?.id)
                  )

                  // Fonction pour calculer les indices de slot d'un événement
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

                  // Fonction pour vérifier si deux événements se chevauchent
                  const eventsOverlap = (event1Indices: { start: number, end: number }, event2Indices: { start: number, end: number }) => {
                    return event1Indices.start <= event2Indices.end && event2Indices.start <= event1Indices.end
                  }

                  // Assigner des pistes (tracks) aux événements pour éviter les chevauchements
                  const eventsWithTracks = uniqueEvents.map(event => {
                    const indices = getEventSlotIndices(event)
                    return { event, indices, track: 0 }
                  })

                  // Algorithme de placement sur pistes
                  eventsWithTracks.forEach((eventData, index) => {
                    if (eventData.indices.start === -1) return
                    
                    // Trouver la première piste disponible
                    let track = 0
                    let trackAvailable = false
                    
                    while (!trackAvailable) {
                      trackAvailable = true
                      
                      // Vérifier si cette piste est libre
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
                  
                  // Détecter s'il y a des chevauchements (événements sur plusieurs pistes)
                  const hasOverlaps = maxTrack > 0

                  return (
                    <div key={groupName}>
                      <div className="relative">
                        {/* Grille de fond avec les cellules */}
                        <div className="grid gap-2 items-start" style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
                          {/* Nom du groupe */}
                          <div className="flex items-center space-x-2 py-2" style={{ minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}>
                            {groupBy === 'service' ? (
                              <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            ) : (
                              <Globe className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {displayName}
                                </div>
                                {hasOverlaps && (
                                  <div className="relative flex-shrink-0" title="Overlapping events detected">
                                    <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
                                    <div className="absolute inset-0 animate-ping">
                                      <AlertTriangle className="w-4 h-4 text-orange-500 opacity-75" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {totalEvents} event{totalEvents > 1 ? 's' : ''}
                                {hasOverlaps && (
                                  <span className="ml-1 text-orange-600 dark:text-orange-400 font-medium">
                                    • {maxTrack + 1} concurrent
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Cellules de fond pour chaque slot de temps */}
                          {timeSlots.map(slot => {
                            const isCurrent = viewMode === 'week' ? isSameDay(slot, today) : getHours(slot) === getHours(new Date())
                            return (
                              <div 
                                key={slot.toISOString()} 
                                className={`rounded ${
                                  isCurrent 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700' 
                                    : 'bg-gray-50 dark:bg-gray-800'
                                }`}
                                style={{ minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}
                              />
                            )
                          })}
                        </div>

                        {/* Couche des barres d'événements */}
                        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ paddingTop: '8px' }}>
                          <div className="grid gap-2" style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(${timeSlots.length}, minmax(0, 1fr))` : `200px repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
                            {/* Colonne vide pour aligner avec le nom du groupe */}
                            <div />
                            
                            {/* Conteneur pour chaque slot de temps */}
                            {timeSlots.map((slot, slotIndex) => (
                              <div key={slot.toISOString()} className="relative" style={{ minHeight: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}>
                                {/* Événements qui commencent dans ce slot */}
                                {eventsWithTracks.map(({ event, indices, track }) => {
                                  if (indices.start !== slotIndex) return null
                                  
                                  const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                                  if (!startDateStr) return null
                                  
                                  const startDate = new Date(startDateStr)
                                  const endDateStr = event.attributes.endDate
                                  const endDate = endDateStr ? new Date(endDateStr) : startDate
                                  
                                  const spanCount = indices.end - indices.start + 1
                                  const typeColor = getEventTypeColor(event.attributes.type)
                                  
                                  return (
                                    <div
                                      key={event.metadata?.id}
                                      onClick={() => setSelectedEvent(event)}
                                      className={`absolute pointer-events-auto px-3 py-1.5 rounded text-xs cursor-pointer hover:opacity-90 hover:shadow-md transition-all ${typeColor.bg} ${typeColor.text} font-medium`}
                                      style={{
                                        left: '0',
                                        right: spanCount > 1 ? `calc(-${(spanCount - 1) * 100}% - ${(spanCount - 1) * 0.5}rem)` : '0',
                                        top: `${track * 32}px`,
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 10,
                                      }}
                                      title={`${event.title} - ${format(startDate, 'HH:mm')} to ${format(endDate, 'HH:mm')}`}
                                    >
                                      <div className="truncate flex-1">{event.title}</div>
                                      {spanCount > 2 && viewMode === 'week' && (
                                        <div className="text-[10px] opacity-75 ml-2">
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
                      
                      {/* Séparateur entre les groupes */}
                      {groupIndex < sortedGroups.length - 1 && (
                        <div className="mt-3 border-t-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
