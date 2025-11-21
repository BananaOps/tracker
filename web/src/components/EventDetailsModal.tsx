import { useState, useMemo, useEffect } from 'react'
import { X, Edit2, Save, History, Lock, Unlock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, locksApi } from '../lib/api'
import type { Event } from '../types/api'
import { Priority, Status } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEventTypeColor, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from './EventLinks'
import { convertEventForAPI, convertEventFromAPI } from '../lib/apiConverters'
import Toast from './Toast'
import EventChangelog from './EventChangelog'
import LockIndicator from './LockIndicator'

interface EventDetailsModalProps {
  event: Event
  onClose: () => void
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [editOwner, setEditOwner] = useState('')
  const [ownerError, setOwnerError] = useState(false)
  const [lockingService, setLockingService] = useState(false)
  const [showLockPrompt, setShowLockPrompt] = useState(false)
  const [lockUser, setLockUser] = useState('')
  const [lockUserError, setLockUserError] = useState(false)
  const [existingLock, setExistingLock] = useState<any>(null)
  const [checkingLock, setCheckingLock] = useState(false)
  
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
      setToastMessage('Event updated successfully!')
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
    
    // Validate owner is provided
    if (!editOwner || editOwner.trim() === '') {
      setOwnerError(true)
      return
    }
    
    // Update the event with the editor's name
    const updatedEvent = {
      ...editedEvent,
      attributes: {
        ...editedEvent.attributes,
        owner: editOwner.trim(),
      },
    }
    setEditedEvent(updatedEvent)
    
