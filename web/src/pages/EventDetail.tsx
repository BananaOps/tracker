import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, History, ExternalLink, AlertTriangle, GitBranch } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { eventsApi, catalogApi } from '../lib/api'
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

  // Fetch catalog entry for the event's service to get downstream dependencies
  const { data: serviceCatalog } = useQuery({
    queryKey: ['catalog', event?.attributes?.service],
    queryFn: () => catalogApi.get(event!.attributes.service),
    enabled: !!event?.attributes?.service,
    staleTime: 60_000,
  })

  const downstreamServices = useMemo(() => serviceCatalog?.dependenciesIn ?? [], [serviceCatalog])
  const [editedEvent, setEditedEvent] = useState(normalizedEvent)

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
            <p className="mt-1 text-sm text-hud-on-surface-var">
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
      <div className="bg-hud-surface border border-hud-outline-var/60 rounded-lg">
        <div className="border-b border-hud-outline-var/60 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-hud-primary text-hud-primary'
                  : 'border-transparent text-hud-on-surface-var hover:text-hud-on-surface'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'history'
                  ? 'border-hud-primary text-hud-primary'
                  : 'border-transparent text-hud-on-surface-var hover:text-hud-on-surface'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
              {changelog.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-hud-surface-high rounded-full text-hud-on-surface-var">
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
                <div className="p-4 bg-hud-primary/10 border border-hud-primary/20 rounded-lg">
                  <label className="block text-sm font-medium text-hud-on-surface mb-2">
                    Your Name / Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., john.doe@company.com"
                    className={`w-full px-3 py-2 border rounded-lg bg-hud-surface text-hud-on-surface ${ownerError ? 'border-red-500' : 'border-hud-outline-var'}`}
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
                <h4 className="text-sm font-semibold text-hud-on-surface-var mb-2">Description</h4>
                {isEditing ? (
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-hud-outline-var rounded-lg bg-hud-surface text-hud-on-surface"
                    value={editedEvent.attributes.message}
                    onChange={(e) => setEditedEvent({
                      ...editedEvent,
                      attributes: { ...editedEvent.attributes, message: e.target.value }
                    })}
                  />
                ) : (
                  <div className="bg-hud-surface-low rounded-lg p-4 border border-hud-outline-var/60">
                    <p className="text-hud-on-surface whitespace-pre-wrap">{editedEvent.attributes.message}</p>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Service</h4>
                  <Link 
                    to={`/catalog/${editedEvent.attributes.service}`}
                    className="text-hud-primary hover:underline flex items-center space-x-1"
                  >
                    <span>{editedEvent.attributes.service}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Source</h4>
                  <div className="flex items-center space-x-2">
                    <SourceIcon source={editedEvent.attributes.source} />
                    <span className="text-hud-on-surface">{editedEvent.attributes.source}</span>
                  </div>
                </div>

                {editedEvent.attributes.owner && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Owner</h4>
                    <p className="text-hud-on-surface">{editedEvent.attributes.owner}</p>
                  </div>
                )}

                {editedEvent.metadata?.createdAt && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Created At</h4>
                    <p className="text-hud-on-surface">
                      {format(new Date(editedEvent.metadata.createdAt), 'PPpp', { locale: fr })}
                    </p>
                  </div>
                )}

                {editedEvent.attributes.startDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Start Date</h4>
                    <p className="text-hud-on-surface">
                      {format(new Date(editedEvent.attributes.startDate), 'PPpp', { locale: fr })}
                    </p>
                  </div>
                )}

                {editedEvent.attributes.endDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">End Date</h4>
                    <p className="text-hud-on-surface">
                      {format(new Date(editedEvent.attributes.endDate), 'PPpp', { locale: fr })}
                    </p>
                  </div>
                )}

                {editedEvent.metadata?.duration && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Duration</h4>
                    <p className="text-hud-on-surface">{editedEvent.metadata.duration}</p>
                  </div>
                )}

                {editedEvent.metadata?.slackId && (
                  <div>
                    <h4 className="text-sm font-semibold text-hud-on-surface-var mb-1">Slack ID</h4>
                    <p className="text-hud-on-surface font-mono text-sm">{editedEvent.metadata.slackId}</p>
                  </div>
                )}
              </div>

              {/* Links */}
              {editedEvent.links && (editedEvent.links.pullRequestLink || editedEvent.links.ticket) && (
                <div>
                  <h4 className="text-sm font-semibold text-hud-on-surface-var mb-2">Links</h4>
                  <EventLinks links={editedEvent.links} />
                </div>
              )}

              {/* Downstream Impact */}
              {downstreamServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-hud-on-surface-var mb-2 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-orange-500" />
                    Downstream Impact
                    <span className="text-xs font-normal text-hud-on-surface-var">
                      — services that depend on <span className="font-medium text-hud-on-surface">{editedEvent.attributes.service}</span>
                    </span>
                    <span className="ml-auto text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
                      {downstreamServices.length} service{downstreamServices.length > 1 ? 's' : ''}
                    </span>
                  </h4>
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {downstreamServices.map(svc => (
                        <Link
                          key={svc}
                          to={`/catalog/${svc}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-hud-surface border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        >
                          <GitBranch className="w-3 h-3" />
                          {svc}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </Link>
                      ))}
                    </div>
                  </div>
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
