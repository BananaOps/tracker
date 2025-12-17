import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType, Environment, Event } from '../types/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Calendar, Filter, TrendingUp, Activity, AlertTriangle, Zap, GitBranch } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns'
import ProjectStatsCard from '../components/ProjectStatsCard'

interface InsightFilters {
  environment: Environment | 'all'
  service: string | 'all'
  project: string | 'all'
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

const COLORS = {
  deployments: '#10b981', // green
  incidents: '#ef4444',   // red
  operations: '#3b82f6',  // blue
  drifts: '#f59e0b'       // amber
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899']

export default function Insights() {
  const [filters, setFilters] = useState<InsightFilters>({
    environment: 'all',
    service: 'all',
    project: 'all'
  })

  // Calculate start date (30 days back)
  const startDate = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), [])
  const endDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Fetch events from the last 30 days
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

  // Extract unique services and projects for filters
  const uniqueServices = useMemo(() => {
    const services = new Set(events.map(e => e.attributes.service).filter(Boolean))
    return Array.from(services).sort()
  }, [events])

  const uniqueProjects = useMemo(() => {
    // Extract project from service name (e.g., "auth-service" -> "auth")
    const projects = new Set(
      events
        .map(e => e.attributes.service?.split('-')[0])
        .filter(Boolean)
    )
    return Array.from(projects).sort()
  }, [events])

  // Filter events by project if selected
  const filteredEvents = useMemo(() => {
    if (filters.project === 'all') return events
    return events.filter(e => e.attributes.service?.startsWith(filters.project))
  }, [events, filters.project])

