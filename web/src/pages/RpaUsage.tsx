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

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {/* Total RPA Operations Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-purple-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Total RPA Operations</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{rpaOperations.length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg"></div>
                <FontAwesomeIcon icon={faRobot} className="relative h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* This Month Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">This Month</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{thisMonthOps.length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg"></div>
                <TrendingUp className="relative h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* RPA Services Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-indigo-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">RPA Services</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{Object.keys(byService).length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-lg"></div>
                <Clock className="relative h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
        <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">Usage by Service</h3>
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
