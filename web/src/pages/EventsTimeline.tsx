import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, subDays, addDays, startOfDay, endOfDay, subHours, subMinutes, startOfHour } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import type { Event } from '../types/api'
import { 
  Filter, X, Plus, ArrowUp, ArrowDown, Calendar, ChevronLeft, 
  ChevronRight, CheckCircle, Search, SlidersHorizontal, Clock 
} from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor, isEventApproved } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [showSidebar, setShowSidebar] = useState(true)
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
    queryKey: ['events', 'list'],
    queryFn: () => eventsApi.list({ perPage: 500 }),
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const allEvents = data?.events || []
  const catalogs = catalogData?.catalogs || []

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
    const filtered = allEvents.filter(event => {
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

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="flex h-screen overflow-hidden">{/* Removed extra padding/borders */}
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
                    <label key={type} className="flex items-center space-x-2 cursor-pointer group">
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Environment
                </h4>
                <div className="space-y-2">
                  {uniqueEnvironments.map(env => (
                    <label key={env} className="flex items-center space-x-2 cursor-pointer group">
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Priority
                </h4>
                <div className="space-y-2">
                  {uniquePriorities.map(priority => (
                    <label key={priority} className="flex items-center space-x-2 cursor-pointer group">
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Status
                </h4>
                <div className="space-y-2">
                  {uniqueStatuses.map(status => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer group">
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Events Timeline</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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

        {/* Time Controls Bar - Datadog Style */}
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
                  {/* Quick Ranges */}
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

                  {/* Custom Range */}
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

            {/* Center: Date Display */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                {format(startDate, 'MMM dd, HH:mm', { locale: fr })} - {format(endDate, 'MMM dd, HH:mm', { locale: fr })}
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2">
              <Link to="/events/create">
                <Button size="sm" className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" />
                  Create Event
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="h-7 gap-1 text-xs"
              >
                {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              </Button>
            </div>
          </div>
        </div>

        {/* Events List */}
        <ScrollArea className="flex-1 p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No events found</p>
              {activeFiltersCount > 0 && (
                <Button onClick={clearAllFilters}>Clear All Filters</Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              <div className="space-y-6">
                {events.map((event) => {
                  const typeColor = getEventTypeColor(event.attributes.type)
                  return (
                    <div key={event.metadata?.id} className="relative flex items-start space-x-4">
                      <div className={`relative z-10 flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 border-2 ${typeColor.border} rounded-full`}>
                        {getEventTypeIcon(event.attributes.type, 'w-6 h-6')}
                      </div>
                      
                      <div 
                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-500 transition-all"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${typeColor.bg} ${typeColor.text}`}>
                                {getEventTypeIcon(event.attributes.type, 'w-3 h-3')}
                                <span>{getEventTypeLabel(event.attributes.type)}</span>
                              </span>
                              {event.attributes.environment && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEnvironmentColor(event.attributes.environment).bg} ${getEnvironmentColor(event.attributes.environment).text}`}>
                                  {getEnvironmentLabel(event.attributes.environment)}
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(event.attributes.priority).bg} ${getPriorityColor(event.attributes.priority).text}`}>
                                {getPriorityLabel(event.attributes.priority)}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.attributes.status).bg} ${getStatusColor(event.attributes.status).text}`}>
                                {getStatusLabel(event.attributes.status)}
                              </span>
                              {isEventApproved(event) && (
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Approved
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words mb-2">{event.title}</h3>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{event.attributes.message}</p>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-3 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500 dark:text-gray-400">Service:</span>
                                <Badge variant="outline" className="font-mono">
                                  {event.attributes.service}
                                </Badge>
                              </div>
                              <span className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                                <span>Source:</span>
                                <SourceIcon source={event.attributes.source} />
                                <span className="font-medium">{event.attributes.source}</span>
                              </span>
                              {event.attributes.owner && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  Owner: <span className="font-medium text-gray-700 dark:text-gray-300">{event.attributes.owner}</span>
                                </span>
                              )}
                            </div>

                            <EventLinks 
                              links={event.links}
                              source={event.attributes.source}
                              slackId={event.metadata?.slackId}
                              className="mt-3"
                            />
                          </div>
                          
                          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                            {event.metadata?.createdAt && (
                              <time>
                                {format(new Date(event.metadata.createdAt), 'PPp', { locale: fr })}
                              </time>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
