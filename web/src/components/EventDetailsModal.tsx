import { useState, useMemo, useEffect } from 'react'
import { X, Edit2, Save } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import type { Event } from '../types/api'
import { Priority, Status } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEventTypeColor, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from './EventLinks'
import { convertEventForAPI, convertEventFromAPI } from '../lib/apiConverters'
import Toast from './Toast'

interface EventDetailsModalProps {
  event: Event
  onClose: () => void
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  // Convertir les nombres en strings enum si nécessaire
  const normalizedEvent = useMemo(() => {
    const normalized = convertEventFromAPI(event)
    console.log('🔄 Event normalisé:', {
      original: event.attributes.priority,
      normalized: normalized.attributes.priority,
      status_original: event.attributes.status,
      status_normalized: normalized.attributes.status,
    })
    return normalized
  }, [event])
  const [editedEvent, setEditedEvent] = useState(normalizedEvent)
  const queryClient = useQueryClient()
  
  // Mettre à jour editedEvent quand normalizedEvent change
  useEffect(() => {
    setEditedEvent(normalizedEvent)
  }, [normalizedEvent])
  
  const typeColor = getEventTypeColor(editedEvent.attributes.type)

  const updateMutation = useMutation({
    mutationFn: () => {
      const updateData = {
        title: editedEvent.title,
        attributes: editedEvent.attributes,
        links: editedEvent.links,
      }
      // Convertir les enums string en nombres pour l'API
      const convertedData = convertEventForAPI(updateData)
      return eventsApi.update(editedEvent.metadata!.id!, convertedData)
    },
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      // Normaliser la réponse de l'API (nombres -> strings enum)
      const normalized = convertEventFromAPI(updatedEvent)
      setEditedEvent(normalized)
      setIsEditing(false)
      setShowToast(true)
    },
    onError: (error: any) => {
      console.error('Error updating event:', error)
    },
  })

  const handleSave = () => {
    if (!editedEvent.metadata?.id) {
      console.error('Cannot update event: missing ID')
      return
    }
    updateMutation.mutate()
  }

  const handleCancel = () => {
    setEditedEvent(normalizedEvent)
    setIsEditing(false)
  }

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
              {getEventTypeIcon(editedEvent.attributes.type, 'w-6 h-6')}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Event' : 'Event Details'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  title="Edit event"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Title */}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  className="input text-2xl font-bold mb-3"
                  value={editedEvent.title}
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                />
              ) : (
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {editedEvent.title}
                </h3>
              )}
              
              {/* Badges / Selects */}
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      className="select text-sm"
                      value={editedEvent.attributes.priority}
                      onChange={(e) => setEditedEvent({
                        ...editedEvent,
                        attributes: { ...editedEvent.attributes, priority: e.target.value as Priority }
                      })}
                    >
                      <option value={Priority.P1}>P1 - Critical</option>
                      <option value={Priority.P2}>P2 - High</option>
                      <option value={Priority.P3}>P3 - Medium</option>
                      <option value={Priority.P4}>P4 - Low</option>
                      <option value={Priority.P5}>P5 - Very Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      className="select text-sm"
                      value={editedEvent.attributes.status}
                      onChange={(e) => setEditedEvent({
                        ...editedEvent,
                        attributes: { ...editedEvent.attributes, status: e.target.value as Status }
                      })}
                    >
                      <option value={Status.START}>Started</option>
                      <option value={Status.SUCCESS}>Success</option>
                      <option value={Status.FAILURE}>Failed</option>
                      <option value={Status.WARNING}>Warning</option>
                      <option value={Status.ERROR}>Error</option>
                      <option value={Status.DONE}>Done</option>
                      <option value={Status.OPEN}>Open</option>
                      <option value={Status.CLOSE}>Closed</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${typeColor.bg} ${typeColor.text}`}>
                    {getEventTypeLabel(editedEvent.attributes.type)}
                  </span>
                  {editedEvent.attributes.environment && (
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getEnvironmentColor(editedEvent.attributes.environment).bg} ${getEnvironmentColor(editedEvent.attributes.environment).text}`}>
                      {getEnvironmentLabel(editedEvent.attributes.environment)}
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(editedEvent.attributes.priority).bg} ${getPriorityColor(editedEvent.attributes.priority).text}`}>
                    {getPriorityLabel(editedEvent.attributes.priority)}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(editedEvent.attributes.status).bg} ${getStatusColor(editedEvent.attributes.status).text}`}>
                    {getStatusLabel(editedEvent.attributes.status)}
                  </span>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              {isEditing ? (
                <textarea
                  rows={4}
                  className="input"
                  value={editedEvent.attributes.message}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    attributes: { ...editedEvent.attributes, message: e.target.value }
                  })}
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{editedEvent.attributes.message}</p>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Service</h4>
                {isEditing ? (
                  <input
                    type="text"
                    className="input text-sm"
                    value={editedEvent.attributes.service}
                    onChange={(e) => setEditedEvent({
                      ...editedEvent,
                      attributes: { ...editedEvent.attributes, service: e.target.value }
                    })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{editedEvent.attributes.service}</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Source</h4>
                <div className="flex items-center space-x-2">
                  <SourceIcon source={editedEvent.attributes.source} />
                  <p className="text-gray-900 dark:text-gray-100">{editedEvent.attributes.source}</p>
                </div>
              </div>

              {editedEvent.attributes.owner && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Owner</h4>
                  <p className="text-gray-900 dark:text-gray-100">{editedEvent.attributes.owner}</p>
                </div>
              )}

              {editedEvent.metadata?.createdAt && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Created At</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {format(new Date(editedEvent.metadata.createdAt), 'PPpp', { locale: fr })}
                  </p>
                </div>
              )}

              {(editedEvent.attributes.startDate || isEditing) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date</h4>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      className="input text-sm"
                      value={editedEvent.attributes.startDate ? new Date(editedEvent.attributes.startDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditedEvent({
                        ...editedEvent,
                        attributes: { ...editedEvent.attributes, startDate: e.target.value }
                      })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(editedEvent.attributes.startDate), 'PPpp', { locale: fr })}
                    </p>
                  )}
                </div>
              )}

              {(editedEvent.attributes.endDate || isEditing) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date</h4>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      className="input text-sm"
                      value={editedEvent.attributes.endDate ? new Date(editedEvent.attributes.endDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditedEvent({
                        ...editedEvent,
                        attributes: { ...editedEvent.attributes, endDate: e.target.value }
                      })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(editedEvent.attributes.endDate), 'PPpp', { locale: fr })}
                    </p>
                  )}
                </div>
              )}

              {editedEvent.metadata?.id && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Event ID</h4>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{editedEvent.metadata.id}</p>
                </div>
              )}

              {editedEvent.metadata?.slackId && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Slack ID</h4>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{editedEvent.metadata.slackId}</p>
                </div>
              )}
            </div>
            
            {/* Impact (for drifts) - Editable */}
            {(editedEvent.attributes.impact !== undefined || isEditing) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Impact</h4>
                {isEditing ? (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedEvent.attributes.impact || false}
                      onChange={(e) => setEditedEvent({
                        ...editedEvent,
                        attributes: { ...editedEvent.attributes, impact: e.target.checked }
                      })}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      This event has an impact
                    </span>
                  </label>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editedEvent.attributes.impact 
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' 
                      : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                  }`}>
                    {editedEvent.attributes.impact ? 'Has Impact' : 'No Impact'}
                  </span>
                )}
              </div>
            )}

            {/* Stakeholders */}
            {editedEvent.attributes.stakeHolders && editedEvent.attributes.stakeHolders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stakeholders</h4>
                <div className="flex flex-wrap gap-2">
                  {editedEvent.attributes.stakeHolders.map((stakeholder, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm">
                      {stakeholder}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(editedEvent.links?.pullRequestLink || editedEvent.links?.ticket) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Links</h4>
                <EventLinks 
                  links={editedEvent.links}
                  source={editedEvent.attributes.source}
                  slackId={editedEvent.metadata?.slackId}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4">
            {isEditing ? (
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="btn-secondary flex-1"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="btn-primary w-full"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast notification */}
      {showToast && (
        <Toast 
          message="Event updated successfully!"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
