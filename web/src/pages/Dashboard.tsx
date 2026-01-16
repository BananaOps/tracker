import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { AlertCircle, CheckCircle, Clock, TrendingUp, Plus, AlertTriangle, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Status, Priority } from '../types/api'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeColor, getEventTypeLabel, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor, isEventApproved } from '../lib/eventUtils'
import { SourceIcon } from '../components/EventLinks'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => eventsApi.today({ perPage: 100 }),
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  })

  const events = todayEvents?.events || []

  // Détecter les chevauchements d'événements
  const overlappingEvents = useMemo(() => {
    const overlaps: Array<{ event1: Event; event2: Event }> = []
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i]
        const event2 = events[j]
        
        // Vérifier que les événements concernent le même environnement
        if (event1.attributes.environment !== event2.attributes.environment) continue
        
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of today's events</p>
        </div>
        <Link to="/events/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats Cards avec effets neon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Events Card */}
        <Card 
          className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            borderTop: '4px solid #6366f1',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
          }}
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.total}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-indigo-600 dark:text-indigo-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        {/* Success Card */}
        <Card 
          className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%)',
            borderTop: '4px solid #22c55e',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
          }}
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Success</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.success}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        {/* Failures Card */}
        <Card 
          className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)',
            borderTop: '4px solid #ef4444',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
          }}
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Failures</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.failure}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        {/* In Progress Card */}
        <Card 
          className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(161, 98, 7, 0.1) 100%)',
            borderTop: '4px solid #eab308',
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)'
          }}
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">In Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.inProgress}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        {/* Overlaps Card */}
        <Card 
          className={`relative overflow-hidden group hover:shadow-2xl transition-all duration-300 ${
            stats.overlaps > 0 ? 'animate-pulse' : ''
          }`}
          style={{
            background: stats.overlaps > 0 
              ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)',
            borderTop: stats.overlaps > 0 ? '4px solid #f97316' : '4px solid #6b7280',
            boxShadow: stats.overlaps > 0 ? '0 0 20px rgba(249, 115, 22, 0.3)' : '0 0 20px rgba(107, 114, 128, 0.2)'
          }}
        >
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
            stats.overlaps > 0 ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'
          }`} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${
                  stats.overlaps > 0 
                    ? 'text-orange-700 dark:text-orange-400' 
                    : 'text-gray-700 dark:text-gray-400'
                }`}>Overlaps</p>
                <p className={`text-3xl font-bold mt-2 ${
                  stats.overlaps > 0 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>{stats.overlaps}</p>
              </div>
              <AlertTriangle className={`w-10 h-10 opacity-80 ${
                stats.overlaps > 0 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte de chevauchements */}
      {stats.overlaps > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  Overlapping Events Detected
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  {stats.overlaps} event overlap{stats.overlaps > 1 ? 's' : ''} detected today. Multiple events are running simultaneously in the same environment.
                </p>
                <div className="space-y-2">
                  {overlappingEvents.slice(0, 5).map((overlap, idx) => (
                    <div key={idx} className="text-sm bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                      <span className="text-gray-900 dark:text-gray-100">
                        <span className="font-semibold">{overlap.event1.title}</span>
                        <span className="text-gray-500 dark:text-gray-400 mx-1">overlaps with</span>
                        <span className="font-semibold">{overlap.event2.title}</span>
                      </span>
                    </div>
                  ))}
                  {overlappingEvents.length > 5 && (
                    <p className="text-xs text-orange-700 dark:text-orange-300 italic">
                      ... and {overlappingEvents.length - 5} more overlap{overlappingEvents.length - 5 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Events by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events by Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {getEventTypeIcon('deployment', 'w-4 h-4')}
                  Deployments
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.deployment}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.deployment / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {getEventTypeIcon('operation', 'w-4 h-4')}
                  Operations
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.operation}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.operation / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {getEventTypeIcon('drift', 'w-4 h-4')}
                  Drifts
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.drift}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.drift / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  {getEventTypeIcon('incident', 'w-4 h-4')}
                  Incidents
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eventsByType.incident}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (eventsByType.incident / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Success
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.success}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Failures
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.failure}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.failure / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  In Progress
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stats.inProgress}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(eventsByPriority).map(([priority, count]) => (
              <div key={priority}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{priority}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      priority === 'p1' ? 'bg-red-600' :
                      priority === 'p2' ? 'bg-orange-600' :
                      priority === 'p3' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Events by Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events by Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(eventsByEnv).sort((a, b) => b[1] - a[1]).map(([env, count]) => (
              <div key={env}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {getEnvironmentLabel(env) || env}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      env === 'production' || env === '7' ? 'bg-red-600' :
                      env === 'preproduction' || env === '6' ? 'bg-orange-600' :
                      env === 'development' || env === '1' ? 'bg-green-600' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Events</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">LIVE</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => {
              const typeColor = getEventTypeColor(event.attributes.type)
              return (
                <div 
                  key={event.metadata?.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getEventTypeIcon(event.attributes.type, 'w-5 h-5')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {event.attributes.service}
                        </Badge>
                        <SourceIcon source={event.attributes.source} className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${typeColor.bg} ${typeColor.text} border-0`}>
                      {getEventTypeLabel(event.attributes.type)}
                    </Badge>
                    {event.attributes.environment && (
                      <Badge className={`text-xs ${getEnvironmentColor(event.attributes.environment).bg} ${getEnvironmentColor(event.attributes.environment).text} border-0`}>
                        {getEnvironmentLabel(event.attributes.environment)}
                      </Badge>
                    )}
                    <Badge className={`text-xs ${getPriorityColor(event.attributes.priority).bg} ${getPriorityColor(event.attributes.priority).text} border-0`}>
                      {getPriorityLabel(event.attributes.priority)}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(event.attributes.status).bg} ${getStatusColor(event.attributes.status).text} border-0`}>
                      {getStatusLabel(event.attributes.status)}
                    </Badge>
                    {isEventApproved(event) && (
                      <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
