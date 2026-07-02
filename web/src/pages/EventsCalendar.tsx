import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Event, Catalog } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import PageFiltersHeader from '../components/filters/PageFiltersHeader'
import FiltersSidebar from '../components/filters/FiltersSidebar'
import { RiskScoreBadge, buildRiskContext, assessAppEvent, getRiskLevelVisual } from '@/features/risk-engine'
import { Button } from '../components/ui/button'
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
    refetchInterval: 30_000,
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
    refetchInterval: 30_000,
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

  const riskContext = useMemo(() => buildRiskContext(events, (catalogData?.catalogs ?? []) as Catalog[]), [events, catalogData])

  const activeFilterTags = useMemo(() => ([
    ...selectedTypes.map((type) => ({ key: `type-${type}`, label: `Type: ${getEventTypeLabel(type)}`, onRemove: () => toggleFilter(type, selectedTypes, setSelectedTypes) })),
    ...selectedEnvironments.map((env) => ({ key: `environment-${env}`, label: `Environment: ${getEnvironmentLabel(env)}`, onRemove: () => toggleFilter(env, selectedEnvironments, setSelectedEnvironments) })),
    ...selectedPriorities.map((priority) => ({ key: `priority-${priority}`, label: `Priority: ${getPriorityLabel(priority)}`, onRemove: () => toggleFilter(priority, selectedPriorities, setSelectedPriorities) })),
    ...selectedStatuses.map((status) => ({ key: `status-${status}`, label: `Status: ${getStatusLabel(status)}`, onRemove: () => toggleFilter(status, selectedStatuses, setSelectedStatuses) })),
    ...selectedServices.map((service) => ({ key: `service-${service}`, label: `Service: ${service}`, onRemove: () => toggleFilter(service, selectedServices, setSelectedServices) })),
  ]), [selectedTypes, selectedEnvironments, selectedPriorities, selectedStatuses, selectedServices])

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

  const sidebarSections = [
    {
      title: 'Event Type',
      options: uniqueTypes.map((type) => {
        const value = String(type)
        const checked = selectedTypes.includes(value)
        return {
          key: `type-${value}`,
          label: getEventTypeLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedTypes, setSelectedTypes),
          palette: getTypePalette(value),
        }
      }),
    },
    {
      title: 'Environment',
      options: uniqueEnvironments.map((env) => {
        const value = String(env)
        const checked = selectedEnvironments.includes(value)
        return {
          key: `environment-${value}`,
          label: getEnvironmentLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedEnvironments, setSelectedEnvironments),
          palette: getEnvironmentPalette(value),
        }
      }),
    },
    {
      title: 'Priority',
      options: uniquePriorities.map((priority) => {
        const value = String(priority)
        const checked = selectedPriorities.includes(value)
        return {
          key: `priority-${value}`,
          label: getPriorityLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedPriorities, setSelectedPriorities),
          palette: getPriorityPalette(value),
        }
      }),
    },
    {
      title: 'Status',
      options: uniqueStatuses.map((status) => {
        const value = String(status)
        const checked = selectedStatuses.includes(value)
        return {
          key: `status-${value}`,
          label: getStatusLabel(value),
          checked,
          onToggle: () => toggleFilter(value, selectedStatuses, setSelectedStatuses),
          palette: getStatusPalette(value),
        }
      }),
    },
  ]

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden gap-4 p-4" style={{ background: 'rgb(var(--hud-bg))' }}>
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <FiltersSidebar
          activeFiltersCount={activeFiltersCount}
          onClearAllFilters={clearAllFilters}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sections={sidebarSections}
          serviceFilter={{
            title: 'Service',
            searchQuery: serviceSearch,
            onSearchQueryChange: setServiceSearch,
            options: filteredCatalogServices.map((service: string) => ({
              key: `service-${service}`,
              label: service,
              checked: selectedServices.includes(service),
              onToggle: () => toggleFilter(service, selectedServices, setSelectedServices),
            })),
            emptyText: 'No services found',
            noDataText: catalogLoading ? 'Loading...' : 'No services',
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0">
        {/* Header */}
        <div>
          <PageFiltersHeader
            title="Events Calendar"
            subtitle={`${events.length} event${events.length > 1 ? 's' : ''}${activeFiltersCount > 0 ? ` • ${activeFiltersCount} active` : ''}`}
            filterCount={activeFiltersCount}
            isSidebarOpen={showSidebar}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onClearAllFilters={clearAllFilters}
            tags={activeFilterTags}
          />
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
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
                                const chipRisk = assessAppEvent(event, riskContext)
                                return (
                                  <div
                                    key={idx}
                                    className="text-[10px] font-medium px-1.5 py-1 rounded-md truncate leading-tight flex items-center gap-1.5 border"
                                    style={{ background: envPalette.bg, color: envPalette.text, borderColor: envPalette.border }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: getRiskLevelVisual(chipRisk.level).color }}
                                      title={`Risk: ${chipRisk.level} (${chipRisk.score}/100)`}
                                    />
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
                            <div className="flex items-center justify-between gap-1.5 mb-1">
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
                              {(() => {
                                const rk = assessAppEvent(event, riskContext)
                                return <RiskScoreBadge level={rk.level} score={rk.score} />
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
          riskContext={riskContext}
        />
      )}
    </div>
  )
}
