import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, subDays, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Status, Priority, EventType, Environment } from '../types/api'
import { Clock, AlertCircle, CheckCircle, XCircle, Filter, X } from 'lucide-react'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from '../components/EventLinks'
import { useState, useMemo } from 'react'

type TimeFilter = 7 | 15 | 30 | 'all'

export default function EventsTimeline() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  
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
      if (timeFilter !== 'all') {
        if (!event.metadata?.createdAt) return false
        const eventDate = new Date(event.metadata.createdAt)
        const filterDate = subDays(new Date(), timeFilter)
        if (!isAfter(eventDate, filterDate)) return false
      }

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
    
    return filtered
  }, [allEvents, timeFilter, selectedEnvironments, selectedTypes, selectedPriorities, selectedStatuses, selectedServices])

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

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case Status.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case Status.FAILURE:
      case Status.ERROR:
        return <XCircle className="w-5 h-5 text-red-500" />
      case Status.START:
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Timeline des événements</h2>
          <p className="mt-1 text-sm text-gray-500">
            Historique chronologique ({events.length} événement{events.length > 1 ? 's' : ''})
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-primary-600 font-medium">
                • {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white text-primary-600 rounded-full font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeFilter(7)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 7
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setTimeFilter(15)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 15
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              15 jours
            </button>
            <button
              onClick={() => setTimeFilter(30)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 30
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tout
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Effacer tous les filtres</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Filtre Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Type d'événement</h4>
              <div className="space-y-2">
                {uniqueTypes.map(type => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(String(type))}
                      onChange={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{getEventTypeLabel(type)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Environnement */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Environnement</h4>
              <div className="space-y-2">
                {uniqueEnvironments.map(env => (
                  <label key={env} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEnvironments.includes(String(env))}
                      onChange={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{getEnvironmentLabel(env)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Priorité */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Priorité</h4>
              <div className="space-y-2">
                {uniquePriorities.map(priority => (
                  <label key={priority} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(String(priority))}
                      onChange={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{getPriorityLabel(priority)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
              <div className="space-y-2">
                {uniqueStatuses.map(status => (
                  <label key={status} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(String(status))}
                      onChange={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{getStatusLabel(status)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Service (depuis le catalogue) */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Service (Catalogue)
                {catalogLoading && <span className="ml-2 text-xs text-gray-500">Chargement...</span>}
              </h4>
              {catalogServices.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {catalogServices.map(service => (
                    <label key={service} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleFilter(service, selectedServices, setSelectedServices)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 truncate" title={service}>{service}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun service dans le catalogue</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {events.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-lg">Aucun événement trouvé avec les filtres sélectionnés</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Effacer tous les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6" key={`timeline-${events.length}-${activeFiltersCount}`}>
              {events.map((event, index) => {
                if (index === 0) {
                  console.log('🎨 Rendu de', events.length, 'événements dans la timeline')
                }
                const typeColor = getEventTypeColor(event.attributes.type)
                return (
              <div key={event.metadata?.id} className="relative flex items-start space-x-4">
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 bg-white border-2 ${typeColor.border} rounded-full`}>
                  {getEventTypeIcon(event.attributes.type, 'w-6 h-6')}
                </div>
                
                <div className="flex-1 card">
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
                      
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.attributes.message}</p>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>Service: <span className="font-medium">{event.attributes.service}</span></span>
                        <span className="flex items-center space-x-1">
                          <span>Source:</span>
                          <SourceIcon source={event.attributes.source} />
                          <span className="font-medium">{event.attributes.source}</span>
                        </span>
                        {event.attributes.owner && (
                          <span>Owner: <span className="font-medium">{event.attributes.owner}</span></span>
                        )}
                      </div>

                      <EventLinks 
                        links={event.links}
                        source={event.attributes.source}
                        slackId={event.metadata?.slackId}
                        className="mt-3"
                      />
                    </div>
                    
                    <div className="text-right text-sm text-gray-500">
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
    </div>
  )
}
