import { useState, useMemo, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { X, Edit2, Save, History, Lock, Unlock, CheckCircle, Maximize2, Minimize2 } from 'lucide-react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, locksApi } from '../lib/api'
import type { Event } from '../types/api'
import { Priority, Status } from '../types/api'
import { getEventTypeIcon, getEventTypeLabel, getEnvironmentLabel, getPriorityLabel } from '../lib/eventUtils'
import EventLinks, { SourceIcon } from './EventLinks'
import { convertEventForAPI, convertEventFromAPI } from '../lib/apiConverters'
import { useTheme } from '../contexts/ThemeContext'
import { getSlackMessageUrl, parseSlackId } from '../config'
import Toast from './Toast'
import EventChangelog from './EventChangelog'
import LockIndicator from './LockIndicator'
import { DateTimePicker } from './ui/date-time-picker'

interface EventDetailsModalProps {
  event: Event
  onClose: () => void
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const { effectiveTheme } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [expanded, setExpanded] = useState(false)
  const [changelog, setChangelog] = useState(event.changelog || [])
  const [editOwner, setEditOwner] = useState('')
  const [ownerError, setOwnerError] = useState(false)
  const [lockingService, setLockingService] = useState(false)
  const [showLockPrompt, setShowLockPrompt] = useState(false)
  const [lockUser, setLockUser] = useState('')
  const [lockUserError, setLockUserError] = useState(false)
  const [existingLock, setExistingLock] = useState<any>(null)
  const [checkingLock, setCheckingLock] = useState(false)
  const [showApprovalPrompt, setShowApprovalPrompt] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [approvalUser, setApprovalUser] = useState('')
  const [approvalUserError, setApprovalUserError] = useState(false)
  const [approvingEvent, setApprovingEvent] = useState(false)
  
  // Convertir les nombres en strings enum si nécessaire
  const normalizedEvent = useMemo(() => {
    const normalized = convertEventFromAPI(event)
    return normalized
  }, [event])
  const [editedEvent, setEditedEvent] = useState(normalizedEvent)
  const queryClient = useQueryClient()
  
  // Vérifier si l'événement a été approuvé
  const isApproved = useMemo(() => {
    return editedEvent.changelog?.some(entry => 
      String(entry.changeType).toLowerCase() === 'approved'
    ) || false
  }, [editedEvent.changelog])
  
  // Mettre à jour editedEvent quand normalizedEvent change
  useEffect(() => {
    setEditedEvent(normalizedEvent)
    setChangelog(event.changelog || [])
  }, [normalizedEvent])

  // Rafraîchir l'historique lorsque l'onglet History est actif
  useEffect(() => {
    const fetchChangelog = async () => {
      if (activeTab === 'history' && editedEvent.metadata?.id) {
        try {
          const res = await eventsApi.getChangelog(editedEvent.metadata.id)
          setChangelog(res.changelog || [])
        } catch (err) {
          console.error('Error fetching changelog on tab switch:', err)
        }
      }
    }
    fetchChangelog()
  }, [activeTab, editedEvent.metadata?.id])

  // Fermeture via Échap + verrouillage du scroll de fond
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])
  

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
      // Rafraîchir l'historique après mise à jour
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

  const handleApprove = () => {
    setShowApprovalPrompt(true)
    setApprovalUser('')
    setApprovalUserError(false)
  }

  const handleApprovalConfirm = async () => {
    if (!approvalUser.trim()) {
      setApprovalUserError(true)
      return
    }

    if (!editedEvent.metadata?.id) {
      console.error('Cannot approve event: missing ID')
      return
    }

    try {
      setApprovingEvent(true)
      setShowApprovalPrompt(false)

      // Mettre à jour l'événement avec le nom de l'approbateur
      // Le backend détectera automatiquement qu'il s'agit d'une approbation
      const updatedEvent = {
        ...editedEvent,
        attributes: {
          ...editedEvent.attributes,
          owner: approvalUser.trim(),
        },
      }

      const updateData = {
        title: updatedEvent.title,
        attributes: updatedEvent.attributes,
        links: updatedEvent.links,
      }

      const convertedData = convertEventForAPI(updateData)
      const result = await eventsApi.update(editedEvent.metadata.id, convertedData)

      // Mettre à jour l'état local
      const normalized = convertEventFromAPI(result)
      setEditedEvent(normalized)
      // Rafraîchir l'historique après approbation
      if (normalized.metadata?.id) {
        try {
          const res = await eventsApi.getChangelog(normalized.metadata.id)
          setChangelog(res.changelog || [])
        } catch (err) {
          console.error('Error fetching changelog after approval:', err)
        }
      }

      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: ['events'] })

      setToastMessage('Event approved successfully')
      setShowToast(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error approving event'
      setToastMessage(errorMessage)
      setShowToast(true)
      console.error('Error approving event:', err)
    } finally {
      setApprovingEvent(false)
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
        const errorMessage = createErr.response?.data?.message || createErr.message || ''
        if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
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
      
      // Améliorer le message d'erreur pour les locks
      let displayMessage = errorMessage
      if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
        displayMessage = `🔒 Service ${editedEvent.attributes.service} is already locked in ${editedEvent.attributes.environment}. Please check the Locks page to see who has locked it.`
      } else if (errorMessage.toLowerCase().includes('internal error')) {
        displayMessage = `🔒 Cannot create lock: Service ${editedEvent.attributes.service} may already be locked. Please check the Locks page.`
      }
      
      setToastMessage(displayMessage)
      setShowToast(true)
      console.error('Error creating lock:', err)
    } finally {
      setLockingService(false)
    }
  }


  // HUD color helpers
  const hud = {
    bg: 'rgb(var(--hud-bg))',
    surface: 'rgb(var(--hud-surface))',
    surfaceLow: 'rgb(var(--hud-surface-low))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary: 'rgb(var(--hud-primary))',
    primaryDim: 'rgb(var(--hud-primary-dim))',
    tertiary: 'rgb(var(--hud-tertiary))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outline: 'rgb(var(--hud-outline))',
    outlineVar: 'rgb(var(--hud-outline-var))',
    error: 'rgb(var(--hud-error))',
    success: 'rgb(var(--hud-success))',
  }
  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`

  const ownerInitials = editedEvent.attributes.owner
    ? editedEvent.attributes.owner.split(/[\s.@]/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
    : ''

  const blockBg = effectiveTheme === 'dark' ? ha('surface-highest', 0.5) : 'rgba(255,255,255,0.85)'

  const quickStatuses = [
    { v: Status.START, l: 'Start', c: '#40ceed', icon: 'fa-play' },
    { v: Status.IN_PROGRESS, l: 'In Progress', c: '#60a5fa', icon: 'fa-satellite-dish' },
    { v: Status.SUCCESS, l: 'Success', c: '#34d399', icon: 'fa-circle-check' },
    { v: Status.FAILURE, l: 'Failed', c: '#ff6e84', icon: 'fa-triangle-exclamation' },
    { v: Status.DONE, l: 'Done', c: '#34d399', icon: 'fa-circle-check' },
    { v: Status.WARNING, l: 'Warning', c: '#fbbf24', icon: 'fa-triangle-exclamation' },
    { v: Status.OPEN, l: 'Open', c: '#a78bfa', icon: 'fa-folder-open' },
    { v: Status.CLOSE, l: 'Closed', c: '#6b7280', icon: 'fa-folder' },
    { v: Status.PLANNED, l: 'Planned', c: '#60a5fa', icon: 'fa-clock' },
    { v: Status.WAITING_APPROVAL, l: 'Waiting Approval', c: '#f97316', icon: 'fa-hourglass-half' },
  ]

  const sortedChangelog = useMemo(
    () => [...changelog].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [changelog]
  )

  const typeVisual = (() => {
    const t = String(editedEvent.attributes.type || '').toLowerCase()
    if (t === 'deployment' || t === '1') return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
    if (t === 'operation' || t === '2') return { bg: '#F3EEFF', text: '#5B3AAE', border: '#D9CCFF' }
    if (t === 'incident' || t === '4') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (t === 'drift' || t === '3') return { bg: '#EAFBFA', text: '#0F766E', border: '#BDECE8' }
    if (t === 'rpa_usage' || t === '5') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  })()

  const envVisual = (() => {
    const e = String(editedEvent.attributes.environment || '').toLowerCase()
    if (e === 'production' || e === '7') return { bg: '#FEECEC', text: '#B42318', border: '#F7C9C9' }
    if (e === 'preproduction' || e === '6') return { bg: '#FFF4EA', text: '#C2410C', border: '#FFD5B0' }
    if (e === 'development' || e === '1' || e === 'integration' || e === '2') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0' }
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF' }
  })()

  const priorityVisual = (() => {
    const p = String(editedEvent.attributes.priority || '').toLowerCase()
    if (p === 'p1' || p === '1') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0' }
    if (p === 'p2' || p === '2') return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0' }
    if (p === 'p3' || p === '3') return { bg: '#FDFCE8', text: '#6B6000', border: '#F0EA90' }
    return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8' }
  })()

  const statusVisual = (() => {
    const s = String(editedEvent.attributes.status || '').toLowerCase()
    if (s === 'success' || s === '3' || s === 'done' || s === '11') return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', label: 'Success' }
    if (s === 'failure' || s === '2' || s === 'error' || s === '5') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Conflict' }
    if (s === 'start' || s === '1' || s === 'in_progress' || s === '12') return { bg: '#FFF0E8', text: '#B84400', border: '#FFC8A0', label: 'Live' }
    return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', label: 'Scheduled' }
  })()

  const statusIconClass = statusVisual.label === 'Success'
    ? 'fa-circle-check'
    : statusVisual.label === 'Conflict'
      ? 'fa-triangle-exclamation'
      : statusVisual.label === 'Live'
        ? 'fa-satellite-dish'
        : 'fa-clock'

  const handleQuickStatus = (status: Status) => {
    const updated = { ...editedEvent, attributes: { ...editedEvent.attributes, status } }
    setEditedEvent(updated)
    if (editedEvent.metadata?.id) {
      const convertedData = convertEventForAPI({ title: updated.title, attributes: updated.attributes, links: updated.links })
      eventsApi.update(editedEvent.metadata.id, convertedData).then(() => {
        queryClient.invalidateQueries({ queryKey: ['events'] })
        setToastMessage(`Status updated`)
        setShowToast(true)
      })
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Side Panel */}
      <div className={`animate-slide-in relative h-full shadow-2xl overflow-hidden flex flex-col transition-[max-width] duration-300 ease-out w-full ${expanded ? 'max-w-full' : 'max-w-3xl'}`}
        style={{ background: effectiveTheme === 'dark' ? ha('surface', 0.92) : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderLeft: `1px solid ${ha('outline-var', 0.2)}` }}>

        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: ha('primary-dim', 0.1) }} />
          <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full blur-[100px]" style={{ background: ha('tertiary', 0.08) }} />
        </div>


        {/* Header: Title + Actions */}
        <div className="relative z-10 px-8 pt-6 pb-6 shrink-0" style={{ borderBottom: `1px solid ${ha('outline-var', 0.15)}` }}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              {isApproved && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border" style={{ background: '#ECFDF3', color: '#166534', borderColor: '#BBF7D0' }}>
                    <CheckCircle className="w-3 h-3" /> Approved
                  </span>
                </div>
              )}
              {isEditing ? (
                <input type="text" className="input text-3xl lg:text-4xl font-bold w-full" style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  value={editedEvent.title} onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })} />
              ) : (<>
                <h1 className={`font-bold tracking-tight ${expanded ? 'text-3xl lg:text-4xl' : 'text-2xl'}`} style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {editedEvent.title}
                </h1>
                <p className="text-sm font-mono mt-1" style={{ color: hud.onSurfaceVar }}>{editedEvent.attributes.service}</p>
              </>)}
            </div>
            {!isEditing && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button onClick={handleStartEdit} className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium"
                  style={{ background: hud.surfaceHigh, color: hud.onSurface, border: `1px solid ${ha('outline-var', 0.2)}` }}>
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={handleApprove} disabled={approvingEvent || isApproved}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-bold shadow-lg disabled:opacity-50"
                  style={{ background: hud.primary, color: '#ffffff', boxShadow: `0 4px 16px ${ha('primary', 0.2)}` }}>
                  <CheckCircle className="w-4 h-4" /> {isApproved ? 'Approved' : 'Approve'}
                </button>
                <button onClick={existingLock ? handleUnlock : handleLock} disabled={lockingService || checkingLock}
                  className="p-2.5 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: existingLock ? 'rgba(52,211,153,0.1)' : ha('error', 0.1), color: existingLock ? '#34d399' : hud.error, border: `1px solid ${existingLock ? 'rgba(52,211,153,0.2)' : ha('error', 0.2)}` }}>
                  {existingLock ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                <button onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse panel' : 'Expand to full width'}
                  className="hidden md:flex p-2.5 rounded-lg transition-all" style={{ background: hud.surfaceHigh, color: hud.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.2)}` }}>
                  {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={onClose} className="p-2.5 rounded-lg transition-all" style={{ color: hud.onSurfaceVar }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {isEditing && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleCancel} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: hud.surfaceHigh, color: hud.onSurface }}>Cancel</button>
                <button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: hud.primary, color: '#ffffff' }}>
                  <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: `${ha('outline-var', 0.4)} transparent` }}>
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
              style={activeTab === 'details'
                ? { background: ha('primary', 0.16), color: hud.primary, border: `1px solid ${ha('primary', 0.3)}` }
                : { background: ha('outline-var', 0.08), color: hud.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.14)}` }}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
              style={activeTab === 'history'
                ? { background: ha('primary', 0.16), color: hud.primary, border: `1px solid ${ha('primary', 0.3)}` }
                : { background: ha('outline-var', 0.08), color: hud.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.14)}` }}
            >
              <History className="w-3.5 h-3.5" />
              History
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: ha('outline-var', 0.16), color: hud.onSurfaceVar }}>
                {changelog.length}
              </span>
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className={`grid gap-8 ${expanded ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
              {/* Left Column */}
              <div className={`space-y-6 ${expanded ? 'xl:col-span-8' : ''}`}>
                {/* Properties panel */}
                {!isEditing && (
                  <div className="rounded-2xl" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                    <div className="px-5 py-3" style={{ borderBottom: `1px solid ${ha('outline-var', 0.1)}` }}>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: hud.onSurfaceVar }}>Properties</h4>
                    </div>
                    <div className={`grid ${expanded ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                      {/* Type */}
                      <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${ha('outline-var', 0.08)}`, borderRight: `1px solid ${ha('outline-var', 0.08)}` }}>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Type</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: typeVisual.bg, color: typeVisual.text, borderColor: typeVisual.border }}>
                            {getEventTypeIcon(editedEvent.attributes.type, 'w-3.5 h-3.5')}
                          </span>
                          <span className="text-[10px] font-semibold uppercase" style={{ color: typeVisual.text }}>{getEventTypeLabel(editedEvent.attributes.type)}</span>
                        </div>
                      </div>
                      {/* Environment */}
                      <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${ha('outline-var', 0.08)}`, borderRight: expanded ? `1px solid ${ha('outline-var', 0.08)}` : 'none' }}>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Environment</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase border self-start" style={{ background: envVisual.bg, color: envVisual.text, borderColor: envVisual.border }}>
                          {String(getEnvironmentLabel(editedEvent.attributes.environment) || 'N/A').toUpperCase()}
                        </span>
                      </div>
                      {/* Priority */}
                      <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${ha('outline-var', 0.08)}`, borderRight: `1px solid ${ha('outline-var', 0.08)}` }}>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Priority</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: priorityVisual.bg, color: priorityVisual.text, borderColor: priorityVisual.border }}>
                            <span className="text-[9px] font-bold leading-none">{getPriorityLabel(editedEvent.attributes.priority).toUpperCase()}</span>
                          </span>
                          <span className="text-[10px] font-semibold uppercase" style={{ color: priorityVisual.text }}>{getPriorityLabel(editedEvent.attributes.priority)}</span>
                        </div>
                      </div>
                      {/* Impact */}
                      <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${ha('outline-var', 0.08)}`, borderRight: expanded ? `1px solid ${ha('outline-var', 0.08)}` : 'none' }}>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Impact</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center border"
                            style={editedEvent.attributes.impact
                              ? { background: '#FFF0E8', color: '#B84400', borderColor: '#FFC8A0' }
                              : { background: '#EEF1F8', color: '#6E7891', borderColor: '#D5DBE8' }}>
                            <i
                              className={`fa-solid fa-meteor text-[11px]${editedEvent.attributes.impact ? ' fa-beat-fade' : ''}`}
                              style={editedEvent.attributes.impact ? ({ '--fa-animation-duration': '2s' } as CSSProperties) : undefined}
                            />
                          </span>
                          <span className="text-[10px] font-semibold uppercase" style={{ color: editedEvent.attributes.impact ? '#B84400' : '#6E7891' }}>
                            {editedEvent.attributes.impact ? 'Impact' : 'No Impact'}
                          </span>
                        </div>
                      </div>
                      {/* Status (interactive) */}
                      <div className="px-5 py-4 flex flex-col gap-2 relative" style={{ borderBottom: expanded ? 'none' : `1px solid ${ha('outline-var', 0.08)}`, borderRight: `1px solid ${ha('outline-var', 0.08)}` }}>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Status</span>
                        <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="flex items-center gap-1.5 self-start">
                          <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: statusVisual.bg, color: statusVisual.text, borderColor: statusVisual.border }}>
                            <i className={`fa-solid ${statusIconClass} text-[11px]${statusIconClass === 'fa-satellite-dish' ? ' fa-fade' : ''}`} />
                          </span>
                          <span className="text-[10px] font-semibold uppercase" style={{ color: statusVisual.text }}>{statusVisual.label}</span>
                          <svg className={`w-3.5 h-3.5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} style={{ color: hud.onSurfaceVar }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showStatusDropdown && (
                          <div className="absolute top-full left-4 mt-1 w-52 rounded-lg shadow-xl z-20 py-1 overflow-hidden" style={{ background: hud.surface, border: `1px solid ${ha('outline-var', 0.3)}` }}>
                            {quickStatuses.map(({ v, l, c, icon }) => (
                              <button key={v} onClick={() => { handleQuickStatus(v); setShowStatusDropdown(false) }}
                                className="w-full text-left px-3 py-2 transition-all flex items-center gap-2 hover:brightness-110"
                                style={{ background: editedEvent.attributes.status === v ? hud.surfaceHigh : hud.surface }}>
                                <span className="w-7 h-7 rounded-md flex items-center justify-center border shrink-0" style={{ background: hud.surfaceHigh, color: c, borderColor: c }}>
                                  <i className={`fa-solid ${icon} text-[11px]`} />
                                </span>
                                <span className="text-[10px] font-semibold uppercase" style={{ color: c }}>{l}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Owner */}
                      <div className="px-5 py-4 flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Owner</span>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: hud.primary }}>
                            {ownerInitials || '?'}
                          </span>
                          <span className="text-sm font-semibold truncate">{editedEvent.attributes.owner || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editing: owner + selects */}
                {isEditing && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: ha('primary', 0.05), border: `1px solid ${ha('primary', 0.15)}` }}>
                      <label className="block text-sm font-medium mb-2">Your Name / Email <span style={{ color: hud.error }}>*</span></label>
                      <input type="text" placeholder="e.g., john.doe@company.com" className="input"
                        value={editOwner} onChange={(e) => { setEditOwner(e.target.value); setOwnerError(false) }} />
                      {ownerError && <p className="mt-1 text-sm" style={{ color: hud.error }}>Required to track changes</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: hud.onSurfaceVar }}>Priority</label>
                        <select className="select text-sm" value={editedEvent.attributes.priority}
                          onChange={(e) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, priority: e.target.value as Priority } })}>
                          <option value={Priority.P1}>P1 - Critical</option>
                          <option value={Priority.P2}>P2 - High</option>
                          <option value={Priority.P3}>P3 - Medium</option>
                          <option value={Priority.P4}>P4 - Low</option>
                          <option value={Priority.P5}>P5 - Very Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: hud.onSurfaceVar }}>Status</label>
                        <select className="select text-sm" value={editedEvent.attributes.status}
                          onChange={(e) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, status: e.target.value as Status } })}>
                          <option value={Status.START}>Start</option><option value={Status.IN_PROGRESS}>In Progress</option>
                          <option value={Status.SUCCESS}>Success</option><option value={Status.FAILURE}>Failed</option>
                          <option value={Status.WARNING}>Warning</option><option value={Status.ERROR}>Error</option>
                          <option value={Status.DONE}>Done</option><option value={Status.OPEN}>Open</option><option value={Status.CLOSE}>Closed</option>
                        </select>
                      </div>
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-solid fa-play mr-1" /> Start Date
                        </label>
                        <DateTimePicker
                          date={editedEvent.attributes.startDate ? new Date(editedEvent.attributes.startDate) : undefined}
                          setDate={(date) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, startDate: date?.toISOString() } })}
                          placeholder="Select start date"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-solid fa-flag-checkered mr-1" /> End Date
                        </label>
                        <DateTimePicker
                          date={editedEvent.attributes.endDate ? new Date(editedEvent.attributes.endDate) : undefined}
                          setDate={(date) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, endDate: date?.toISOString() } })}
                          placeholder="Select end date"
                        />
                      </div>
                    </div>
                    {/* Impact toggle */}
                    <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ background: ha('outline-var', 0.08), border: `1px solid ${ha('outline-var', 0.15)}` }}>
                      <input type="checkbox" checked={editedEvent.attributes.impact || false}
                        onChange={(e) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, impact: e.target.checked } })}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
                      <i
                        className={`fa-solid fa-meteor${editedEvent.attributes.impact ? ' fa-beat-fade' : ''}`}
                        style={editedEvent.attributes.impact
                          ? ({ color: '#ff6e84', '--fa-animation-duration': '2s' } as CSSProperties)
                          : { color: '#34d399' }}
                      />
                      <span className="text-sm font-medium">{editedEvent.attributes.impact ? 'Has Impact' : 'No Impact'}</span>
                    </label>
                    {/* Links */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-brands fa-github mr-1" /> GitHub PR URL
                        </label>
                        <input type="url" className="input text-sm" placeholder="https://github.com/org/repo/pull/123"
                          value={editedEvent.links?.pullRequestLink || ''}
                          onChange={(e) => setEditedEvent({ ...editedEvent, links: { ...editedEvent.links, pullRequestLink: e.target.value } })} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-brands fa-jira mr-1" style={{ color: '#2684FF' }} /> Jira Ticket
                        </label>
                        <input type="text" className="input text-sm" placeholder="PROJ-1234 or URL"
                          value={editedEvent.links?.ticket || ''}
                          onChange={(e) => setEditedEvent({ ...editedEvent, links: { ...editedEvent.links, ticket: e.target.value } })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="rounded-2xl p-5" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: hud.onSurfaceVar }}>Description</h4>
                  {isEditing ? (
                    <textarea rows={4} className="input" value={editedEvent.attributes.message}
                      onChange={(e) => setEditedEvent({ ...editedEvent, attributes: { ...editedEvent.attributes, message: e.target.value } })} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: editedEvent.attributes.message ? hud.onSurface : hud.outline }}>
                      {editedEvent.attributes.message || 'No description provided.'}
                    </p>
                  )}
                </div>

                {/* Schedule & Source */}
                {!isEditing && (
                  <div className="rounded-2xl p-5 space-y-3" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: hud.onSurfaceVar }}>Schedule & Source</h4>
                    <div className={`grid gap-x-6 gap-y-3 ${expanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-solid fa-play text-[10px]" style={{ color: '#34d399' }} /> Start
                        </span>
                        <span className="text-xs font-mono tabular-nums" style={{ color: editedEvent.attributes.startDate ? hud.onSurface : hud.outline }}>
                          {editedEvent.attributes.startDate ? format(new Date(editedEvent.attributes.startDate), 'PPp', { locale: enUS }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-solid fa-flag-checkered text-[10px]" style={{ color: '#ff6e84' }} /> End
                        </span>
                        <span className="text-xs font-mono tabular-nums" style={{ color: editedEvent.attributes.endDate ? hud.onSurface : hud.outline }}>
                          {editedEvent.attributes.endDate ? format(new Date(editedEvent.attributes.endDate), 'PPp', { locale: enUS }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <i className="fa-regular fa-clock text-[10px]" /> Created
                        </span>
                        <span className="text-xs font-mono tabular-nums" style={{ color: editedEvent.metadata?.createdAt ? hud.onSurface : hud.outline }}>
                          {editedEvent.metadata?.createdAt ? format(new Date(editedEvent.metadata.createdAt), 'PPp', { locale: enUS }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: hud.onSurfaceVar }}>
                          <SourceIcon source={editedEvent.attributes.source} /> Source
                        </span>
                        <span className="text-xs font-medium truncate" style={{ color: hud.onSurface }}>{editedEvent.attributes.source || '—'}</span>
                      </div>
                    </div>
                    {editedEvent.metadata?.id && (
                      <div className="flex items-center gap-2 text-[11px] pt-2" style={{ color: hud.outline, borderTop: `1px solid ${ha('outline-var', 0.08)}` }}>
                        <i className="fa-solid fa-fingerprint text-[10px]" />
                        <span className="font-mono truncate">{editedEvent.metadata.id}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Links as bento cards */}
                {(editedEvent.links?.pullRequestLink || editedEvent.links?.ticket || editedEvent.metadata?.slackId) && (
                  <div className="rounded-2xl p-5" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: hud.onSurfaceVar }}>Links</h4>
                    <div className={`grid grid-cols-1 gap-4 ${expanded ? 'md:grid-cols-2' : ''}`}>
                      {editedEvent.links?.pullRequestLink && (
                        <a href={editedEvent.links.pullRequestLink} target="_blank" rel="noopener noreferrer"
                          className="p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
                          style={{ background: ha('outline-var', 0.05), border: `1px solid ${ha('outline-var', 0.1)}` }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(36,41,47,0.3)' }}>
                            <i className="fa-brands fa-github text-xl" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: hud.onSurfaceVar }}>GitHub PR</div>
                            <div className="text-lg font-bold truncate">#{editedEvent.links.pullRequestLink.split('/').pop() || 'PR'}</div>
                          </div>
                        </a>
                      )}
                      {editedEvent.links?.ticket && (
                        <a href={editedEvent.links.ticket.startsWith('http') ? editedEvent.links.ticket : '#'} target="_blank" rel="noopener noreferrer"
                          className="p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
                          style={{ background: ha('outline-var', 0.05), border: `1px solid ${ha('outline-var', 0.1)}` }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.15)' }}>
                            <i className="fa-brands fa-jira text-xl" style={{ color: '#2684FF' }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: hud.onSurfaceVar }}>Jira Ticket</div>
                            <div className="text-lg font-bold truncate">{editedEvent.links.ticket.match(/[A-Z]+-\d+/)?.[0] || editedEvent.links.ticket.split('/').pop() || editedEvent.links.ticket}</div>
                          </div>
                        </a>
                      )}
                      {editedEvent.metadata?.slackId && (() => {
                        const parsed = parseSlackId(editedEvent.metadata.slackId)
                        if (!parsed) return null
                        const url = getSlackMessageUrl(parsed.channelId, parsed.messageTs)
                        return (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
                            style={{ background: ha('outline-var', 0.05), border: `1px solid ${ha('outline-var', 0.1)}` }}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(74,21,75,0.15)' }}>
                              <i className="fa-brands fa-slack text-xl" style={{ color: '#E01E5A' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: hud.onSurfaceVar }}>Slack Message</div>
                              <div className="text-lg font-bold truncate">View in Slack</div>
                            </div>
                          </a>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* Stakeholders (shown inline only when not expanded) */}
                {editedEvent.attributes.stakeHolders && editedEvent.attributes.stakeHolders.length > 0 && !expanded && (
                  <div className="rounded-2xl p-5" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: hud.onSurfaceVar }}>Stakeholders</h4>
                    <div className="flex flex-wrap gap-2">
                      {editedEvent.attributes.stakeHolders.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: hud.surfaceHighest, color: hud.onSurface }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Recent activity + Lock */}
              <div className={`space-y-6 ${expanded ? 'xl:col-span-4' : ''}`}>
                {/* Recent activity */}
                <div className="rounded-2xl p-5" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: hud.onSurfaceVar }}>Recent activity</h4>
                    {changelog.length > 0 && (
                      <button onClick={() => setActiveTab('history')} className="text-[10px] font-semibold uppercase tracking-wider transition-all hover:underline" style={{ color: hud.primary }}>
                        View all
                      </button>
                    )}
                  </div>
                  {changelog.length > 0 ? (
                    <div className="space-y-3">
                      {[...changelog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6).map((entry, i) => (
                        <div key={i} className="flex gap-2.5 text-xs">
                          <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{ background: hud.primary }} />
                          <div className="min-w-0">
                            <span className="font-semibold">{entry.user || '—'}</span>
                            <span style={{ color: hud.onSurfaceVar }}> · {String(entry.changeType).replace('_', ' ')}</span>
                            {entry.field && <span style={{ color: hud.onSurfaceVar }}> · {entry.field}</span>}
                            {entry.oldValue && entry.newValue && (
                              <span> <span style={{ color: '#ff6e84' }}>{entry.oldValue}</span> → <span style={{ color: '#34d399' }}>{entry.newValue}</span></span>
                            )}
                            <div className="font-mono tabular-nums mt-0.5" style={{ color: hud.outline, fontSize: '10px' }}>
                              {format(new Date(entry.timestamp), 'PPp', { locale: enUS })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: hud.outline }}>No history yet.</p>
                  )}
                </div>

                {/* Stakeholders moved here for balance when expanded */}
                {editedEvent.attributes.stakeHolders && editedEvent.attributes.stakeHolders.length > 0 && expanded && (
                  <div className="rounded-2xl p-5" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: hud.onSurfaceVar }}>Stakeholders</h4>
                    <div className="flex flex-wrap gap-2">
                      {editedEvent.attributes.stakeHolders.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: hud.surfaceHighest, color: hud.onSurface }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lock info */}
                {existingLock && (
                  <div className="p-4 rounded-xl flex gap-3" style={{ background: ha('tertiary', 0.05), border: `1px solid ${ha('tertiary', 0.2)}` }}>
                    <Lock className="w-4 h-4 shrink-0" style={{ color: hud.tertiary }} />
                    <p className="text-xs" style={{ color: ha('tertiary', 0.8) }}>This service is currently locked.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: blockBg, border: `1px solid ${ha('outline-var', 0.12)}` }}>
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: hud.onSurfaceVar }}>Change history</h4>
                  <p className="text-sm" style={{ color: hud.onSurfaceVar }}>
                    Full audit trail: updates, approvals, status changes, and lock actions.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-md text-xs font-bold" style={{ background: ha('primary', 0.12), color: hud.primary, border: `1px solid ${ha('primary', 0.25)}` }}>
                  {sortedChangelog.length} {sortedChangelog.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              {!expanded && (
                <button onClick={() => setExpanded(true)} className="hidden md:flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all" style={{ background: ha('outline-var', 0.06), color: hud.onSurfaceVar, border: `1px solid ${ha('outline-var', 0.14)}` }}>
                  <Maximize2 className="w-3.5 h-3.5" /> Expand panel for a wider view
                </button>
              )}
              <EventChangelog changelog={sortedChangelog} />
            </div>
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

      {/* Approval User Prompt */}
      {showApprovalPrompt && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowApprovalPrompt(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Approve Event
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your name to approve <span className="font-semibold">{editedEvent.title}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approvalUser}
                  onChange={(e) => {
                    setApprovalUser(e.target.value)
                    setApprovalUserError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApprovalConfirm()
                    }
                  }}
                  placeholder="e.g., john.doe"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    approvalUserError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  autoFocus
                />
                {approvalUserError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Name is required
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalPrompt(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalConfirm}
                  disabled={approvingEvent}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {approvingEvent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve
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
    </>
  )
}