    updateMutation.mutate()
  }

  const handleCancel = () => {
    setEditedEvent(normalizedEvent)
    setIsEditing(false)
    setEditOwner('')
    setOwnerError(false)
  }
  
  const handleStartEdit = () => {
    setIsEditing(true)
    setEditOwner('')
    setOwnerError(false)
  }

  // Vérifier si un lock existe pour ce service/environnement
  useEffect(() => {
    const checkLock = async () => {
      if (!editedEvent.attributes.service || !editedEvent.attributes.environment) {
        return
      }
      
      try {
        setCheckingLock(true)
        const locks = await locksApi.list()
        const lock = locks.locks.find(
          (l) => l.service === editedEvent.attributes.service && 
                 l.environment === editedEvent.attributes.environment
        )
        setExistingLock(lock || null)
      } catch (err) {
        console.error('Error checking lock:', err)
      } finally {
        setCheckingLock(false)
      }
    }
    
    checkLock()
  }, [editedEvent.attributes.service, editedEvent.attributes.environment])

  const handleLock = () => {
    if (!editedEvent.attributes.service || !editedEvent.attributes.environment) {
      setToastMessage('Cannot create lock: service or environment is missing')
      setShowToast(true)
      return
    }
    
    // Afficher le prompt pour demander le nom de l'utilisateur
    setShowLockPrompt(true)
    setLockUser('')
    setLockUserError(false)
  }

  const handleUnlock = () => {
    if (!existingLock) return
    
    // Afficher le prompt pour demander le nom de l'utilisateur
    setShowLockPrompt(true)
    setLockUser('')
    setLockUserError(false)
  }

  const handleUnlockConfirm = async () => {
    if (!lockUser.trim()) {
      setLockUserError(true)
      return
    }

    try {
      setLockingService(true)
      setShowLockPrompt(false)
      
      await locksApi.unlock(existingLock.id)
      setExistingLock(null)
      setToastMessage(`${editedEvent.attributes.service} is unlocked`)
      setShowToast(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error unlocking service'
      setToastMessage(errorMessage)
      setShowToast(true)
      console.error('Error unlocking:', err)
    } finally {
      setLockingService(false)
    }
  }

  const handleLockConfirm = async () => {
    if (!lockUser.trim()) {
      setLockUserError(true)
      return
    }

    try {
      setLockingService(true)
      setShowLockPrompt(false)
      
      const lockData: any = {
        service: editedEvent.attributes.service,
        who: lockUser.trim(),
        environment: editedEvent.attributes.environment,
      }
      
      // Ajouter le type d'événement comme resource si c'est deployment ou operation
      const eventType = String(editedEvent.attributes.type).toLowerCase()
      if (eventType === 'deployment' || eventType === 'operation') {
        lockData.resource = eventType
      }
      
      // Ajouter l'event_id
      if (editedEvent.metadata?.id) {
        lockData.event_id = editedEvent.metadata.id
      }
      
      // Essayer de créer le lock
      try {
        const createdLock = await locksApi.create(lockData)
        setExistingLock(createdLock)
      } catch (createErr: any) {
        // Si le lock existe déjà, essayer de le déverrouiller puis le recréer
        if (createErr.response?.data?.message?.includes('already locked')) {
          // Chercher le lock existant
          const locks = await locksApi.list()
          const foundLock = locks.locks.find(
            (l) => l.service === editedEvent.attributes.service && 
                   l.environment === editedEvent.attributes.environment
          )
          
          if (foundLock) {
            // Déverrouiller l'ancien lock
            await locksApi.unlock(foundLock.id)
            // Créer le nouveau lock
            const createdLock = await locksApi.create(lockData)
            setExistingLock(createdLock)
          } else {
            throw createErr
          }
        } else {
          throw createErr
        }
      }
      
      setToastMessage(`${editedEvent.attributes.service} is locked`)
      setShowToast(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error creating lock'
      setToastMessage(errorMessage)
      setShowToast(true)
      console.error('Error creating lock:', err)
    } finally {
      setLockingService(false)
    }
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
                <>
                  {existingLock ? (
                    <button
                      onClick={handleUnlock}
                      disabled={lockingService}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Unlock service"
                    >
                      {lockingService ? (
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Unlock className="w-5 h-5" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleLock}
                      disabled={lockingService || checkingLock}
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Lock service"
                    >
                      {lockingService || checkingLock ? (
                        <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleStartEdit}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    title="Edit event"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 'history'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
                {event.changelog && event.changelog.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
                    {event.changelog.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {activeTab === 'details' ? (
              <>
            {/* Title */}
            <div>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className="input text-2xl font-bold mb-3"
                    value={editedEvent.title}
                    onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  />
                  
                  {/* Owner field - Required for editing */}
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Your Name / Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., john.doe@company.com or John Doe"
                      className={`input ${ownerError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      value={editOwner}
                      onChange={(e) => {
                        setEditOwner(e.target.value)
                        setOwnerError(false)
                      }}
                    />
                    {ownerError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Please enter your name or email to track who made this change
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Required to track who made this modification in the change history
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {editedEvent.title}
                  </h3>
                  <LockIndicator event={editedEvent} />
                </div>
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
              </>
            ) : (
              /* History Tab */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change History</h3>
                <EventChangelog changelog={event.changelog} />
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
      
      {/* Lock/Unlock User Prompt */}
      {showLockPrompt && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowLockPrompt(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {existingLock ? 'Unlock Service' : 'Lock Service'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your name to {existingLock ? 'unlock' : 'lock'} <span className="font-semibold">{editedEvent.attributes.service}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lockUser}
                  onChange={(e) => {
                    setLockUser(e.target.value)
                    setLockUserError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      existingLock ? handleUnlockConfirm() : handleLockConfirm()
                    }
                  }}
                  placeholder="e.g., john.doe"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    lockUserError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  autoFocus
                />
                {lockUserError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Name is required
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLockPrompt(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={existingLock ? handleUnlockConfirm : handleLockConfirm}
                  disabled={lockingService}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    existingLock ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {lockingService ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {existingLock ? 'Unlocking...' : 'Locking...'}
                    </>
                  ) : (
                    <>
                      {existingLock ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {existingLock ? 'Unlock' : 'Lock'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <Toast 
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}
