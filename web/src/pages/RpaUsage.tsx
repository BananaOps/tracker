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
import { faWrench } from '@fortawesome/free-solid-svg-icons'
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
            <FontAwesomeIcon icon={faWrench} className="h-6 w-6 text-purple-600" />
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

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Operations</h3>
        <div className="space-y-3">
          {rpaOperations.slice(0, 10).map((op) => (
            <div 
              key={op.metadata?.id} 
              className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSelectedEvent(op)}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{op.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{op.attributes.message}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Service:</span>
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono font-semibold">
                      {op.attributes.service}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">Source: <span className="font-medium text-gray-700 dark:text-gray-300">{op.attributes.source}</span></span>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                {op.metadata?.createdAt && (
                  <time>
                    {format(new Date(op.metadata.createdAt), 'PPp', { locale: fr })}
                  </time>
                )}
              </div>
            </div>
          ))}
        </div>
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
