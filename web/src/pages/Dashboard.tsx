import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { AlertCircle, CheckCircle, Clock, TrendingUp, Plus, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Status, Priority } from '../types/api'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor, isEventApproved } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsApi.today({ perPage: 100 }),
  })

  const events = todayEvents?.events || []

  // Détecter les chevauchements d'événements
  const overlappingEvents = useMemo(() => {
    const overlaps: Array<{ event1: Event; event2: Event }> = []
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i]
        const event2 = events[j]
        
        const start1Str = event1.attributes.startDate || event1.metadata?.createdAt
        const start2Str = event2.attributes.startDate || event2.metadata?.createdAt
        if (!start1Str || !start2Str) continue
        
        const start1 = new Date(start1Str)
        const end1 = event1.attributes.endDate ? new Date(event1.attributes.endDate) : start1
        const start2 = new Date(start2Str)
        const end2 = event2.attributes.endDate ? new Date(event2.attributes.endDate) : start2
        
        // Vérifier si les périodes se chevauchent
        if (start1 <= end2 && start2 <= end1) {
          overlaps.push({ event1, event2 })
        }
      }
    }
    return overlaps
  }, [events])

  const stats = {
    total: events.length,
    success: events.filter(e => e.attributes.status === Status.SUCCESS).length,
    failure: events.filter(e => e.attributes.status === Status.FAILURE || e.attributes.status === Status.ERROR).length,
    inProgress: events.filter(e => e.attributes.status === Status.START).length,
    critical: events.filter(e => e.attributes.priority === Priority.P1).length,
    overlaps: overlappingEvents.length,
  }

  // Statistiques par type
  const eventsByType = {
    deployment: events.filter(e => String(e.attributes.type).toLowerCase() === 'deployment').length,
    operation: events.filter(e => String(e.attributes.type).toLowerCase() === 'operation').length,
    drift: events.filter(e => String(e.attributes.type).toLowerCase() === 'drift').length,
    incident: events.filter(e => String(e.attributes.type).toLowerCase() === 'incident').length,
  }

  // Statistiques par environnement
  const eventsByEnv = events.reduce((acc, e) => {
    const env = String(e.attributes.environment || 'unknown').toLowerCase()
    acc[env] = (acc[env] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Statistiques par priorité
  const eventsByPriority = {
    p1: events.filter(e => String(e.attributes.priority).toLowerCase() === 'p1').length,
    p2: events.filter(e => String(e.attributes.priority).toLowerCase() === 'p2').length,
    p3: events.filter(e => String(e.attributes.priority).toLowerCase() === 'p3').length,
    p4: events.filter(e => String(e.attributes.priority).toLowerCase() === 'p4').length,
    p5: events.filter(e => String(e.attributes.priority).toLowerCase() === 'p5').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of today's events</p>
        </div>
        <Link to="/events/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Events Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[140px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Total Events</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{stats.total}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg"></div>
                <TrendingUp className="relative w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Success Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[140px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Success</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{stats.success}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg"></div>
                <CheckCircle className="relative w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Failures Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[140px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Failures</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{stats.failure}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                <AlertCircle className="relative w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-yellow-50/50 dark:from-slate-800 dark:to-yellow-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[140px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">In Progress</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{stats.inProgress}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-lg"></div>
                <Clock className="relative w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Overlaps Card */}
        <div className="relative group h-full">
          <div className={`absolute inset-0 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 ${
            stats.overlaps > 0 
              ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 animate-pulse' 
              : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20'
          }`}></div>
          <div className={`relative card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full ${
            stats.overlaps > 0
              ? 'bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-orange-900/10'
              : 'bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-gray-900/10'
          }`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${
              stats.overlaps > 0
                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                : 'bg-gradient-to-r from-gray-500 to-slate-500'
            }`}></div>
            <div className="flex items-center justify-between p-6 min-h-[140px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    stats.overlaps > 0 ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <p className={`text-sm font-semibold uppercase tracking-wide ${
                    stats.overlaps > 0 
                      ? 'text-orange-700 dark:text-orange-400' 
                      : 'text-gray-700 dark:text-gray-400'
                  }`}>Overlaps</p>
                </div>
                <p className={`text-4xl font-black ${
                  stats.overlaps > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-slate-900 dark:text-slate-100'
                }`}>{stats.overlaps}</p>
              </div>
              <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-lg ${
                  stats.overlaps > 0 ? 'bg-orange-500/20' : 'bg-gray-500/20'
                }`}></div>
                <AlertTriangle className={`relative w-12 h-12 ${
                  stats.overlaps > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte de chevauchements */}
      {stats.overlaps > 0 && (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-xl blur-xl animate-pulse"></div>
          <div className="relative card border-0 bg-gradient-to-br from-orange-50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/10 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500 animate-pulse"></div>
            <div className="flex items-start space-x-3 p-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-lg animate-pulse"></div>
                  <AlertTriangle className="relative h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold bg-gradient-to-r from-orange-900 to-red-900 dark:from-orange-100 dark:to-red-100 bg-clip-text text-transparent mb-2">
                ⚠️ Overlapping Events Detected
              </h3>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">
                {stats.overlaps} event overlap{stats.overlaps > 1 ? 's' : ''} detected today. Multiple events are running simultaneously.
              </p>
              <div className="space-y-2">
                {overlappingEvents.slice(0, 5).map((overlap, idx) => (
                  <div key={idx} className="text-sm bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        <span className="font-semibold">{overlap.event1.title}</span>
                        <span className="text-gray-500 dark:text-gray-400 mx-1">overlaps with</span>
                        <span className="font-semibold">{overlap.event2.title}</span>
                      </span>
                    </div>
                  </div>
                ))}
                {overlappingEvents.length > 5 && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 italic font-medium">
                    ... and {overlappingEvents.length - 5} more overlap{overlappingEvents.length - 5 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Diagrammes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagramme par Type */}
        <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">Events by Type</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  {getEventTypeIcon('deployment', 'w-4 h-4')}
                  <span>Deployments</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.deployment}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.deployment / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  {getEventTypeIcon('operation', 'w-4 h-4')}
                  <span>Operations</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.operation}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.operation / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  {getEventTypeIcon('drift', 'w-4 h-4')}
                  <span>Drifts</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.drift}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.drift / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  {getEventTypeIcon('incident', 'w-4 h-4')}
                  <span>Incidents</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.incident}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.incident / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagramme par Statut */}
        <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">Events by Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Success</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.success}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Failures</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.failure}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.failure / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span>En cours</span>
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.inProgress}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagramme par Priorité */}
        <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">Events by Priority</h3>
          <div className="space-y-3">
            {Object.entries(eventsByPriority).map(([priority, count]) => (
              <div key={priority}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{priority.toUpperCase()}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      priority === 'p1' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      priority === 'p2' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                      priority === 'p3' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagramme par Environnement */}
        <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">Events by Environment</h3>
          <div className="space-y-3">
            {Object.entries(eventsByEnv).sort((a, b) => b[1] - a[1]).map(([env, count]) => (
              <div key={env}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{getEnvironmentLabel(env) || env}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      env === 'production' || env === '7' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      env === 'preproduction' || env === '6' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                      env === 'development' || env === '1' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">Recent Events</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">LIVE</span>
          </div>
        </div>
        <div className="space-y-3">
          {events.slice(0, 10).map((event) => {
            console.log('Dashboard event:', event.title, 'type:', event.attributes.type, 'typeof:', typeof event.attributes.type)
            const typeColor = getEventTypeColor(event.attributes.type)
            return (
              <div 
                key={event.metadata?.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {getEventTypeIcon(event.attributes.type, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-xs font-semibold">
                        {event.attributes.service}
                      </span>
                      <SourceIcon source={event.attributes.source} className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor.bg} ${typeColor.text}`}>
                    {getEventTypeLabel(event.attributes.type)}
                  </span>
                  {event.attributes.environment && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEnvironmentColor(event.attributes.environment).bg} ${getEnvironmentColor(event.attributes.environment).text}`}>
                      {getEnvironmentLabel(event.attributes.environment)}
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(event.attributes.priority).bg} ${getPriorityColor(event.attributes.priority).text}`}>
                    {getPriorityLabel(event.attributes.priority)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.attributes.status).bg} ${getStatusColor(event.attributes.status).text}`}>
                    {getStatusLabel(event.attributes.status)}
                  </span>
                  {isEventApproved(event) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  )}
                </div>
              </div>
            )
          })}
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
