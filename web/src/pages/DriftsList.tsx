import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType, Status } from '../types/api'
import type { Event } from '../types/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import EventDetailsModal from '../components/EventDetailsModal'

export default function DriftsList() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'drifts'],
    queryFn: () => eventsApi.search({ type: EventType.DRIFT as unknown as number }),
  })

  const drifts = data?.events || []

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuration Drifts</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configuration drift detection ({drifts.length} drifts detected)
          </p>
        </div>
        <Link to="/drifts/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Drift</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCodeBranch} className="h-6 w-6 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Drifts</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{drifts.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unresolved</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {drifts.filter(d => d.attributes.status !== Status.DONE && d.attributes.status !== Status.CLOSE).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCodeBranch} className="h-6 w-6 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {drifts.filter(d => d.attributes.status === Status.DONE || d.attributes.status === Status.CLOSE).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {drifts.map((drift) => (
          <div 
            key={drift.metadata?.id} 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedEvent(drift)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                  <FontAwesomeIcon icon={faCodeBranch} className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words flex-1 min-w-0">{drift.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    drift.attributes.status === Status.DONE || drift.attributes.status === Status.CLOSE
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {drift.attributes.status === Status.DONE || drift.attributes.status === Status.CLOSE
                      ? 'Resolved'
                      : 'In Progress'}
                  </span>
                </div>

                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{drift.attributes.message}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">{drift.attributes.service}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">{drift.attributes.source}</span>
                  </div>
                  {drift.attributes.environment && (
                    <div className="min-w-0">
                      <span className="text-gray-500">Environment:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">
                        {drift.attributes.environment}
                      </span>
                    </div>
                  )}
                  {drift.attributes.owner && (
                    <div className="min-w-0">
                      <span className="text-gray-500">Owner:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 break-words">{drift.attributes.owner}</span>
                    </div>
                  )}
                </div>

                {drift.links?.ticket && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Ticket: </span>
                    <span className="text-sm font-medium text-primary-600 break-words">{drift.links.ticket}</span>
                  </div>
                )}
              </div>

              <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0">
                {drift.metadata?.createdAt && (
                  <time>
                    {format(new Date(drift.metadata.createdAt), 'PPp', { locale: fr })}
                  </time>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {drifts.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No drifts detected
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
