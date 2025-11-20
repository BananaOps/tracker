import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Filter, X, Plus } from 'lucide-react'
// import { Status, EventType } from '../types/api'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'

export default function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // États des filtres
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const { data } = useQuery({
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

  // Extraire les valeurs uniques pour les filtres
  const uniqueEnvironments = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.environment).filter(Boolean))).sort()
  }, [allEvents])

  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.priority))).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.status))).sort()
  }, [allEvents])

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.attributes.type))).sort()
  }, [allEvents])

  // Filtrer les événements
  const events = useMemo(() => {
    return allEvents.filter(event => {
      // Filtre par environnement
      if (selectedEnvironments.length > 0) {
        const eventEnv = String(event.attributes.environment || '').toLowerCase()
        const hasMatch = selectedEnvironments.some(env => env.toLowerCase() === eventEnv)
        if (!hasMatch) return false
      }

      // Filtre par service
      if (selectedServices.length > 0) {
        if (!selectedServices.includes(event.attributes.service)) return false
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

      // Filtre par type
      if (selectedTypes.length > 0) {
        const eventType = String(event.attributes.type || '').toLowerCase()
        const hasMatch = selectedTypes.some(type => type.toLowerCase() === eventType)
        if (!hasMatch) return false
      }

      return true
    })
  }, [allEvents, selectedEnvironments, selectedServices, selectedPriorities, selectedStatuses, selectedTypes])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      // Utiliser startDate si disponible, sinon createdAt
      const startDateStr = event.attributes.startDate || event.metadata?.createdAt
      if (!startDateStr) return false
      
      const startDate = new Date(startDateStr)
      const endDateStr = event.attributes.endDate
      const endDate = endDateStr ? new Date(endDateStr) : startDate
      
      // Vérifier si le jour est dans la période de l'événement
      return isWithinInterval(day, { start: startOfDay(startDate), end: endOfDay(endDate) })
    })
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

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
    setSelectedServices([])
    setSelectedPriorities([])
    setSelectedStatuses([])
    setSelectedTypes([])
  }

  const activeFiltersCount = selectedEnvironments.length + selectedServices.length + 
    selectedPriorities.length + selectedStatuses.length + selectedTypes.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events Calendar</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monthly View ({events.length} event{events.length > 1 ? 's' : ''})
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
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 text-primary-600 rounded-full font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Filtre Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'événement</h4>
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
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environnement</h4>
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
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorité</h4>
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
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service (Catalogue)
                {catalogLoading && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Chargement...</span>}
              </h4>
              {catalogServices.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucun service dans le catalogue</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h3>
            <div className="flex space-x-2">
              <button onClick={previousMonth} className="btn-secondary p-2">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="btn-secondary p-2">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}

            {daysInMonth.map(day => {
              const dayEvents = getEventsForDay(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-[80px] p-2 rounded-lg border transition-colors
                    ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                    ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, idx) => {
                        const typeColor = getEventTypeColor(event.attributes.type)
                        return (
                          <div
                            key={idx}
                            className={`text-xs px-1 py-0.5 rounded truncate flex items-center space-x-1 ${typeColor.bg} ${typeColor.text}`}
                          >
                            {getEventTypeIcon(event.attributes.type, 'w-2.5 h-2.5 flex-shrink-0')}
                            <span className="truncate">{event.title}</span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : 'Select a Date'}
          </h3>
          
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map(event => {
                const typeColor = getEventTypeColor(event.attributes.type)
                return (
                  <div 
                    key={event.metadata?.id} 
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {getEventTypeIcon(event.attributes.type, 'w-4 h-4')}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColor.bg} ${typeColor.text}`}>
                        {getEventTypeLabel(event.attributes.type)}
                      </span>
                      {event.attributes.environment && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getEnvironmentColor(event.attributes.environment).bg} ${getEnvironmentColor(event.attributes.environment).text}`}>
                          {getEnvironmentLabel(event.attributes.environment)}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(event.attributes.priority).bg} ${getPriorityColor(event.attributes.priority).text}`}>
                        {getPriorityLabel(event.attributes.priority)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(event.attributes.status).bg} ${getStatusColor(event.attributes.status).text}`}>
                        {getStatusLabel(event.attributes.status)}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{event.attributes.service}</p>
                    {(() => {
                      console.log('Calendar event:', event.title, 'links:', event.links)
                      return (
                        <EventLinks 
                          links={event.links}
                          source={event.attributes.source}
                          slackId={event.metadata?.slackId}
                          className="mt-2"
                        />
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No events for this date</p>
          )}
        </div>
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
