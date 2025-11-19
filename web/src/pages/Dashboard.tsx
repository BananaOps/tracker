import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { AlertCircle, CheckCircle, Clock, TrendingUp, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Status, Priority } from '../types/api'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsApi.today({ perPage: 100 }),
  })

  const events = todayEvents?.events || []

  const stats = {
    total: events.length,
    success: events.filter(e => e.attributes.status === Status.SUCCESS).length,
    failure: events.filter(e => e.attributes.status === Status.FAILURE || e.attributes.status === Status.ERROR).length,
    inProgress: events.filter(e => e.attributes.status === Status.START).length,
    critical: events.filter(e => e.attributes.priority === Priority.P1).length,
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Events</dt>
                <dd className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Success</dt>
                <dd className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.success}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Failures</dt>
                <dd className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.failure}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">En cours</dt>
                <dd className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.inProgress}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Diagrammes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagramme par Type */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Events by Type</h3>
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Events by Status</h3>
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Events by Priority</h3>
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Events by Environment</h3>
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

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Events</h3>
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
