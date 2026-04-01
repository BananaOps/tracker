import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType, Environment, Event } from '../types/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Calendar, Filter, TrendingUp, Activity, AlertTriangle, Zap, GitBranch, X, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO, addDays } from 'date-fns'
import ProjectStatsCard from '../components/ProjectStatsCard'
import Combobox from '../components/Combobox'

interface InsightFilters {
  environment: Environment | 'all'
  service: string | 'all'
}

interface ChartData {
  date: string
  deployments: number
  incidents: number
  operations: number
  drifts: number
}

interface ServiceBreakdown {
  service: string
  count: number
  percentage: number
}

interface ProjectBreakdown {
  project: string
  deployments: number
  incidents: number
  operations: number
  drifts: number
  total: number
}

interface EventTypeData {
  type: string
  count: number
  successRate: number
  avgDuration?: number
}

interface EventDetailsModal {
  isOpen: boolean
  title: string
  events: Event[]
  type: 'project' | 'date' | null
}

const COLORS = {
  deployments: '#10b981',
  incidents:   '#ef4444',
  operations:  '#3b82f6',
  drifts:      '#f59e0b'
}

export default function Insights() {
  // ── Design tokens ────────────────────────────────────────────────────────────
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:           'rgb(var(--hud-bg))',
    surface:      'rgb(var(--hud-surface))',
    surfaceLow:   'rgb(var(--hud-surface-low))',
    surfaceHigh:  'rgb(var(--hud-surface-high))',
    primary:      'rgb(var(--hud-primary))',
    primaryDim:   'rgb(var(--hud-primary-dim))',
    tertiary:     'rgb(var(--hud-tertiary))',
    error:        'rgb(var(--hud-error))',
    success:      'rgb(var(--hud-success))',
    onSurface:    'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
  }

  const [filters, setFilters] = useState<InsightFilters>({ environment: 'all', service: 'all' })
  const [eventModal, setEventModal] = useState<EventDetailsModal>({ isOpen: false, title: '', events: [], type: null })
  const [selectedDays, setSelectedDays] = useState<number>(30)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)

  const startDate = useMemo(() => {
    if (isCustomPeriod && customStartDate) return customStartDate
    return format(subDays(new Date(), selectedDays), 'yyyy-MM-dd')
  }, [selectedDays, isCustomPeriod, customStartDate])

  const endDate = useMemo(() => {
    if (isCustomPeriod && customEndDate) return customEndDate
    return format(new Date(), 'yyyy-MM-dd')
  }, [isCustomPeriod, customEndDate])

  const handlePeriodChange = (days: number) => {
    if (days === -1) {
      setIsCustomPeriod(true)
      setCustomStartDate(format(new Date(), 'yyyy-MM-dd'))
      setCustomEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
    } else {
      setIsCustomPeriod(false)
      setSelectedDays(days)
    }
  }

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', 'insights', startDate, endDate, filters],
    queryFn: () => eventsApi.search({
      startDate: `${startDate}T00:00:00Z`,
      endDate: `${endDate}T23:59:59Z`,
      environment: filters.environment !== 'all' ? filters.environment : undefined,
      service: filters.service !== 'all' ? filters.service : undefined,
    }),
  })

  const events = eventsData?.events || []

  const uniqueServices = useMemo(() => {
    const services = new Set(events.map(e => e.attributes.service).filter(Boolean))
    return Array.from(services).sort()
  }, [events])

  const filteredEvents = events

  const chartData = useMemo(() => {
    const dateRange = eachDayOfInterval({ start: subDays(new Date(), selectedDays - 1), end: new Date() })
    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = format(parseISO(event.metadata?.createdAt || ''), 'yyyy-MM-dd')
        return eventDate === dateStr
      })
      return {
        date: format(date, 'MM/dd'),
        deployments: dayEvents.filter(e => e.attributes.type === EventType.DEPLOYMENT).length,
        incidents: dayEvents.filter(e => e.attributes.type === EventType.INCIDENT).length,
        operations: dayEvents.filter(e => e.attributes.type === EventType.OPERATION).length,
        drifts: dayEvents.filter(e => e.attributes.type === EventType.DRIFT).length,
      }
    })
  }, [filteredEvents, selectedDays])

  const metrics = useMemo(() => {
    const deployments = filteredEvents.filter(e => e.attributes.type === EventType.DEPLOYMENT)
    const incidents = filteredEvents.filter(e => e.attributes.type === EventType.INCIDENT)
    const operations = filteredEvents.filter(e => e.attributes.type === EventType.OPERATION)
    const drifts = filteredEvents.filter(e => e.attributes.type === EventType.DRIFT)
    return {
      total: filteredEvents.length,
      deployments: deployments.length,
      incidents: incidents.length,
      operations: operations.length,
      drifts: drifts.length,
      successRate: deployments.length > 0
        ? Math.round((deployments.filter(e => e.attributes.status === 'success').length / deployments.length) * 100)
        : 0
    }
  }, [filteredEvents])

  const projectBreakdown = useMemo(() => {
    const projectCount = new Map<string, { [key: string]: number }>()
    filteredEvents.forEach(event => {
      const project = event.attributes.service?.split('-')[0] || 'Unknown'
      const type = event.attributes.type
      if (!projectCount.has(project)) {
        projectCount.set(project, { deployments: 0, incidents: 0, operations: 0, drifts: 0 })
      }
      const counts = projectCount.get(project)!
      if (type === EventType.DEPLOYMENT) counts.deployments++
      else if (type === EventType.INCIDENT) counts.incidents++
      else if (type === EventType.OPERATION) counts.operations++
      else if (type === EventType.DRIFT) counts.drifts++
    })
    return Array.from(projectCount.entries())
      .map(([project, counts]) => ({ project, total: counts.deployments + counts.incidents + counts.operations + counts.drifts, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [filteredEvents])

  const pieData = useMemo(() => [
    { name: 'Deployments', value: metrics.deployments, color: COLORS.deployments },
    { name: 'Incidents', value: metrics.incidents, color: COLORS.incidents },
    { name: 'Operations', value: metrics.operations, color: COLORS.operations },
    { name: 'Drifts', value: metrics.drifts, color: COLORS.drifts },
  ].filter(item => item.value > 0), [metrics])

  const handleProjectClick = (projectName: string) => {
    const projectEvents = filteredEvents.filter(event => event.attributes.service?.startsWith(projectName))
    setEventModal({ isOpen: true, title: `Events for Project: ${projectName}`, events: projectEvents, type: 'project' })
  }

  const handleChartClick = (data: any) => {
    if (!data || !data.activeLabel) return
    const clickedDate = data.activeLabel
    const fullDate = format(subDays(new Date(), 29 - chartData.findIndex(d => d.date === clickedDate)), 'yyyy-MM-dd')
    const dayEvents = filteredEvents.filter(event => {
      const eventDate = format(parseISO(event.metadata?.createdAt || ''), 'yyyy-MM-dd')
      return eventDate === fullDate
    })
    setEventModal({ isOpen: true, title: `Events for ${clickedDate}`, events: dayEvents, type: 'date' })
  }

  const closeModal = () => setEventModal({ isOpen: false, title: '', events: [], type: null })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" style={{ color: T.success }} />
      case 'failure': return <XCircle className="w-4 h-4" style={{ color: T.error }} />
      case 'warning': return <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
      default: return <Clock className="w-4 h-4" style={{ color: T.onSurfaceVar }} />
    }
  }

  const tooltipStyle = {
    backgroundColor: 'rgb(var(--hud-surface))',
    border: `1px solid ${a('outline-var', 0.3)}`,
    borderRadius: '10px',
    color: T.onSurface,
    fontSize: '13px',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: T.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: T.bg, color: T.onSurface }}>
      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Insights
          </h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: T.onSurfaceVar }}>
            <Calendar className="w-4 h-4" />
            {isCustomPeriod
              ? `Custom: ${format(new Date(startDate), 'dd/MM/yyyy')} – ${format(new Date(endDate), 'dd/MM/yyyy')}`
              : `Last ${selectedDays} days (${format(subDays(new Date(), selectedDays - 1), 'dd/MM')} – ${format(new Date(), 'dd/MM')})`
            }
          </p>
        </div>

        {/* Filters */}
        <div className="p-5 rounded-xl" style={{ background: T.surface }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              <Filter className="w-4 h-4 flex-shrink-0" style={{ color: T.onSurfaceVar }} />
              <Combobox
                label="Environment"
                value={filters.environment}
                onChange={(value) => setFilters(prev => ({ ...prev, environment: value as Environment | 'all' }))}
                options={[
                  { value: 'all', label: 'All environments' },
                  { value: Environment.DEVELOPMENT, label: 'Development' },
                  { value: Environment.INTEGRATION, label: 'Integration' },
                  { value: Environment.TNR, label: 'TNR' },
                  { value: Environment.UAT, label: 'UAT' },
                  { value: Environment.RECETTE, label: 'Recette' },
                  { value: Environment.PREPRODUCTION, label: 'Preproduction' },
                  { value: Environment.PRODUCTION, label: 'Production' },
                  { value: Environment.MCO, label: 'MCO' },
                ]}
                placeholder="Select environment..."
                className="w-64"
              />
              <Combobox
                label="Service"
                value={filters.service}
                onChange={(value) => setFilters(prev => ({ ...prev, service: value }))}
                options={[
                  { value: 'all', label: 'All services' },
                  ...uniqueServices.map(service => ({ value: service, label: service }))
                ]}
                placeholder="Select service..."
                className="w-64"
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Period</label>
                <select
                  value={isCustomPeriod ? -1 : selectedDays}
                  onChange={(e) => handlePeriodChange(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none border-0 w-36"
                  style={{ background: T.surfaceLow, color: T.onSurface }}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={-1}>Custom</option>
                </select>
              </div>
            </div>

            {isCustomPeriod && (
              <div className="flex items-center gap-4 flex-wrap pt-4" style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }}>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium" style={{ color: T.onSurfaceVar }}>Start:</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm focus:outline-none border-0"
                    style={{ background: T.surfaceLow, color: T.onSurface }} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium" style={{ color: T.onSurfaceVar }}>End:</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm focus:outline-none border-0"
                    style={{ background: T.surfaceLow, color: T.onSurface }} />
                </div>
                <button onClick={() => { setIsCustomPeriod(false); setSelectedDays(30) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-all"
                  style={{ color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}`, background: T.surfaceHigh }}>
                  Cancel Custom
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Deployments', value: metrics.deployments, color: COLORS.deployments, pct: metrics.total > 0 ? Math.round((metrics.deployments / metrics.total) * 100) : 0 },
            { label: 'Incidents', value: metrics.incidents, color: COLORS.incidents, pct: metrics.total > 0 ? Math.round((metrics.incidents / metrics.total) * 100) : 0 },
            { label: 'Operations', value: metrics.operations, color: COLORS.operations, pct: metrics.total > 0 ? Math.round((metrics.operations / metrics.total) * 100) : 0 },
            { label: 'Drifts', value: metrics.drifts, color: COLORS.drifts, pct: metrics.total > 0 ? Math.round((metrics.drifts / metrics.total) * 100) : 0 },
          ].map(({ label, value, color, pct }) => (
            <div key={label} className="relative p-6 rounded-xl overflow-hidden"
              style={{ background: T.surfaceLow, borderLeft: `2px solid ${color}` }}>
              <div className="absolute top-3 right-3 w-14 h-14 rounded-full blur-xl opacity-15 pointer-events-none"
                style={{ background: color }} />
              <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>{label}</p>
              <p className="text-4xl font-black mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: a('outline-var', 0.2) }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-xs font-bold" style={{ color: T.onSurfaceVar }}>{pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline + Top Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 p-6 rounded-xl" style={{ background: T.surface }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Timeline Evolution
                </h3>
                <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>Activity across all event types</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.success }} />
                <span className="text-xs font-bold" style={{ color: T.onSurfaceVar }}>LIVE</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="2 4" stroke={a('outline-var', 0.15)} />
                <XAxis dataKey="date" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: T.onSurfaceVar }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.onSurfaceVar }} dx={-8} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.onSurfaceVar, fontWeight: 600 }}
                  cursor={{ stroke: a('outline-var', 0.3), strokeDasharray: '4 4' }} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: T.onSurfaceVar }} />
                <Line type="monotone" dataKey="deployments" stroke={COLORS.deployments} strokeWidth={2} name="Deployments"
                  dot={{ r: 0 }} activeDot={{ r: 5, stroke: COLORS.deployments, strokeWidth: 2, fill: 'white' }} />
                <Line type="monotone" dataKey="incidents" stroke={COLORS.incidents} strokeWidth={2} name="Incidents"
                  dot={{ r: 0 }} activeDot={{ r: 5, stroke: COLORS.incidents, strokeWidth: 2, fill: 'white' }} />
                <Line type="monotone" dataKey="operations" stroke={COLORS.operations} strokeWidth={2} name="Operations"
                  dot={{ r: 0 }} activeDot={{ r: 5, stroke: COLORS.operations, strokeWidth: 2, fill: 'white' }} />
                <Line type="monotone" dataKey="drifts" stroke={COLORS.drifts} strokeWidth={2} name="Drifts"
                  dot={{ r: 0 }} activeDot={{ r: 5, stroke: COLORS.drifts, strokeWidth: 2, fill: 'white' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Projects */}
          <div className="p-6 rounded-xl" style={{ background: T.surface }}>
            <h3 className="text-lg font-bold mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Top Projects
            </h3>
            <div className="space-y-2">
              {projectBreakdown.slice(0, 8).map((project, index) => (
                <div key={project.project} onClick={() => handleProjectClick(project.project)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:opacity-80"
                  style={{ background: index < 3 ? a('primary', 0.08) : a('outline-var', 0.05), border: `1px solid ${index < 3 ? a('primary', 0.2) : a('outline-var', 0.1)}` }}>
                  <span className="text-sm font-bold w-6 text-center" style={{ color: T.onSurfaceVar, fontFamily: "'JetBrains Mono', monospace" }}>
                    {index < 3 ? ['🥇','🥈','🥉'][index] : `#${index+1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.project}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {project.deployments > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${COLORS.deployments}20`, color: COLORS.deployments }}>{project.deployments}d</span>
                      )}
                      {project.incidents > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${COLORS.incidents}20`, color: COLORS.incidents }}>{project.incidents}i</span>
                      )}
                      {project.operations > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${COLORS.operations}20`, color: COLORS.operations }}>{project.operations}o</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xl font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.primary }}>
                    {project.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distribution chart */}
        {pieData.length > 0 && (
          <div className="p-6 rounded-xl" style={{ background: T.surface }}>
            <h3 className="text-lg font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Event Distribution
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width={300} height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {pieData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-sm font-black ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
                      {value}
                    </span>
                    <span className="text-xs" style={{ color: T.onSurfaceVar }}>
                      ({metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
                <div className="pt-3" style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }}>
                  <span className="text-xs font-bold" style={{ color: T.onSurfaceVar }}>Total: </span>
                  <span className="text-sm font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.primary }}>{metrics.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {eventModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{eventModal.title}</h3>
                <p className="text-sm mt-0.5" style={{ color: T.onSurfaceVar }}>
                  {eventModal.events.length} event{eventModal.events.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:opacity-70 transition-all"
                style={{ color: T.onSurfaceVar }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto p-6 space-y-3">
              {eventModal.events.length === 0 ? (
                <div className="text-center py-8" style={{ color: T.onSurfaceVar }}>No events found</div>
              ) : (
                eventModal.events.map((event) => (
                  <div key={event.metadata?.id} className="p-4 rounded-xl"
                    style={{ background: T.surfaceLow, border: `1px solid ${a('outline-var', 0.1)}` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: a('primary', 0.1), color: T.primary }}>{event.attributes.type}</span>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(event.attributes.status)}
                            <span className="text-xs capitalize" style={{ color: T.onSurfaceVar }}>{event.attributes.status}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {[
                            ['Service', event.attributes.service],
                            ['Environment', event.attributes.environment],
                            ['Priority', event.attributes.priority],
                            ['Created', event.metadata?.createdAt ? format(parseISO(event.metadata.createdAt), 'dd/MM HH:mm') : 'N/A'],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <span style={{ color: T.onSurfaceVar }}>{label}:</span>
                              <p className="font-medium mt-0.5">{val || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                        {event.attributes.message && (
                          <p className="text-xs mt-3 p-2 rounded-lg" style={{ background: T.surfaceHigh, color: T.onSurfaceVar }}>
                            {event.attributes.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end p-6" style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }}>
              <button onClick={closeModal}
                className="px-6 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-all"
                style={{ color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}`, background: T.surfaceHigh }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative glow */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: a('primary', 0.04) }} />
    </div>
  )
}
