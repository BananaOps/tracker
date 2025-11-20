import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType } from '../types/api'
import type { Event } from '../types/api'
import { TrendingUp, Clock, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import EventDetailsModal from '../components/EventDetailsModal'

export default function RpaUsage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'rpa_usage'],
    queryFn: () => eventsApi.search({ type: EventType.RPA_USAGE as unknown as number }),
  })

  const rpaOperations = data?.events || []

  // Statistiques
  const currentMonth = new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const thisMonthOps = rpaOperations.filter(op => {
    if (!op.metadata?.createdAt) return false
    const date = new Date(op.metadata.createdAt)
    return date >= monthStart && date <= monthEnd
  })

  // Grouper par service
  const byService = rpaOperations.reduce((acc, op) => {
    const service = op.attributes.service
    if (!acc[service]) {
      acc[service] = []
    }
    acc[service].push(op)
    return acc
  }, {} as Record<string, typeof rpaOperations>)

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">RPA Usage</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track RPA (Robotic Process Automation) process usage
          </p>
        </div>
        <Link to="/rpa/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create RPA Operation</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faRobot} className="h-6 w-6 icon-gradient" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total RPA Operations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{rpaOperations.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{thisMonthOps.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">RPA Services</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{Object.keys(byService).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Usage by Service</h3>
        <div className="space-y-4">
          {Object.entries(byService).map(([service, ops]) => (
            <div key={service} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{service}</h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">{ops.length} operations</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(ops.length / rpaOperations.length) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {rpaOperations.slice(0, 10).map((op) => (
          <div 
            key={op.metadata?.id} 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedEvent(op)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                  <FontAwesomeIcon icon={faRobot} className="w-5 h-5 icon-gradient flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words flex-1 min-w-0">{op.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    op.attributes.status === 'success' || op.attributes.status === 'done'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : op.attributes.status === 'failure' || op.attributes.status === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {String(op.attributes.status).charAt(0).toUpperCase() + String(op.attributes.status).slice(1)}
                  </span>
                </div>

                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{op.attributes.message}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Service:</span>
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-xs font-semibold">
                      {op.attributes.service}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-500 dark:text-gray-400">Source:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">{op.attributes.source}</span>
                  </div>
                  {op.attributes.environment && (
                    <div className="min-w-0">
                      <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">
                        {op.attributes.environment}
                      </span>
                    </div>
                  )}
                  {op.attributes.owner && (
                    <div className="min-w-0">
                      <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">{op.attributes.owner}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0">
                {op.metadata?.createdAt && (
                  <time>
                    {format(new Date(op.metadata.createdAt), 'PPp', { locale: fr })}
                  </time>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rpaOperations.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No RPA operations recorded
        </div>
      )}

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
