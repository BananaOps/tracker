import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Save, History, Lock, Unlock, CheckCircle, X, ExternalLink, Rocket, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { eventsApi, locksApi } from '../lib/api'
import type { Event } from '../types/api'
import { Priority, Status } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEventTypeColor, getEnvironmentLabel, getEnvironmentColor, getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from '../components/EventLinks'
import { convertEventForAPI, convertEventFromAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import EventChangelog from '../components/EventChangelog'
import LockIndicator from '../components/LockIndicator'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [changelog, setChangelog] = useState<any[]>([])
  const [editOwner, setEditOwner] = useState('')
  const [ownerError, setOwnerError] = useState(false)
  const [lockingService, setLockingService] = useState(false)
  const [existingLock, setExistingLock] = useState<any>(null)
  const [checkingLock, setCheckingLock] = useState(false)

  // Fetch event data
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  })

  // Normalize event data
  const normalizedEvent = useMemo(() => {
    if (!event) return null
    return convertEventFromAPI(event)
  }, [event])

  const [editedEvent, setEditedEvent] = useState<Event | null>(null)

  // Update editedEvent when normalizedEvent changes
  useEffect(() => {
    if (normalizedEvent) {
      setEditedEvent(normalizedEvent)
      setChangelog(normalizedEvent.changelog || [])
    }
  }, [normalizedEvent])

  // Fetch changelog when history tab is active
  useEffect(() => {
    const fetchChangelog = async () => {
      if (activeTab === 'history' && eventId) {
        try {
          const res = await eventsApi.getChangelog(eventId)
          setChangelog(res.changelog || [])
        } catch (err) {
          console.error('Error fetching changelog:', err)
        }
      }
    }
    fetchChangelog()
  }, [activeTab, eventId])

  // Check for existing lock
  useEffect(() => {
    const checkLock = async () => {
      if (!editedEvent?.attributes.service || !editedEvent?.attributes.environment) {
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
  }, [editedEvent?.attributes.service, editedEvent?.attributes.environment])

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editedEvent) throw new Error('No event to update')
      const updateData = {
        title: editedEvent.title,
        attributes: editedEvent.attributes,
        links: editedEvent.links,
      }
      const convertedData = convertEventForAPI(updateData)
      return eventsApi.update(editedEvent.metadata!.id!, convertedData)
    },
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      const normalized = convertEventFromAPI(updatedEvent)
      setEditedEvent(normalized)
      if (normalized.metadata?.id) {
        eventsApi.getChangelog(normalized.metadata.id).then((res) => {
          setChangelog(res.changelog || [])
        }).catch((err) => console.error('Error fetching changelog:', err))
      }
      setIsEditing(false)
      setToastMessage('Event updated successfully!')
      setShowToast(true)
    },
    onError: (error: any) => {
      console.error('Error updating event:', error)
      setToastMessage('Error updating event')
      setShowToast(true)
    },
  })

  const handleSave = () => {
    if (!editedEvent?.metadata?.id) {
      console.error('Cannot update event: missing ID')
      return
    }
    
    if (!editOwner || editOwner.trim() === '') {
      setOwnerError(true)
      return
    }
    
    setEditedEvent({
      ...editedEvent,
      attributes: {
        ...editedEvent.attributes,
        owner: editOwner.trim(),
      },
    })
    
    updateMutation.mutate()
  }

  const handleCancel = () => {
    if (normalizedEvent) {
      setEditedEvent(normalizedEvent)
    }
    setIsEditing(false)
    setEditOwner('')
    setOwnerError(false)
  }

  const typeColor = editedEvent ? getEventTypeColor(editedEvent.attributes.type) : { bg: '', text: '' }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !editedEvent) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Event Not Found</h2>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">The event you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/events/timeline')} className="mt-4">
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              {getEventTypeIcon(editedEvent.attributes.type, 'w-8 h-8')}
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {editedEvent.title}
              </h2>
              <LockIndicator event={editedEvent} />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Event ID: {editedEvent.metadata?.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className={`${typeColor.bg} ${typeColor.text}`}>
          {getEventTypeLabel(editedEvent.attributes.type)}
        </Badge>
        {editedEvent.attributes.environment && (
          <Badge className={`${getEnvironmentColor(editedEvent.attributes.environment).bg} ${getEnvironmentColor(editedEvent.attributes.environment).text}`}>
            {getEnvironmentLabel(editedEvent.attributes.environment)}
          </Badge>
        )}
        <Badge className={`${getPriorityColor(editedEvent.attributes.priority).bg} ${getPriorityColor(editedEvent.attributes.priority).text}`}>
          {getPriorityLabel(editedEvent.attributes.priority)}
        </Badge>
        <Badge className={`${getStatusColor(editedEvent.attributes.status).bg} ${getStatusColor(editedEvent.attributes.status).text}`}>
          {getStatusLabel(editedEvent.attributes.status)}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
              {changelog.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
                  {changelog.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Owner field when editing */}
              {isEditing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Your Name / Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., john.doe@company.com"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${ownerError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    value={editOwner}
                    onChange={(e) => {
                      setEditOwner(e.target.value)
                      setOwnerError(false)
                    }}
                  />
                  {ownerError && (
                    <p className="mt-1 text-sm text-red-600">Please enter your name or email</p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                {isEditing ? (
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Service</h4>
                  <Link 
                    to={`/catalog/${editedEvent.attributes.service}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <span>{editedEvent.attributes.service}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Source</h4>
                  <div className="flex items-center space-x-2">
                    <SourceIcon source={editedEvent.attributes.source} />
                    <span className="text-gray-900 dark:text-gray-100">{editedEvent.attributes.source}</span>
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

                {editedEvent.attributes.startDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date</h4>
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(editedEvent.attributes.startDate), 'PPpp', { locale: fr })}
                    </p>
                  </div>
                )}

                {editedEvent.attributes.endDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date</h4>
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(editedEvent.attributes.endDate), 'PPpp', { locale: fr })}
                    </p>
                  </div>
                )}

                {editedEvent.metadata?.duration && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration</h4>
                    <p className="text-gray-900 dark:text-gray-100">{editedEvent.metadata.duration}</p>
                  </div>
                )}

                {editedEvent.metadata?.slackId && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Slack ID</h4>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{editedEvent.metadata.slackId}</p>
                  </div>
                )}
              </div>

              {/* Links */}
              {editedEvent.links && (editedEvent.links.pullRequestLink || editedEvent.links.ticket) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Links</h4>
                  <EventLinks links={editedEvent.links} />
                </div>
              )}
            </div>
          ) : (
            <EventChangelog changelog={changelog} />
          )}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}

