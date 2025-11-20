import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, isSameDay, startOfDay, endOfDay, addHours, getHours, addWeeks, subWeeks, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Package, Globe, Filter, X, Plus, Calendar, Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event } from '../types/api'
import { getEventTypeColor, getEnvironmentLabel, getEventTypeLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

type GroupBy = 'service' | 'environment'
type ViewMode = 'week' | 'day'

export default function EventsStreamline() {
  const [groupBy, setGroupBy] = useState<GroupBy>('service')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  
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

  // Calculer la période affichée
  const today = new Date()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lundi
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }) // Dimanche
  const dayStart = startOfDay(currentDate)
  const dayEnd = endOfDay(currentDate)
  
  // Fonctions de navigation
  const goToPreviousPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subDays(currentDate, 1))
    }
  }
  
  const goToNextPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  const isToday = viewMode === 'week' 
    ? isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }))
    : isSameDay(currentDate, today)
  
  // Générer les colonnes selon le mode
  const timeSlots = useMemo(() => {
    if (viewMode === 'week') {
      // 7 jours de la semaine
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    } else {
      // 24 heures de la journée
      return Array.from({ length: 24 }, (_, i) => addHours(dayStart, i))
    }
  }, [viewMode, weekStart, dayStart])

  // Grouper et filtrer les événements
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    const start = viewMode === 'week' ? weekStart : dayStart
    const end = viewMode === 'week' ? weekEnd : dayEnd
    
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
  }, [events, groupBy, viewMode, weekStart, weekEnd, dayStart, dayEnd])

  // Obtenir les événements pour un slot de temps et un groupe spécifique
  const getEventsForSlotAndGroup = (slot: Date, groupName: string) => {
    const groupEvents = groupedEvents[groupName] || []
    return groupEvents.filter(event => {
      // Utiliser startDate si disponible, sinon createdAt
      const startDateStr = event.attributes.startDate || event.metadata?.createdAt
      if (!startDateStr) return false
      
      const startDate = new Date(startDateStr)
      const endDateStr = event.attributes.endDate
      const endDate = endDateStr ? new Date(endDateStr) : startDate
      
      if (viewMode === 'week') {
        // Vérifier si le slot est dans la période de l'événement
        return isWithinInterval(slot, { start: startOfDay(startDate), end: endOfDay(endDate) })
      } else {
        // Pour la vue jour, vérifier si le slot (heure) est dans la période
        const slotStart = slot
        const slotEnd = addHours(slot, 1)
        
        // L'événement est visible si sa période chevauche le slot horaire
        return (
          (startDate <= slotEnd && endDate >= slotStart) ||
          isWithinInterval(slotStart, { start: startDate, end: endDate })
        )
      }
    })
  }

  // Calculer si c'est la première heure d'un événement (pour la vue jour)
  const isFirstSlotOfEvent = (event: Event, slot: Date) => {
    const startDateStr = event.attributes.startDate || event.metadata?.createdAt
    if (!startDateStr) return false
    
    const startDate = new Date(startDateStr)
    return isSameDay(slot, startDate) && getHours(slot) === getHours(startDate)
  }

  // Calculer le nombre d'heures que couvre un événement à partir d'un slot
  const getEventSpanFromSlot = (event: Event, slot: Date, slotIndex: number) => {
    const startDateStr = event.attributes.startDate || event.metadata?.createdAt
    if (!startDateStr) return 1
    
    const startDate = new Date(startDateStr)
    const endDateStr = event.attributes.endDate
    const endDate = endDateStr ? new Date(endDateStr) : startDate
    
    // Calculer combien d'heures restent à partir de ce slot
    let span = 0
    for (let i = slotIndex; i < timeSlots.length; i++) {
      const currentSlot = timeSlots[i]
      const slotStart = currentSlot
      const slotEnd = addHours(currentSlot, 1)
      
      if (startDate <= slotEnd && endDate >= slotStart) {
        span++
      } else {
        break
      }
    }
    
    return span
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events Streamline</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gantt view
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
            <span>Filters</span>
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
                  <label key={String(type)} className="flex items-center space-x-2 cursor-pointer">
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
                  <label key={String(env)} className="flex items-center space-x-2 cursor-pointer">
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
                  <label key={String(priority)} className="flex items-center space-x-2 cursor-pointer">
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
                  <label key={String(status)} className="flex items-center space-x-2 cursor-pointer">
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

            {/* Filtre Service */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service (Catalog)</h4>
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

      {/* Vue Gantt */}
      <div className="card">
        {/* Navigation temporelle dans le header de la carte */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {viewMode === 'week' ? (
              <>Week {format(weekStart, 'w', { locale: fr })} - {format(weekStart, 'dd MMM', { locale: fr })} to {format(weekEnd, 'dd MMM yyyy', { locale: fr })}</>
            ) : (
              <>{format(currentDate, 'EEEE dd MMMM yyyy', { locale: fr })}</>
            )}
          </h3>
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              <button 
                onClick={goToPreviousPeriod} 
                className="btn-secondary p-2"
                title={viewMode === 'week' ? 'Previous week' : 'Previous day'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                disabled={isToday}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                title={viewMode === 'week' ? 'Next week' : 'Next day'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Week</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">Day</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setGroupBy('service')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  groupBy === 'service'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="font-medium">Service</span>
              </button>
              <button
                onClick={() => setGroupBy('environment')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  groupBy === 'environment'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="font-medium">Environment</span>
              </button>
            </div>
          </div>
        </div>

        <div className={viewMode === 'week' ? '' : 'overflow-x-auto'}>
          {/* Header avec les colonnes de temps */}
          <div className={`grid gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700`} style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(7, 1fr)` }}>
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
                      <div className="grid gap-2 items-start" style={{ gridTemplateColumns: viewMode === 'day' ? `minmax(150px, 200px) repeat(24, minmax(0, 1fr))` : `200px repeat(7, 1fr)` }}>
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
                      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ paddingLeft: viewMode === 'day' ? '150px' : '200px', paddingTop: '8px', paddingRight: '8px' }}>
                        <div className="relative" style={{ height: `${Math.max((maxTrack + 1) * 32 + 16, 80)}px` }}>
                          {eventsWithTracks.map(({ event, indices, track }) => {
                            if (indices.start === -1) return null
                            
                            const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                            if (!startDateStr) return null
                            
                            const startDate = new Date(startDateStr)
                            const endDateStr = event.attributes.endDate
                            const endDate = endDateStr ? new Date(endDateStr) : startDate
                            
                            const spanCount = indices.end - indices.start + 1
                            const totalSlots = timeSlots.length
                            const cellWidth = 100 / totalSlots
                            const gapSize = 0.5 // gap-2 = 0.5rem = 8px
                            
                            const leftPercent = indices.start * cellWidth
                            const widthPercent = spanCount * cellWidth
                            
                            const typeColor = getEventTypeColor(event.attributes.type)
                            
                            return (
                              <div
                                key={event.metadata?.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`absolute pointer-events-auto px-3 py-1.5 rounded text-xs cursor-pointer hover:opacity-90 hover:shadow-md transition-all ${typeColor.bg} ${typeColor.text} font-medium`}
                                style={{
                                  left: `calc(${leftPercent}% + ${indices.start * gapSize}rem)`,
                                  width: `calc(${widthPercent}% - ${gapSize}rem)`,
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
