import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Filter, X, Search, SlidersHorizontal } from 'lucide-react'
import type { Event } from '../types/api'
import { getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
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
  const { data } = useQuery({
    queryKey: ['events', 'calendar'],
    queryFn: () => eventsApi.list({ perPage: 1000 }),
    staleTime: 60_000,
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
    setSearchQuery('')
  }

  const activeFiltersCount = selectedEnvironments.length + selectedServices.length + 
    selectedPriorities.length + selectedStatuses.length + selectedTypes.length

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
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
          </div>
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
        <div className="flex-1 overflow-hidden p-4 flex flex-col" style={{ background: 'rgb(var(--hud-bg))' }}>
            <div className="flex gap-4 flex-1 min-h-0">
            {/* Calendar Grid */}
            <div className="flex-[2] shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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

              <div className="px-3 py-2 flex-1 flex flex-col min-h-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr min-h-0">
                  {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} />
                  ))}
                  
                  {daysInMonth.map(day => {
                    const dayEvents = getEventsForDay(day)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentDay = isToday(day)

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className="min-h-0 p-1.5 rounded-lg transition-all relative flex flex-col overflow-hidden"
                        style={{
                          background: isSelected ? 'rgb(var(--hud-primary) / 0.15)' : isCurrentDay ? 'rgb(var(--hud-primary) / 0.07)' : 'transparent',
                          border: isSelected ? '2px solid rgb(var(--hud-primary))' : '1px solid rgb(var(--hud-outline-var) / 0.1)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
                          <span className={`text-xs font-bold ${isCurrentDay ? '' : ''}`}
                            style={{ color: isCurrentDay ? 'rgb(var(--hud-primary))' : 'rgb(var(--hud-on-surface))' }}>
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'rgb(var(--hud-primary) / 0.15)', color: 'rgb(var(--hud-primary))' }}>
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="space-y-0.5 flex-1 overflow-hidden">
                            {dayEvents.slice(0, 3).map((event: any, idx: number) => {
                              const t = String(event.attributes.type).toLowerCase()
                              const c = t === 'deployment' || t === '1' ? '#40ceed' : t === 'incident' || t === '4' ? '#ff6e84' : t === 'drift' || t === '3' ? '#a3aac4' : t === 'operation' || t === '2' ? '#bd9dff' : '#a78bfa'
                              return (
                                <div key={idx} className="text-[9px] px-1 py-0.5 rounded truncate" style={{ background: `${c}15`, color: c }}>
                                  {event.title}
                                </div>
                              )
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[9px] font-medium px-1" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>+{dayEvents.length - 3}</div>
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
            <div className="flex-1 rounded-xl flex flex-col overflow-hidden min-h-0" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: fr }) : 'Select a Date'}
                </h3>
                {selectedDayEvents.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>{selectedDayEvents.length} event{selectedDayEvents.length > 1 ? 's' : ''}</p>
                )}
              </div>
              
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {selectedDayEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDayEvents.map((event: any) => {
                        const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                        const startDate = startDateStr ? new Date(startDateStr) : null
                        const endDate = event.attributes.endDate ? new Date(event.attributes.endDate) : startDate
                        
                        return (
                          <div 
                            key={event.metadata?.id} 
                            className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg"
                            style={{ background: 'rgb(var(--hud-surface) / 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              {(() => {
                                const t = String(event.attributes.type).toLowerCase()
                                const c = t === 'deployment' || t === '1' ? '#40ceed' : t === 'incident' || t === '4' ? '#ff6e84' : t === 'drift' || t === '3' ? '#a3aac4' : t === 'operation' || t === '2' ? '#bd9dff' : '#a78bfa'
                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{getEventTypeLabel(event.attributes.type)}</span>
                              })()}
                              {event.attributes.environment && (() => {
                                const e = String(event.attributes.environment).toLowerCase()
                                const c = e === 'production' || e === '7' ? '#f87171' : e === 'preproduction' || e === '6' ? '#fb923c' : e === 'uat' || e === '4' || e === 'recette' || e === '5' ? '#60a5fa' : e === 'development' || e === '1' ? '#4ade80' : '#a3aac4'
                                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                                  {getEnvironmentLabel(event.attributes.environment)}
                                </span>
                              })()}
                              {(() => {
                                const p = String(event.attributes.priority).toLowerCase()
                                const c = p === 'p1' || p === '1' ? '#ef4444' : p === 'p2' || p === '2' ? '#fb923c' : p === 'p3' || p === '3' ? '#fbbf24' : '#6b7280'
                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{getPriorityLabel(event.attributes.priority)}</span>
                              })()}
                              {(() => {
                                const s = String(event.attributes.status).toLowerCase()
                                const c = s === 'success' || s === '3' || s === 'done' || s === '11' ? '#34d399' : s === 'failure' || s === '2' || s === 'error' || s === '5' ? '#ff6e84' : s === 'start' || s === '1' || s === 'in_progress' || s === '12' ? '#40ceed' : s === 'warning' || s === '4' ? '#fbbf24' : '#6b7280'
                                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{getStatusLabel(event.attributes.status)}</span>
                              })()}
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-bold break-words mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{event.title}</h4>
                            
                            {/* Description */}
                            {event.attributes.message && (
                              <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>{event.attributes.message}</p>
                            )}
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-3 flex-wrap text-[10px]" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                              <span className="font-mono font-bold" style={{ color: 'rgb(var(--hud-on-surface))' }}>{event.attributes.service}</span>
                              {startDate && endDate && (
                                <span className="font-mono">{format(startDate, 'HH:mm')} → {format(endDate, 'HH:mm')}</span>
                              )}
                              {event.attributes.owner && (
                                <span className="flex items-center gap-1">
                                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: 'rgb(var(--hud-primary))' }}>
                                    {event.attributes.owner.split(/[\s.@]/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')}
                                  </span>
                                  {event.attributes.owner}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-8" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>No events for this date</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
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
