import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Mail, User, Users, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event, Catalog } from '../types/api'
import { getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'

type OverlapPair = {
  event1: Event
  event2: Event
  overlapStart: Date
  overlapEnd: Date
  catalog1?: Catalog
  catalog2?: Catalog
}

export default function EventsOverlaps() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDays, setSelectedDays] = useState<number>(7) // Nombre de jours à analyser

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

  // Créer un map des catalogues par nom de service
  const catalogMap = useMemo(() => {
    const map = new Map<string, Catalog>()
    catalogs.forEach(catalog => {
      map.set(catalog.name, catalog)
    })
    return map
  }, [catalogs])

  // Calculer la période d'analyse
  const startDate = startOfDay(currentDate)
  const endDate = endOfDay(addDays(currentDate, selectedDays - 1))

  // Filtrer les événements de la période
  const periodEvents = useMemo(() => {
    return allEvents.filter(event => {
      const eventStartStr = event.attributes.startDate || event.metadata?.createdAt
      if (!eventStartStr) return false
      
      const eventStart = new Date(eventStartStr)
      const eventEnd = event.attributes.endDate ? new Date(event.attributes.endDate) : eventStart
      
      // Vérifier si l'événement chevauche la période
      return eventStart <= endDate && eventEnd >= startDate
    })
  }, [allEvents, startDate, endDate])

  // Détecter tous les chevauchements
  const overlaps = useMemo(() => {
    const overlappingPairs: OverlapPair[] = []
    
    for (let i = 0; i < periodEvents.length; i++) {
      for (let j = i + 1; j < periodEvents.length; j++) {
        const event1 = periodEvents[i]
        const event2 = periodEvents[j]
        
        const start1Str = event1.attributes.startDate || event1.metadata?.createdAt
        const start2Str = event2.attributes.startDate || event2.metadata?.createdAt
        if (!start1Str || !start2Str) continue
        
        const start1 = new Date(start1Str)
        const end1 = event1.attributes.endDate ? new Date(event1.attributes.endDate) : start1
        const start2 = new Date(start2Str)
        const end2 = event2.attributes.endDate ? new Date(event2.attributes.endDate) : start2
        
        // Vérifier si les périodes se chevauchent
        if (start1 <= end2 && start2 <= end1) {
          const overlapStart = start1 > start2 ? start1 : start2
          const overlapEnd = end1 < end2 ? end1 : end2
          
          overlappingPairs.push({
            event1,
            event2,
            overlapStart,
            overlapEnd,
            catalog1: catalogMap.get(event1.attributes.service),
            catalog2: catalogMap.get(event2.attributes.service),
          })
        }
      }
    }
    
    // Trier par date de début du chevauchement
    return overlappingPairs.sort((a, b) => a.overlapStart.getTime() - b.overlapStart.getTime())
  }, [periodEvents, catalogMap])

  // Grouper les chevauchements par jour
  const overlapsByDay = useMemo(() => {
    const grouped = new Map<string, OverlapPair[]>()
    
    overlaps.forEach(overlap => {
      const dayKey = format(overlap.overlapStart, 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, [])
      }
      grouped.get(dayKey)!.push(overlap)
    })
    
    return grouped
  }, [overlaps])

  const goToPreviousPeriod = () => {
    setCurrentDate(subDays(currentDate, selectedDays))
  }

  const goToNextPeriod = () => {
    setCurrentDate(addDays(currentDate, selectedDays))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  if (isLoading || catalogLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Overlaps</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and coordinate overlapping events
          </p>
        </div>
      </div>

      {/* Contrôles de navigation et filtres */}
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
              className="btn-secondary px-4 py-2"
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
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <AlertTriangle className={`w-8 h-8 ${overlaps.length > 0 ? 'text-orange-600 animate-pulse' : 'text-gray-400'}`} />
              {overlaps.length > 0 && (
                <div className="absolute inset-0 animate-ping">
                  <AlertTriangle className="w-8 h-8 text-orange-600 opacity-75" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Overlaps</p>
              <p className={`text-2xl font-bold ${overlaps.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {overlaps.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Days with Overlaps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overlapsByDay.size}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Services Involved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {new Set(overlaps.flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des chevauchements */}
      {overlaps.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Overlaps Detected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All events in this period are well coordinated!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(overlapsByDay.entries()).map(([dayKey, dayOverlaps]) => {
            const day = new Date(dayKey)
            return (
              <div key={dayKey} className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <span>{format(day, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
                  <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full font-medium">
                    {dayOverlaps.length} overlap{dayOverlaps.length > 1 ? 's' : ''}
                  </span>
                </h3>

                <div className="space-y-4">
                  {dayOverlaps.map((overlap, idx) => {
                    const typeColor1 = getEventTypeColor(overlap.event1.attributes.type)
                    const typeColor2 = getEventTypeColor(overlap.event2.attributes.type)
                    
                    return (
                      <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-4">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="relative flex-shrink-0 mt-1">
                            <AlertTriangle className="w-6 h-6 text-orange-600 animate-pulse" />
                            <div className="absolute inset-0 animate-ping">
                              <AlertTriangle className="w-6 h-6 text-orange-600 opacity-75" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                              Overlap Period: {format(overlap.overlapStart, 'HH:mm')} - {format(overlap.overlapEnd, 'HH:mm')}
                            </div>
                            <div className="text-xs text-orange-800 dark:text-orange-200">
                              Duration: {Math.round((overlap.overlapEnd.getTime() - overlap.overlapStart.getTime()) / (1000 * 60))} minutes
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Event 1 */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor1.bg} ${typeColor1.text}`}>
                                    {getEventTypeLabel(overlap.event1.attributes.type)}
                                  </span>
                                  {overlap.event1.attributes.environment && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                      {getEnvironmentLabel(overlap.event1.attributes.environment)}
                                    </span>
                                  )}
                                </div>
                                <h4 
                                  className="font-semibold text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-primary-600"
                                  onClick={() => setSelectedEvent(overlap.event1)}
                                >
                                  {overlap.event1.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {overlap.event1.attributes.service}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                  <div>Start: {format(new Date(overlap.event1.attributes.startDate || overlap.event1.metadata?.createdAt || ''), 'HH:mm')}</div>
                                  <div>End: {format(overlap.event1.attributes.endDate ? new Date(overlap.event1.attributes.endDate) : new Date(overlap.event1.attributes.startDate || overlap.event1.metadata?.createdAt || ''), 'HH:mm')}</div>
                                </div>
                              </div>
                            </div>

                            {/* Contact Info */}
                            {overlap.catalog1 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Team Contact</span>
                                </div>
                                {overlap.catalog1.owner && (
                                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <User className="w-3 h-3" />
                                    <span>{overlap.catalog1.owner}</span>
                                  </div>
                                )}
                                {overlap.catalog1.email && (
                                  <a 
                                    href={`mailto:${overlap.catalog1.email}`}
                                    className="flex items-center space-x-2 text-xs text-primary-600 hover:text-primary-700 mb-1"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>{overlap.catalog1.email}</span>
                                  </a>
                                )}
                                {overlap.catalog1.slackChannel && (
                                  <a 
                                    href={`https://slack.com/app_redirect?channel=${overlap.catalog1.slackChannel}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 text-xs text-primary-600 hover:text-primary-700"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>#{overlap.catalog1.slackChannel}</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Event 2 */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor2.bg} ${typeColor2.text}`}>
                                    {getEventTypeLabel(overlap.event2.attributes.type)}
                                  </span>
                                  {overlap.event2.attributes.environment && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                      {getEnvironmentLabel(overlap.event2.attributes.environment)}
                                    </span>
                                  )}
                                </div>
                                <h4 
                                  className="font-semibold text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-primary-600"
                                  onClick={() => setSelectedEvent(overlap.event2)}
                                >
                                  {overlap.event2.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {overlap.event2.attributes.service}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                  <div>Start: {format(new Date(overlap.event2.attributes.startDate || overlap.event2.metadata?.createdAt || ''), 'HH:mm')}</div>
                                  <div>End: {format(overlap.event2.attributes.endDate ? new Date(overlap.event2.attributes.endDate) : new Date(overlap.event2.attributes.startDate || overlap.event2.metadata?.createdAt || ''), 'HH:mm')}</div>
                                </div>
                              </div>
                            </div>

                            {/* Contact Info */}
                            {overlap.catalog2 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Team Contact</span>
                                </div>
                                {overlap.catalog2.owner && (
                                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <User className="w-3 h-3" />
                                    <span>{overlap.catalog2.owner}</span>
                                  </div>
                                )}
                                {overlap.catalog2.email && (
                                  <a 
                                    href={`mailto:${overlap.catalog2.email}`}
                                    className="flex items-center space-x-2 text-xs text-primary-600 hover:text-primary-700 mb-1"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>{overlap.catalog2.email}</span>
                                  </a>
                                )}
                                {overlap.catalog2.slackChannel && (
                                  <a 
                                    href={`https://slack.com/app_redirect?channel=${overlap.catalog2.slackChannel}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 text-xs text-primary-600 hover:text-primary-700"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>#{overlap.catalog2.slackChannel}</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}

