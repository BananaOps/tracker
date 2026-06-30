import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Filter, X, Search, SlidersHorizontal } from 'lucide-react'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'

export default function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
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
  const calendarGridRef = useRef<HTMLDivElement | null>(null)
  const [maxEventLinesPerDay, setMaxEventLinesPerDay] = useState(3)

  // Calculer le début et la fin du mois
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  // Récupérer les événements avec une clé qui change chaque mois pour forcer le refresh
  const { data } = useQuery({
    queryKey: ['events', 'calendar', monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () => eventsApi.search({
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    }),
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
  const filterInvalidValues = (values: unknown[]) => {
    const invalidValues = new Set(['event', 'environment', 'priority', 'status', 'unspecified', 'unknown', ''])
    return values
      .filter((v): v is string | number => v !== null && v !== undefined)
      .map(v => String(v).trim())
      .filter(v => !invalidValues.has(v.toLowerCase()))
  }

  // Extraire les valeurs uniques pour les filtres
  const uniqueEnvironments = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.environment).filter(Boolean)))
    return filterInvalidValues(values).sort()
  }, [allEvents])

  const uniquePriorities = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.priority)))
    return filterInvalidValues(values).sort()
  }, [allEvents])

  const uniqueStatuses = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.status)))
    return filterInvalidValues(values).sort()
  }, [allEvents])

  const uniqueTypes = useMemo(() => {
    const values = Array.from(new Set(allEvents.map((e: any) => e.attributes.type)))
    return filterInvalidValues(values).sort()
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
  const selectedDayLiveCount = selectedDayEvents.filter((event: any) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'start' || status === 'in_progress' || status === '1' || status === '12'
  }).length
  const selectedDayScheduledCount = selectedDayEvents.filter((event: any) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'scheduled'
  }).length
  const selectedDayDoneCount = selectedDayEvents.filter((event: any) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'completed' || status === 'success' || status === 'done' || status === '3' || status === '11'
  }).length

  const totalEventsInMonth = events.length
  const criticalEventsCount = events.filter((event: any) => {
    const impact = String(event.attributes.impact || '').toLowerCase()
    return impact === 'true' || impact === 'critical' || impact === 'high' || impact === '1'
  }).length
  const scheduledEventsCount = events.filter((event: any) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'scheduled' || status === 'start' || status === 'in_progress' || status === '1' || status === '12'
  }).length
  const completedEventsCount = events.filter((event: any) => {
    const status = String(event.attributes.status || '').toLowerCase()
    return status === 'completed' || status === 'success' || status === 'done' || status === '3' || status === '11'
  }).length

  const calendarCells = useMemo(() => {
    const leading = Array.from({ length: firstDayOfWeek }, () => null as Date | null)
    const base = [...leading, ...daysInMonth]
    const trailingCount = (7 - (base.length % 7)) % 7
    const trailing = Array.from({ length: trailingCount }, () => null as Date | null)
    return [...base, ...trailing]
  }, [daysInMonth, firstDayOfWeek])

  const calendarWeekRows = calendarCells.length / 7

  useEffect(() => {
    const updateMaxLines = () => {
      const grid = calendarGridRef.current
      if (!grid) return

      const gridHeight = grid.clientHeight
      if (!gridHeight) return

      const rowHeight = gridHeight / Math.max(1, calendarWeekRows)
      const computedLines = Math.floor((rowHeight - 30) / 24)
      const nextMaxLines = Math.max(2, Math.min(6, computedLines))
      setMaxEventLinesPerDay(nextMaxLines)
    }

    updateMaxLines()
    const raf = requestAnimationFrame(updateMaxLines)

    const observer = new ResizeObserver(() => {
      updateMaxLines()
    })
    if (calendarGridRef.current) {
      observer.observe(calendarGridRef.current)
    }

    window.addEventListener('resize', updateMaxLines)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', updateMaxLines)
    }
  }, [calendarWeekRows])

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

  const getTypePalette = (type?: string) => {
    const t = String(type || '').toLowerCase()
    if (t === 'deployment' || t === 'release' || t === '1') return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', solid: '#1B3575' }
    if (t === 'operation' || t === 'maintenance' || t === '2') return { bg: '#F3EEFF', text: '#5B3AAE', border: '#D9CCFF', solid: '#6C4AB6' }
    if (t === 'incident' || t === 'hotfix' || t === '4') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9', solid: '#C0330A' }
    if (t === 'drift' || t === 'infra' || t === 'platform' || t === '3') return { bg: '#EAFBFA', text: '#0F766E', border: '#BDECE8', solid: '#0F9E95' }
    if (t === 'rpa_usage' || t === 'manual' || t === 'intervention' || t === 'change' || t === '5') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0', solid: '#E8580A' }
    if (t === 'audit' || t === 'validation' || t === 'verification' || t === 'recommendation' || t === 'snapshot' || t === 'user_update') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', solid: '#16A34A' }
    return { bg: '#EEF1F8', text: '#4B5563', border: '#D5DBE8', solid: '#64748B' }
  }

  const getStatusPalette = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (s === 'success' || s === '3' || s === 'done' || s === '11') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', label: 'Success', icon: 'fa-circle-check' }
    if (s === 'failure' || s === '2' || s === 'error' || s === '5') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Conflict', icon: 'fa-triangle-exclamation' }
    if (s === 'start' || s === '1' || s === 'in_progress' || s === '12') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Live', icon: 'fa-satellite-dish' }
    if (s === 'warning' || s === '4') return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0', label: 'Warning', icon: 'fa-triangle-exclamation' }
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', label: 'Scheduled', icon: 'fa-clock' }
  }

  const getEnvironmentPalette = (environment?: string) => {
    const e = String(environment || '').toLowerCase()
    if (e === 'production' || e === '7') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (e === 'preproduction' || e === '6') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    if (e === 'uat' || e === '4' || e === 'recette' || e === '5' || e === 'tnr' || e === '3') return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
    if (e === 'development' || e === '1' || e === 'integration' || e === '2') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
    return { bg: '#EEF1F8', text: '#475569', border: '#D5DBE8' }
  }

  const getPriorityPalette = (priority?: string) => {
    const p = String(priority || '').toLowerCase()
    if (p === 'p1' || p === '1') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
    if (p === 'p2' || p === '2') return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0' }
    if (p === 'p3' || p === '3') return { bg: '#FDFCE8', text: '#6B6000', border: '#F0EA90' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  }

  const getImpactLabel = (impact?: unknown) => {
    const value = String(impact || '').toLowerCase().trim()
    if (!value || value === 'false' || value === '0' || value === 'none' || value === 'null' || value === 'undefined') return null
    if (value === 'true' || value === '1') return 'Impact'
    return `Impact ${String(impact).toUpperCase()}`
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <div className="w-64 flex flex-col shrink-0 transition-all duration-300" style={{ borderRight: '1px solid rgb(var(--hud-outline-var) / 0.25)', background: 'rgb(var(--hud-surface))' }}>
          {/* Sidebar Header */}
          <div className="p-3" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.2)', background: 'rgb(var(--hud-surface-high))' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--hud-on-surface))' }}>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--hud-on-surface-var))' }} />
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
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Event Type</h4>
                <div className="space-y-2">
                  {uniqueTypes.map(type => (
                    <label
                      key={type}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedTypes.includes(String(type)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedTypes.includes(String(type))
                        const pal = getTypePalette(String(type))
                        return (
                          <div
                            onClick={() => toggleFilter(String(type), selectedTypes, setSelectedTypes)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium group-hover:opacity-100" style={{ color: selectedTypes.includes(String(type)) ? getTypePalette(String(type)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getEventTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Environment Filter */}
              <div>
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Environment</h4>
                <div className="space-y-2">
                  {uniqueEnvironments.map(env => (
                    <label
                      key={env}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedEnvironments.includes(String(env)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedEnvironments.includes(String(env))
                        const pal = getEnvironmentPalette(String(env))
                        return (
                          <div
                            onClick={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium group-hover:opacity-100" style={{ color: selectedEnvironments.includes(String(env)) ? getEnvironmentPalette(String(env)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getEnvironmentLabel(env)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Priority Filter */}
              <div>
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Priority</h4>
                <div className="space-y-2">
                  {uniquePriorities.map(priority => (
                    <label
                      key={priority}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedPriorities.includes(String(priority)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedPriorities.includes(String(priority))
                        const pal = getPriorityPalette(String(priority))
                        return (
                          <div
                            onClick={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium group-hover:opacity-100" style={{ color: selectedPriorities.includes(String(priority)) ? getPriorityPalette(String(priority)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getPriorityLabel(priority)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status Filter */}
              <div>
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Status</h4>
                <div className="space-y-2">
                  {uniqueStatuses.map(status => (
                    <label
                      key={status}
                      className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                      style={{ background: selectedStatuses.includes(String(status)) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                    >
                      {(() => {
                        const checked = selectedStatuses.includes(String(status))
                        const pal = getStatusPalette(String(status))
                        return (
                          <div
                            onClick={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? pal.bg : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? pal.border : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                          >
                            {checked && <div className="w-2 h-2 rounded-sm" style={{ background: pal.text }} />}
                          </div>
                        )
                      })()}
                      <span className="text-sm font-medium group-hover:opacity-100" style={{ color: selectedStatuses.includes(String(status)) ? getStatusPalette(String(status)).text : 'rgb(var(--hud-on-surface))' }}>
                        {getStatusLabel(status)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Service Filter */}
              <div>
                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                  Service
                  {catalogLoading && <span className="ml-2 text-xs normal-case" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Loading...</span>}
                </h4>
                {catalogServices.length > 0 ? (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'rgb(var(--hud-on-surface-var))' }} />
                      <Input
                        placeholder="Search..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredCatalogServices.map((service: string) => (
                        <label
                          key={service}
                          className="flex items-center space-x-2 cursor-pointer group rounded-md px-2 py-1.5 transition-all hover:brightness-105"
                          style={{ background: selectedServices.includes(service) ? 'rgb(var(--hud-primary) / 0.08)' : 'rgb(var(--hud-outline-var) / 0.06)' }}
                        >
                          {(() => {
                            const checked = selectedServices.includes(service)
                            return (
                              <div
                                onClick={() => toggleFilter(service, selectedServices, setSelectedServices)}
                                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                style={{ background: checked ? 'rgb(var(--hud-primary) / 0.18)' : 'rgb(var(--hud-outline-var) / 0.2)', border: `1.5px solid ${checked ? 'rgb(var(--hud-primary) / 0.6)' : 'rgb(var(--hud-outline-var) / 0.55)'}` }}
                              >
                                {checked && <div className="w-2 h-2 rounded-sm" style={{ background: 'rgb(var(--hud-primary))' }} />}
                              </div>
                            )
                          })()}
                          <span className="text-sm font-medium truncate group-hover:opacity-100" style={{ color: selectedServices.includes(service) ? 'rgb(var(--hud-primary))' : 'rgb(var(--hud-on-surface))' }} title={service}>
                            {service}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs italic" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>No services</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.25)', background: '#EEF1F8' }}>
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
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--hud-on-surface))' }}>Events Calendar</h2>
                <p className="text-sm" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                  {events.length} event{events.length > 1 ? 's' : ''}
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedTypes.map((type: string) => (
                <Badge key={type} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getEventTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </Badge>
              ))}
              {selectedEnvironments.map((env: string) => (
                <Badge key={env} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getEnvironmentLabel(env)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(env, selectedEnvironments, setSelectedEnvironments)} />
                </Badge>
              ))}
              {selectedPriorities.map((priority: string) => (
                <Badge key={priority} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getPriorityLabel(priority)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(priority, selectedPriorities, setSelectedPriorities)} />
                </Badge>
              ))}
              {selectedStatuses.map((status: string) => (
                <Badge key={status} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {getStatusLabel(status)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)} />
                </Badge>
              ))}
              {selectedServices.map((service: string) => (
                <Badge key={service} variant="secondary" className="gap-1 cursor-pointer" style={{ background: 'rgb(var(--hud-surface-high))' }}>
                  {service}
                  <X className="w-3 h-3" onClick={() => toggleFilter(service, selectedServices, setSelectedServices)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4" style={{ background: 'rgb(var(--hud-bg))' }}>
            <div className="flex items-center gap-5 shrink-0 rounded-xl px-4 py-3" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold tabular-nums" style={{ color: 'rgb(var(--hud-on-surface))' }}>{totalEventsInMonth}</span>
                <span className="text-xs" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>events in {format(currentDate, 'MMMM', { locale: enUS })}</span>
              </div>
              <div className="w-px h-8" style={{ background: 'rgb(var(--hud-outline-var) / 0.2)' }} />
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium" style={{ color: '#B84400' }}>{criticalEventsCount} critical</span>
                <span style={{ color: 'rgb(var(--hud-on-surface-var))' }}>·</span>
                <span className="font-medium" style={{ color: '#1B3575' }}>{scheduledEventsCount} scheduled</span>
                <span style={{ color: 'rgb(var(--hud-on-surface-var))' }}>·</span>
                <span className="font-medium" style={{ color: '#166534' }}>{completedEventsCount} completed</span>
              </div>
            </div>
            <div className="flex gap-4 flex-1 min-h-0">
            {/* Calendar Grid */}
            <div className="flex-1 rounded-xl flex flex-col overflow-hidden" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
              <div className="px-5 py-3.5 grid grid-cols-[40px_1fr_40px] items-center flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
                <Button variant="ghost" size="icon" onClick={previousMonth} className="h-7 w-7 justify-self-start" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-sm font-semibold text-center" style={{ color: 'rgb(var(--hud-on-surface))' }}>
                  {format(currentDate, 'MMMM yyyy', { locale: enUS })}
                </h3>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 justify-self-end" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="px-2 py-0 flex-1 flex flex-col min-h-0">
                {/* Day headers */}
                <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: day === 'Sat' || day === 'Sun' ? '#C5CBD8' : '#B0BAD0' }}>
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Day grid */}
                <div ref={calendarGridRef} className="flex-1 grid min-h-0" style={{ gridTemplateRows: `repeat(${Math.max(5, calendarCells.length / 7)}, minmax(0, 1fr))` }}>
                  {Array.from({ length: calendarCells.length / 7 }).map((_, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 px-2 py-1">
                      {calendarCells.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
                        if (!day) return <div key={`empty-${weekIndex}-${dayIndex}`} className="p-1" />

                        const dayEvents = getEventsForDay(day)
                        const isSelected = selectedDate && isSameDay(day, selectedDate)
                        const isCurrentDay = isToday(day)
                        const isWeekend = dayIndex >= 5
                        const visibleEventCount = dayEvents.length > maxEventLinesPerDay ? maxEventLinesPerDay - 1 : dayEvents.length
                        const hiddenEventCount = dayEvents.length - visibleEventCount

                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={`p-1 rounded-lg transition-colors flex flex-col overflow-hidden text-left ${isWeekend ? 'opacity-55' : ''}`}
                            style={{ background: isSelected && !isCurrentDay ? '#EFF4FF' : 'transparent' }}
                          >
                            <div className={`w-6 h-6 mb-0.5 rounded-full flex items-center justify-center text-xs font-medium ${isCurrentDay ? '' : ''}`} style={{ background: isCurrentDay ? '#1B3575' : 'transparent', color: isCurrentDay ? '#FFFFFF' : isSelected ? '#1B3575' : '#6E7891' }}>
                              {format(day, 'd')}
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
                              {dayEvents.slice(0, visibleEventCount).map((event: any, idx: number) => {
                                const envPalette = getEnvironmentPalette(event.attributes.environment)
                                return (
                                  <div
                                    key={idx}
                                    className="text-[10px] font-medium px-1.5 py-1 rounded-md truncate leading-tight flex items-center gap-1.5 border"
                                    style={{ background: envPalette.bg, color: envPalette.text, borderColor: envPalette.border }}
                                  >
                                    <span className="w-4 h-4 rounded-[4px] flex items-center justify-center border shrink-0" style={{ background: 'rgb(var(--hud-surface-high))', borderColor: envPalette.border, color: envPalette.text }}>
                                      {getEventTypeIcon(event.attributes.type, 'w-2.5 h-2.5')}
                                    </span>
                                    {getImpactLabel(event.attributes.impact) && (
                                      <i className="fa-solid fa-meteor fa-beat-fade text-[9px] shrink-0" style={{ '--fa-animation-duration': '2s' } as CSSProperties} />
                                    )}
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                )
                              })}
                              {hiddenEventCount > 0 && (
                                <div className="text-[9px] px-1" style={{ color: '#9CA3AF' }}>+{hiddenEventCount} more</div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Details Panel */}
            <div className="w-[288px] rounded-xl flex flex-col overflow-hidden min-h-0 shrink-0" style={{ background: 'rgb(var(--hud-surface))', border: '1px solid rgb(var(--hud-outline-var) / 0.2)' }}>
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.15)' }}>
                <div className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: '#9CA3AF' }}>
                  {selectedDate ? format(selectedDate, 'MMMM yyyy', { locale: enUS }) : format(currentDate, 'MMMM yyyy', { locale: enUS })}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] leading-none font-semibold tabular-nums" style={{ color: 'rgb(var(--hud-on-surface))' }}>
                    {selectedDate ? format(selectedDate, 'dd') : '--'}
                  </span>
                  {selectedDate && isToday(selectedDate) && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm" style={{ background: '#FFF0E8', color: '#E85D04' }}>Today</span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  {selectedDate ? format(selectedDate, 'EEEE, dd MMMM', { locale: enUS }) : 'Select a day'}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm" style={{ background: '#EEF1F8', color: '#475569', border: '1px solid #D5DBE8' }}>
                    {selectedDayEvents.length} event{selectedDayEvents.length > 1 ? 's' : ''}
                  </span>
                  {selectedDayLiveCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm" style={{ background: '#EFF4FF', color: '#1B3575', border: '1px solid #C2D0EF' }}>
                      {selectedDayLiveCount} live
                    </span>
                  )}
                  {selectedDayScheduledCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm" style={{ background: '#FFF8E8', color: '#8C5A00', border: '1px solid #FFE0A0' }}>
                      {selectedDayScheduledCount} scheduled
                    </span>
                  )}
                  {selectedDayDoneCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm" style={{ background: '#ECFDF3', color: '#166534', border: '1px solid #BBF7D0' }}>
                      {selectedDayDoneCount} done
                    </span>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1 overflow-y-auto">
                <div>
                  {selectedDayEvents.length > 0 ? (
                    <div style={{ borderTop: '1px solid rgb(var(--hud-outline-var) / 0.08)' }}>
                      {selectedDayEvents.map((event: any, i: number) => {
                        const startDateStr = event.attributes.startDate || event.metadata?.createdAt
                        const startDate = startDateStr ? new Date(startDateStr) : null
                        const endDate = event.attributes.endDate ? new Date(event.attributes.endDate) : startDate
                        
                        return (
                          <div 
                            key={event.metadata?.id || i}
                            className="px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#FAFBFF]"
                            style={{ borderBottom: '1px solid rgb(var(--hud-outline-var) / 0.08)' }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {(() => {
                                const st = getStatusPalette(event.attributes.status)
                                return (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ background: st.bg, color: st.text, borderColor: st.border }}>
                                      <i className={`fa-solid ${st.icon} text-[10px]${st.icon === 'fa-satellite-dish' ? ' fa-fade' : ''}`} />
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase" style={{ color: st.text }}>
                                      {st.label}
                                    </span>
                                  </span>
                                )
                              })()}
                            </div>
                            <p className="text-xs font-medium leading-snug mb-1 transition-colors hover:text-[#1B3575]" style={{ color: 'rgb(var(--hud-on-surface))' }}>
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              {event.attributes.service && (
                                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium" style={{ background: '#EEF1F8', color: '#475569', border: '1px solid #D5DBE8' }}>
                                  {event.attributes.service}
                                </span>
                              )}
                              {(() => {
                                const ty = getTypePalette(event.attributes.type)
                                return (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ background: ty.bg, color: ty.text, borderColor: ty.border }}>
                                      {getEventTypeIcon(event.attributes.type, 'w-3 h-3')}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase" style={{ color: ty.text }}>
                                      {getEventTypeLabel(event.attributes.type)}
                                    </span>
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(() => {
                                const env = getEnvironmentPalette(event.attributes.environment)
                                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium" style={{ background: env.bg, color: env.text, border: `1px solid ${env.border}` }}>
                                  {String(getEnvironmentLabel(event.attributes.environment) || 'N/A').toUpperCase()}
                                </span>
                              })()}
                              {getImpactLabel(event.attributes.impact) && (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ background: '#FFF0E8', color: '#B84400', borderColor: '#FFC8A0' }}>
                                    <i className="fa-solid fa-meteor fa-beat-fade text-[10px]" style={{ '--fa-animation-duration': '2s' } as CSSProperties} />
                                  </span>
                                  <span className="text-[10px] font-semibold uppercase" style={{ color: '#B84400' }}>{getImpactLabel(event.attributes.impact)}</span>
                                </span>
                              )}
                              {startDate && endDate && (
                                <span className="text-[10px] tabular-nums" style={{ color: '#6E7891' }}>
                                  {format(startDate, 'HH:mm')} → {format(endDate, 'HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-center py-10 px-6" style={{ color: '#9CA3AF' }}>No events scheduled for this day</p>
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
