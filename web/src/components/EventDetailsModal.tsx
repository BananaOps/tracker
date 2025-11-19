import { X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Event } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEventTypeColor, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from './EventLinks'

interface EventDetailsModalProps {
  event: Event
  onClose: () => void
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const typeColor = getEventTypeColor(event.attributes.type)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getEventTypeIcon(event.attributes.type, 'w-6 h-6')}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Event Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Title */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {event.title}
              </h3>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${typeColor.bg} ${typeColor.text}`}>
                  {getEventTypeLabel(event.attributes.type)}
                </span>
                {event.attributes.environment && (
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getEnvironmentColor(event.attributes.environment).bg} ${getEnvironmentColor(event.attributes.environment).text}`}>
                    {getEnvironmentLabel(event.attributes.environment)}
                  </span>
                )}
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(event.attributes.priority).bg} ${getPriorityColor(event.attributes.priority).text}`}>
                  {getPriorityLabel(event.attributes.priority)}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(event.attributes.status).bg} ${getStatusColor(event.attributes.status).text}`}>
                  {getStatusLabel(event.attributes.status)}
                </span>
              </div>
            </div>

            {/* Message */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{event.attributes.message}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Service</h4>
                <p className="text-gray-900 dark:text-gray-100">{event.attributes.service}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Source</h4>
                <div className="flex items-center space-x-2">
                  <SourceIcon source={event.attributes.source} />
                  <p className="text-gray-900 dark:text-gray-100">{event.attributes.source}</p>
                </div>
              </div>

              {event.attributes.owner && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Owner</h4>
                  <p className="text-gray-900 dark:text-gray-100">{event.attributes.owner}</p>
                </div>
              )}

              {event.metadata?.createdAt && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Created At</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {format(new Date(event.metadata.createdAt), 'PPpp', { locale: fr })}
                  </p>
                </div>
              )}

              {event.attributes.startDate && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {format(new Date(event.attributes.startDate), 'PPpp', { locale: fr })}
                  </p>
                </div>
              )}

              {event.attributes.endDate && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {format(new Date(event.attributes.endDate), 'PPpp', { locale: fr })}
                  </p>
                </div>
              )}

              {event.metadata?.id && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Event ID</h4>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{event.metadata.id}</p>
                </div>
              )}

              {event.metadata?.slackId && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Slack ID</h4>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{event.metadata.slackId}</p>
                </div>
              )}
            </div>

            {/* Stakeholders */}
            {event.attributes.stakeHolders && event.attributes.stakeHolders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stakeholders</h4>
                <div className="flex flex-wrap gap-2">
                  {event.attributes.stakeHolders.map((stakeholder, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm">
                      {stakeholder}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(event.links?.pullRequestLink || event.links?.ticket) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Links</h4>
                <EventLinks 
                  links={event.links}
                  source={event.attributes.source}
                  slackId={event.metadata?.slackId}
                />
              </div>
            )}

            {/* Impact (for drifts) */}
            {event.attributes.impact !== undefined && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Impact</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.attributes.impact 
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' 
                    : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                }`}>
                  {event.attributes.impact ? 'Has Impact' : 'No Impact'}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4">
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
