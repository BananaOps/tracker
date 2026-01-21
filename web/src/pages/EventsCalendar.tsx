import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Filter, X, Plus, AlertTriangle, Search, SlidersHorizontal } from 'lucide-react'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'

export default function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showSidebar, setShowSidebar] = useState(false) // Fermé par défaut
  const [serviceSearch, setServiceSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // États des filtres
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  // Calculer le début et la fin du mois
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  // Récupérer les événements avec une clé qui change chaque mois pour forcer le refresh
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'calendar', format(currentDate, 'yyyy-MM')],
    queryFn: () => eventsApi.list({ perPage: 1000 }),
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const allEvents = data?.events || []
  const catalogs = catalogData?.catalogs || []

  // Extraire les services du catalogue
  const catalogServices = useMemo(() => {
    return catalogs.map((c: any) => c.name).sort()
  }, [catalogs])

  // Filtrer les services par recherche
  const filteredCatalogServices = useMemo(() => {
    if (!serviceSearch) return catalogServices
    return catalogServices.filter((service: string) => 
      service.toLowerCase().includes(serviceSearch.toLowerCase())
    )
  }, [catalogServices, serviceSearch])

  // Filtrer les valeurs invalides
  const filterInvalidValues = (values: string[]) => {
    const invalidValues = ['event', 'environment', 'priority', 'status', 'unspecified', 'unknown', '']
    return values.filter(v => v && !invalidValues.includes(v.toLowerCase()))
  }

  // Extraire les valeurs uniques pour les filtres
  const uniqueEnvironments = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.environment).filter(Boolean)))
    return filterInvalidValues(values as string[]).sort()
  }, [allEvents])

  const uniquePriorities = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.priority)))
    return filterInvalidValues(values as string[]).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.status)))
    return filterInvalidValues(values as string[]).sort()
  }, [allEvents])

  const uniqueTypes = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.type)))
    return filterInvalidValues(values as string[]).sort()
  }, [allEvents])

  // Filtrer les événements
  const events = useMemo(() => {
    return allEvents.filter((event: any) => {
      // Filtre par date : événements qui touchent le mois en cours
      const startDateStr = event.attributes.startDate || event.metadata?.createdAt
      if (startDateStr) {
        const eventStartDate = new Date(startDateStr)
        const eventEndDate = event.attributes.endDate ? new Date(event.attributes.endDate) : eventStartDate
        
        // Vérifier si l'événement chevauche le mois en cours
        const eventInMonth = isWithinInterval(eventStartDate, { start: monthStart, end: monthEnd }) ||
                            isWithinInterval(eventEndDate, { start: monthStart, end: monthEnd }) ||
                            (eventStartDate <= monthStart && eventEndDate >= monthEnd)
        
        if (!eventInMonth) return false
      }

      // Filtre par recherche
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = event.title?.toLowerCase().includes(query)
        const matchesService = event.attributes.service?.toLowerCase().includes(query)
        const matchesMessage = event.attributes.message?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesService && !matchesMessage) return false
      }

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
  }, [allEvents, searchQuery, selectedEnvironments, selectedServices, selectedPriorities, selectedStatuses, selectedTypes, monthStart, monthEnd])

  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd])
  
  // Calculer le jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
  // On ajuste pour que lundi = 0
  const firstDayOfWeek = useMemo(() => {
    const day = monthStart.getDay()
    return day === 0 ? 6 : day - 1 // Convertir dimanche (0) en 6, et décaler les autres
  }, [monthStart])

  const getEventsForDay = (day: Date) => {
    return events.filter((event: any) => {
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

  // Fonction pour détecter les chevauchements d'événements
  const detectOverlaps = (dayEvents: Event[]) => {
    if (dayEvents.length < 2) return false
    
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const event1 = dayEvents[i]
        const event2 = dayEvents[j]
        
        const start1Str = event1.attributes.startDate || event1.metadata?.createdAt
        const start2Str = event2.attributes.startDate || event2.metadata?.createdAt
        if (!start1Str || !start2Str) continue
        
        const start1 = new Date(start1Str)
        const end1 = event1.attributes.endDate ? new Date(event1.attributes.endDate) : start1
        const start2 = new Date(start2Str)
        const end2 = event2.attributes.endDate ? new Date(event2.attributes.endDate) : start2
        
        // Vérifier si les périodes se chevauchent
        if (start1 <= end2 && start2 <= end1) {
          return true
        }
      }
    }
    return false
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []
  
  // Détecter quels événements se chevauchent pour le jour sélectionné
  const getOverlappingEventsForDay = (dayEvents: Event[]) => {
    const overlappingIds = new Set<string>()
    const overlappingPairs: Array<{ event1: Event; event2: Event }> = []
    
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const event1 = dayEvents[i]
        const event2 = dayEvents[j]
        
        const start1Str = event1.attributes.startDate || event1.metadata?.createdAt
        const start2Str = event2.attributes.startDate || event2.metadata?.createdAt
        if (!start1Str || !start2Str) continue
        
        const start1 = new Date(start1Str)
        const end1 = event1.attributes.endDate ? new Date(event1.attributes.endDate) : start1
        const start2 = new Date(start2Str)
        const end2 = event2.attributes.endDate ? new Date(event2.attributes.endDate) : start2
        
        // Vérifier si les périodes se chevauchent
        if (start1 <= end2 && start2 <= end1) {
          if (event1.metadata?.id) overlappingIds.add(event1.metadata.id)
          if (event2.metadata?.id) overlappingIds.add(event2.metadata.id)
          overlappingPairs.push({ event1, event2 })
        }
      }
    }
    
    return { overlappingIds, overlappingPairs }
  }
  
  const { overlappingIds, overlappingPairs } = getOverlappingEventsForDay(selectedDayEvents)

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
    setSearchQuery('')
  }

  const activeFiltersCount = selectedEnvironments.length + selectedServices.length + 
    selectedPriorities.length + selectedStatuses.length + selectedTypes.length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col shrink-0 transition-all duration-300">
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
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Type Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Event Type</h4>
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Environment</h4>
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Priority</h4>
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Status</h4>
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
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Service
                  {catalogLoading && <span className="ml-2 text-xs text-gray-500 normal-case">Loading...</span>}
                </h4>
                {catalogServices.length > 0 ? (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <Input
                        placeholder="Search..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredCatalogServices.map((service: string) => (
                        <label key={service} className="flex items-center space-x-2 cursor-pointer group">
                          <Checkbox
                            checked={selectedServices.includes(service)}
                            onCheckedChange={() => toggleFilter(service, selectedServices, setSelectedServices)}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 truncate" title={service}>
                            {service}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">No services</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Events Calendar</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {events.length} event{events.length > 1 ? 's' : ''}
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            
            <Link to="/events/create">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </Link>
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedTypes.map((type: string) => (
                <Badge key={type} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getEventTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </Badge>
              ))}
              {selectedEnvironments.map((env: string) => (
                <Badge key={env} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getEnvironmentLabel(env)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(env, selectedEnvironments, setSelectedEnvironments)} />
                </Badge>
              ))}
              {selectedPriorities.map((priority: string) => (
                <Badge key={priority} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getPriorityLabel(priority)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(priority, selectedPriorities, setSelectedPriorities)} />
                </Badge>
              ))}
              {selectedStatuses.map((status: string) => (
                <Badge key={status} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getStatusLabel(status)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)} />
                </Badge>
              ))}
              {selectedServices.map((service: string) => (
                <Badge key={service} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {service}
                  <X className="w-3 h-3" onClick={() => toggleFilter(service, selectedServices, setSelectedServices)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading events for {format(currentDate, 'MMMM yyyy', { locale: fr })}...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {/* En-têtes des jours */}
                <div className="grid grid-cols-7 gap-2 mb-1">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Grille des jours */}
                <div className="grid grid-cols-7 auto-rows-fr gap-2 h-[calc(100%-2rem)]">
                  {/* Cellules vides pour aligner le premier jour */}
                  {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} />
                  ))}
                  
                  {daysInMonth.map(day => {
                    const dayEvents = getEventsForDay(day)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentDay = isToday(day)
                    const hasOverlaps = detectOverlaps(dayEvents)

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          min-h-[120px] h-full p-3 rounded border transition-all relative flex flex-col
                          ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                          ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
                          hover:shadow-md
                        `}
                      >
                        <div className="flex items-center justify-between mb-2 flex-shrink-0">
                          <div className={`text-base font-semibold ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {format(day, 'd')}
                          </div>
                          {hasOverlaps && (
                            <div className="relative" title="Overlapping events">
                              <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
                            </div>
                          )}
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="space-y-1 flex-1 overflow-y-auto">
                            {dayEvents.slice(0, 5).map((event: any, idx: number) => {
                              const typeColor = getEventTypeColor(event.attributes.type)
                              return (
                                <div
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded truncate flex items-center space-x-1 ${typeColor.bg} ${typeColor.text} border-0`}
                                >
                                  {getEventTypeIcon(event.attributes.type, 'w-3 h-3 flex-shrink-0')}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              )
                            })}
                            {dayEvents.length > 5 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2">+{dayEvents.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Event Details Panel */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : 'Select a Date'}
                </h3>
              </div>
              
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {selectedDayEvents.length > 0 ? (
                    <div className="space-y-4">
                      {/* Alerte de chevauchements */}
                      {overlappingPairs.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-3">
                          <div className="flex items-start space-x-2 mb-2">
                            <div className="relative flex-shrink-0 mt-0.5">
                              <AlertTriangle className="w-5 h-5 text-orange-600 animate-pulse" />
                              <div className="absolute inset-0 animate-ping">
                                <AlertTriangle className="w-5 h-5 text-orange-600 opacity-75" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                {overlappingPairs.length} Overlap{overlappingPairs.length > 1 ? 's' : ''} Detected
                              </h4>
                              <p className="text-xs text-orange-800 dark:text-orange-200 mb-2">
                                The following events have overlapping time periods:
                              </p>
                              <div className="space-y-1">
                                {overlappingPairs.map((pair, idx) => {
                                  const start1 = new Date(pair.event1.attributes.startDate || pair.event1.metadata?.createdAt || '')
                                  const end1 = pair.event1.attributes.endDate ? new Date(pair.event1.attributes.endDate) : start1
                                  const start2 = new Date(pair.event2.attributes.startDate || pair.event2.metadata?.createdAt || '')
                                  const end2 = pair.event2.attributes.endDate ? new Date(pair.event2.attributes.endDate) : start2
                                  
                                  return (
                                    <div key={idx} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-orange-200 dark:border-orange-700">
                                      <div className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                                        ⚠️ {pair.event1.title} ↔ {pair.event2.title}
                                      </div>
                                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                        <div>• {pair.event1.title}: {format(start1, 'HH:mm')} - {format(end1, 'HH:mm')}</div>
                                        <div>• {pair.event2.title}: {format(start2, 'HH:mm')} - {format(end2, 'HH:mm')}</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Liste des événements */}
                      <div className="space-y-3">
                        {selectedDayEvents.map((event: any) => {
                          const typeColor = getEventTypeColor(event.attributes.type)
                          const envColor = getEnvironmentColor(event.attributes.environment)
                          const priorityColor = getPriorityColor(event.attributes.priority)
                          const statusColor = getStatusColor(event.attributes.status)
                          const isOverlapping = event.metadata?.id && overlappingIds.has(event.metadata.id)
                          const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                          const startDate = startDateStr ? new Date(startDateStr) : null
                          const endDate = event.attributes.endDate ? new Date(event.attributes.endDate) : startDate
                          
                          return (
                            <div 
                              key={event.metadata?.id} 
                              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                isOverlapping 
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30' 
                                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                              }`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                {isOverlapping && (
                                  <div className="relative flex-shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-orange-600 animate-pulse" />
                                  </div>
                                )}
                                {getEventTypeIcon(event.attributes.type, 'w-4 h-4 flex-shrink-0')}
                                <Badge className={`${typeColor.bg} ${typeColor.text} border-0`}>
                                  {getEventTypeLabel(event.attributes.type)}
                                </Badge>
                                {event.attributes.environment && (
                                  <Badge className={`${envColor.bg} ${envColor.text} border-0`}>
                                    {getEnvironmentLabel(event.attributes.environment)}
                                  </Badge>
                                )}
                                <Badge className={`${priorityColor.bg} ${priorityColor.text} border-0`}>
                                  {getPriorityLabel(event.attributes.priority)}
                                </Badge>
                                <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>
                                  {getStatusLabel(event.attributes.status)}
                                </Badge>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{event.title}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">{event.attributes.service}</p>
                                {startDate && endDate && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                  </p>
                                )}
                              </div>
                              <EventLinks 
                                links={event.links}
                                source={event.attributes.source}
                                slackId={event.metadata?.slackId}
                                className="mt-2"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No events for this date</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
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
