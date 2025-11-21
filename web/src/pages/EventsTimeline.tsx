import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, subDays, isAfter, addDays, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import type { Event } from '../types/api'
import { Filter, X, Plus, ArrowUp, ArrowDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { useState, useMemo } from 'react'

export default function EventsTimeline() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDays, setSelectedDays] = useState<number>(7)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
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

  // Extraire les services du catalogue
  const catalogServices = useMemo(() => {
    return catalogs.map(c => c.name).sort()
  }, [catalogs])

  const uniqueEnvironments = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.environment).filter(Boolean))).sort()
  }, [allEvents])

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.type))).sort()
  }, [allEvents])

  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.priority))).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.status))).sort()
  }, [allEvents])

  // Calculer la période d'analyse
  const startDate = startOfDay(subDays(currentDate, selectedDays - 1))
  const endDate = endOfDay(currentDate)

  // Navigation temporelle
  const goToPreviousPeriod = () => {
    setCurrentDate(subDays(currentDate, selectedDays))
  }

  const goToNextPeriod = () => {
    setCurrentDate(addDays(currentDate, selectedDays))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // Filtrer les événements
  const events = useMemo(() => {
    const hasActiveFilters = selectedEnvironments.length > 0 || selectedTypes.length > 0 || 
      selectedPriorities.length > 0 || selectedStatuses.length > 0 || selectedServices.length > 0

    if (hasActiveFilters) {
      console.log('🔍 Filtrage actif:', {
        environments: selectedEnvironments,
        types: selectedTypes,
        priorities: selectedPriorities,
        statuses: selectedStatuses,
        services: selectedServices,
      })
    }

    const filtered = allEvents.filter(event => {
      // Filtre par période
      if (!event.metadata?.createdAt) return false
      const eventDate = new Date(event.metadata.createdAt)
      if (eventDate < startDate || eventDate > endDate) return false

      // Filtre par environnement
      if (selectedEnvironments.length > 0) {
        const eventEnv = String(event.attributes.environment || '').toLowerCase()
        const hasMatch = selectedEnvironments.some(env => env.toLowerCase() === eventEnv)
        if (!hasMatch) return false
      }

      // Filtre par type
      if (selectedTypes.length > 0) {
        const eventType = String(event.attributes.type || '').toLowerCase()
        const hasMatch = selectedTypes.some(type => type.toLowerCase() === eventType)
        if (!hasMatch) return false
      }

      // Filtre par priorité
      if (selectedPriorities.length > 0) {
        const eventPriority = String(event.attributes.priority || '').toLowerCase()
        const hasMatch = selectedPriorities.some(priority => priority.toLowerCase() === eventPriority)
        if (!hasMatch) return false
      }

      // Filtre par status
      if (selectedStatuses.length > 0) {
        const eventStatus = String(event.attributes.status || '').toLowerCase()
        const hasMatch = selectedStatuses.some(status => status.toLowerCase() === eventStatus)
        if (!hasMatch) return false
      }

      // Filtre par service
      if (selectedServices.length > 0) {
        if (!selectedServices.includes(event.attributes.service)) return false
      }

      return true
    })

    if (hasActiveFilters) {
      console.log('✅ Résultat:', filtered.length, '/', allEvents.length, 'événements')
    }
    
    // Trier les événements par date
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0
      const dateB = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return sorted
  }, [allEvents, startDate, endDate, selectedEnvironments, selectedTypes, selectedPriorities, selectedStatuses, selectedServices, sortOrder])

  // Fonctions pour gérer les filtres
  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    console.log('🔄 Toggle filter:', value, 'currently selected:', selected)
    if (selected.includes(value)) {
      const newSelected = selected.filter(v => v !== value)
      console.log('➖ Removing:', value, '→', newSelected)
      setter(newSelected)
    } else {
      const newSelected = [...selected, value]
      console.log('➕ Adding:', value, '→', newSelected)
      setter(newSelected)
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

  // Removed unused getStatusIcon function

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events Timeline</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Chronological History ({events.length} event{events.length > 1 ? 's' : ''})
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-primary-600 font-medium">
                • {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link to="/events/create" className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            <span className="text-sm">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 text-primary-600 rounded-full font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contrôles de navigation temporelle */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={goToPreviousPeriod} 
              className="btn-secondary p-2"
              title="Previous period"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              disabled={isToday}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isToday
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'btn-secondary'
              }`}
              title="Go to today"
            >
              Today
            </button>
            <button 
              onClick={goToNextPeriod} 
              className="btn-secondary p-2"
              title="Next period"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Filters</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Filtre Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</h4>
              <div className="space-y-2">
                {uniqueTypes.map(type => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(String(type))}
                      onChange={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getEventTypeLabel(type)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Environnement */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</h4>
              <div className="space-y-2">
                {uniqueEnvironments.map(env => (
                  <label key={env} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEnvironments.includes(String(env))}
                      onChange={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getEnvironmentLabel(env)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Priorité */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</h4>
              <div className="space-y-2">
                {uniquePriorities.map(priority => (
                  <label key={priority} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(String(priority))}
                      onChange={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getPriorityLabel(priority)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h4>
              <div className="space-y-2">
                {uniqueStatuses.map(status => (
                  <label key={status} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(String(status))}
                      onChange={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getStatusLabel(status)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Service (depuis le catalogue) */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service (Catalog)
                {catalogLoading && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Loading...</span>}
              </h4>
              {catalogServices.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {catalogServices.map(service => (
                    <label key={service} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleFilter(service, selectedServices, setSelectedServices)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={service}>{service}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No services in catalog</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {events.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No events found with selected filters</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            <div className="space-y-6" key={`timeline-${events.length}-${activeFiltersCount}`}>
              {events.map((event, index) => {
                if (index === 0) {
                  console.log('🎨 Rendu de', events.length, 'événements dans la timeline')
                }
                const typeColor = getEventTypeColor(event.attributes.type)
                return (
              <div key={event.metadata?.id} className="relative flex items-start space-x-4">
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 border-2 ${typeColor.border} rounded-full`}>
                  {getEventTypeIcon(event.attributes.type, 'w-6 h-6')}
                </div>
                
                <div 
                  className="flex-1 card cursor-pointer hover:shadow-md transition-shadow"
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
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{event.title}</h3>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{event.attributes.message}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 dark:text-gray-400">Service:</span>
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-xs font-semibold">
                            {event.attributes.service}
                          </span>
                        </div>
                        <span className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                          <span>Source:</span>
                          <SourceIcon source={event.attributes.source} />
                          <span className="font-medium">{event.attributes.source}</span>
                        </span>
                        {event.attributes.owner && (
                          <span className="text-gray-500 dark:text-gray-400">Owner: <span className="font-medium text-gray-700 dark:text-gray-300">{event.attributes.owner}</span></span>
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
          </>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
