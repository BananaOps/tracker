import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Status, Priority, EventType } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'

export default function Dashboard() {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Vue d'ensemble des événements du jour</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.total}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Succès</dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.success}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Échecs</dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.failure}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">En cours</dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.inProgress}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Événements récents</h3>
        <div className="space-y-3">
          {events.slice(0, 10).map((event) => {
            console.log('Dashboard event:', event.title, 'type:', event.attributes.type, 'typeof:', typeof event.attributes.type)
            const typeColor = getEventTypeColor(event.attributes.type)
            return (
              <div key={event.metadata?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {getEventTypeIcon(event.attributes.type, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{event.attributes.service}</span>
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
    </div>
  )
}
