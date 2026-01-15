import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mail, User, Users, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event, Catalog } from '../types/api'
import { getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Input } from '../components/ui/input'

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
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)

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
  const startDate = useMemo(() => {
    if (isCustomPeriod && customStartDate) {
      try {
        return startOfDay(new Date(customStartDate))
      } catch {
        return startOfDay(currentDate)
      }
    }
    return startOfDay(currentDate)
  }, [isCustomPeriod, customStartDate, currentDate])

  const endDate = useMemo(() => {
    if (isCustomPeriod && customEndDate) {
      try {
        return endOfDay(new Date(customEndDate))
      } catch {
        return endOfDay(addDays(currentDate, selectedDays - 1))
      }
    }
    return endOfDay(addDays(currentDate, selectedDays - 1))
  }, [isCustomPeriod, customEndDate, currentDate, selectedDays])

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

  // Détecter tous les chevauchements (uniquement si même environnement)
  const overlaps = useMemo(() => {
    const overlappingPairs: OverlapPair[] = []
    
    for (let i = 0; i < periodEvents.length; i++) {
      for (let j = i + 1; j < periodEvents.length; j++) {
        const event1 = periodEvents[i]
        const event2 = periodEvents[j]
        
        // Vérifier que les deux événements ont le même environnement
        const env1 = event1.attributes.environment
        const env2 = event2.attributes.environment
        if (!env1 || !env2 || env1.toLowerCase() !== env2.toLowerCase()) continue
        
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
    setIsCustomPeriod(false)
  }

  const handlePeriodChange = (days: number) => {
    if (days === -1) {
      // Custom period
      setIsCustomPeriod(true)
      setCustomStartDate(format(new Date(), 'yyyy-MM-dd'))
      setCustomEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
    } else {
      setIsCustomPeriod(false)
      setSelectedDays(days)
    }
  }

  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading overlaps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header - Style Calendar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Overlaps</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {overlaps.length} overlap{overlaps.length > 1 ? 's' : ''} detected (same environment only)
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {!isCustomPeriod && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={goToPreviousPeriod}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextPeriod}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
              <select
                value={isCustomPeriod ? -1 : selectedDays}
                onChange={(e) => handlePeriodChange(Number(e.target.value))}
                className="w-[140px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={-1}>Custom</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {isCustomPeriod && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date:</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date:</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsCustomPeriod(false)
                    setSelectedDays(7)
                  }}
                >
                  Cancel Custom
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Overlaps Card */}
        <div className="relative group h-full">
          <div className={`absolute inset-0 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 ${
            overlaps.length > 0 
              ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 animate-pulse' 
              : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20'
          }`}></div>
          <div className={`relative card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full ${
            overlaps.length > 0
              ? 'bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-orange-900/10'
              : 'bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-gray-900/10'
          }`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${
              overlaps.length > 0
                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                : 'bg-gradient-to-r from-gray-500 to-slate-500'
            }`}></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    overlaps.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <p className={`text-sm font-semibold uppercase tracking-wide ${
                    overlaps.length > 0 
                      ? 'text-orange-700 dark:text-orange-400' 
                      : 'text-gray-700 dark:text-gray-400'
                  }`}>Total Overlaps</p>
                </div>
                <p className={`text-4xl font-black ${
                  overlaps.length > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-slate-900 dark:text-slate-100'
                }`}>{overlaps.length}</p>
              </div>
              <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-lg ${
                  overlaps.length > 0 ? 'bg-orange-500/20' : 'bg-gray-500/20'
                }`}></div>
                <AlertTriangle className={`relative w-12 h-12 ${
                  overlaps.length > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Days with Overlaps Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Days with Overlaps</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{overlapsByDay.size}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg"></div>
                <CalendarIcon className="relative w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Services Involved Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-purple-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Services Involved</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {new Set(overlaps.flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])).size}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg"></div>
                <Users className="relative w-12 h-12 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des chevauchements avec layout Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Overlaps List - 2/3 width */}
        <div className="xl:col-span-2">
          {overlaps.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Overlaps Detected</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    All events in this period are well coordinated!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.from(overlapsByDay.entries()).map(([dayKey, dayOverlaps]) => {
                const day = new Date(dayKey)
                return (
                  <Card key={dayKey}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CalendarIcon className="w-5 h-5 text-primary-600" />
                        <span>{format(day, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
                        <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                          {dayOverlaps.length} overlap{dayOverlaps.length > 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary Panel - 1/3 width */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
              <CardDescription>
                {format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Overlaps</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">{overlaps.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days Affected</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{overlapsByDay.size}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">
                    {new Set(overlaps.flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])).size}
                  </span>
                </div>
              </div>

              {/* Most Affected Services */}
              {overlaps.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Most Affected Services</h4>
                    <div className="space-y-2">
                      {Array.from(
                        overlaps
                          .flatMap(o => [o.event1.attributes.service, o.event2.attributes.service])
                          .reduce((acc, service) => {
                            acc.set(service, (acc.get(service) || 0) + 1)
                            return acc
                          }, new Map<string, number>())
                          .entries()
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([service, count]) => (
                          <div key={service} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300 truncate flex-1" title={service}>
                              {service}
                            </span>
                            <Badge variant="secondary" className="ml-2">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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