  // Prepare data for timeline chart
  const chartData = useMemo(() => {
    const dateRange = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    })

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
  }, [filteredEvents])

  // Calculate global metrics
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

  // Prepare data for service breakdown
  const serviceBreakdown = useMemo(() => {
    const serviceCount = new Map<string, { [key: string]: number }>()
    
    filteredEvents.forEach(event => {
      const service = event.attributes.service || 'Unknown'
      const type = event.attributes.type
      
      if (!serviceCount.has(service)) {
        serviceCount.set(service, {
          deployments: 0,
          incidents: 0,
          operations: 0,
          drifts: 0
        })
      }
      
      const counts = serviceCount.get(service)!
      if (type === EventType.DEPLOYMENT) counts.deployments++
      else if (type === EventType.INCIDENT) counts.incidents++
      else if (type === EventType.OPERATION) counts.operations++
      else if (type === EventType.DRIFT) counts.drifts++
    })

    return Array.from(serviceCount.entries())
      .map(([service, counts]) => ({
        service,
        total: counts.deployments + counts.incidents + counts.operations + counts.drifts,
        ...counts
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) // Top 10 services
  }, [filteredEvents])

  // Prepare data for project breakdown
  const projectBreakdown = useMemo(() => {
    const projectCount = new Map<string, { [key: string]: number }>()
    
    filteredEvents.forEach(event => {
      const project = event.attributes.service?.split('-')[0] || 'Unknown'
      const type = event.attributes.type
      
      if (!projectCount.has(project)) {
        projectCount.set(project, {
          deployments: 0,
          incidents: 0,
          operations: 0,
          drifts: 0
        })
      }
      
      const counts = projectCount.get(project)!
      if (type === EventType.DEPLOYMENT) counts.deployments++
      else if (type === EventType.INCIDENT) counts.incidents++
      else if (type === EventType.OPERATION) counts.operations++
      else if (type === EventType.DRIFT) counts.drifts++
    })

    return Array.from(projectCount.entries())
      .map(([project, counts]) => ({
        project,
        total: counts.deployments + counts.incidents + counts.operations + counts.drifts,
        ...counts
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) // Top 10 projects
  }, [filteredEvents])

  // Data for event type chart
  const eventTypeData = useMemo(() => {
    const types = [
      { type: 'Deployments', key: EventType.DEPLOYMENT, color: COLORS.deployments },
      { type: 'Incidents', key: EventType.INCIDENT, color: COLORS.incidents },
      { type: 'Operations', key: EventType.OPERATION, color: COLORS.operations },
      { type: 'Drifts', key: EventType.DRIFT, color: COLORS.drifts },
    ]

    return types.map(({ type, key, color }) => {
      const typeEvents = filteredEvents.filter(e => e.attributes.type === key)
      const successCount = typeEvents.filter(e => e.attributes.status === 'success').length
      
      return {
        type,
        count: typeEvents.length,
        successRate: typeEvents.length > 0 ? Math.round((successCount / typeEvents.length) * 100) : 0,
        color
      }
    }).filter(item => item.count > 0)
  }, [filteredEvents])

  // Data for pie chart by type
  const pieData = useMemo(() => [
    { name: 'Deployments', value: metrics.deployments, color: COLORS.deployments },
    { name: 'Incidents', value: metrics.incidents, color: COLORS.incidents },
    { name: 'Operations', value: metrics.operations, color: COLORS.operations },
    { name: 'Drifts', value: metrics.drifts, color: COLORS.drifts },
  ].filter(item => item.value > 0), [metrics])

  if (isLoading) {
    return <div className="text-center py-12">Loading insights...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Insights</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            Data from the last 30 days ({format(subDays(new Date(), 29), 'dd/MM')} - {format(new Date(), 'dd/MM')})
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Environment
              </label>
              <select
                id="environment"
                value={filters.environment}
                onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value as Environment | 'all' }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All environments</option>
                <option value={Environment.DEVELOPMENT}>Development</option>
                <option value={Environment.INTEGRATION}>Integration</option>
                <option value={Environment.TNR}>TNR</option>
                <option value={Environment.UAT}>UAT</option>
                <option value={Environment.RECETTE}>Recette</option>
                <option value={Environment.PREPRODUCTION}>Preproduction</option>
                <option value={Environment.PRODUCTION}>Production</option>
                <option value={Environment.MCO}>MCO</option>
              </select>
            </div>
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <select
                id="service"
                value={filters.service}
                onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All services</option>
                {uniqueServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project
              </label>
              <select
                id="project"
                value={filters.project}
                onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All projects</option>
                {uniqueProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Global Metrics by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deployments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.deployments}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.total > 0 ? Math.round((metrics.deployments / metrics.total) * 100) : 0}% of total
              </p>
            </div>
            <GitBranch className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Incidents</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.incidents}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.total > 0 ? Math.round((metrics.incidents / metrics.total) * 100) : 0}% of total
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600 opacity-20" />
          </div>
        </div>
        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Operations</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.operations}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.total > 0 ? Math.round((metrics.operations / metrics.total) * 100) : 0}% of total
              </p>
            </div>
            <Zap className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="card border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Drifts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.drifts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.total > 0 ? Math.round((metrics.drifts / metrics.total) * 100) : 0}% of total
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Main Content: Timeline + Top Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Evolution by Type */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Timeline Evolution by Type</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="deployments" 
                stroke={COLORS.deployments} 
                strokeWidth={3}
                name="Deployments"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke={COLORS.incidents} 
                strokeWidth={3}
                name="Incidents"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="operations" 
                stroke={COLORS.operations} 
                strokeWidth={3}
                name="Operations"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="drifts" 
                stroke={COLORS.drifts} 
                strokeWidth={3}
                name="Drifts"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 8 Projects with Medals */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Projects</h3>
          <div className="space-y-3">
            {projectBreakdown.slice(0, 8).map((project, index) => {
              const getMedalIcon = (rank: number) => {
                if (rank === 1) return <span className="text-2xl">🥇</span>
                if (rank === 2) return <span className="text-2xl">🥈</span>
                if (rank === 3) return <span className="text-2xl">🥉</span>
                return <span className="text-sm font-bold text-gray-400 w-8 text-center">#{rank}</span>
              }

              return (
                <div 
                  key={project.project}
                  className={`p-3 rounded-lg border transition-all ${
                    index < 3 
                      ? 'bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/10 dark:to-gray-800 border-yellow-200 dark:border-yellow-800' 
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getMedalIcon(index + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {project.project}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {project.deployments} dep
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          {project.incidents} inc
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {project.operations} ops
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {project.total}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        events
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>


    </div>
  )
}
