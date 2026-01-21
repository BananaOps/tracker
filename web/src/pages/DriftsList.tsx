import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../lib/api'
import type { Event } from '../types/api'
import { EventType, Status, Priority } from '../types/api'
import { AlertTriangle, Plus, RefreshCw, AlertCircle, ExternalLink, CheckCircle, X } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { faJira } from '@fortawesome/free-brands-svg-icons'
import { getEnvironmentColor, getEnvironmentLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'

export default function DriftsList() {
  const navigate = useNavigate()
  const [drifts, setDrifts] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrift, setSelectedDrift] = useState<Event | null>(null)
  const [showMarkDonePrompt, setShowMarkDonePrompt] = useState(false)
  const [driftToMarkDone, setDriftToMarkDone] = useState<Event | null>(null)
  const [markDoneUser, setMarkDoneUser] = useState('')
  const [markDoneUserError, setMarkDoneUserError] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const [showCreateTicketPrompt, setShowCreateTicketPrompt] = useState(false)
  const [driftToCreateTicket, setDriftToCreateTicket] = useState<Event | null>(null)
  const [ticketUrl, setTicketUrl] = useState('')
  const [ticketUrlError, setTicketUrlError] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)

  const loadDrifts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all drifts of type DRIFT
      const searchParams = {
        type: EventType.DRIFT as unknown as number,
      }

      const data = await eventsApi.search(searchParams)
      
      // Filter out completed/failed drifts - show everything except failed, done, closed
      const excludedStatuses = ['failed', 'done', 'closed', 'close']
      const filteredDrifts = (data.events || []).filter((drift: Event) => 
        !excludedStatuses.includes(String(drift.attributes.status || '').toLowerCase())
      )

      setDrifts(filteredDrifts)
    } catch (err) {
      setError('Error loading drifts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDrifts()
  }, [])

  // Parse timestamp helper
  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null
    
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp)
      return isNaN(date.getTime()) ? null : date
    }
    
    if (timestamp.seconds !== undefined) {
      const milliseconds = Number(timestamp.seconds) * 1000 + (timestamp.nanos || 0) / 1000000
      return new Date(milliseconds)
    }
    
    return null
  }

  const formatDate = (timestamp: any) => {
    const date = parseTimestamp(timestamp)
    if (!date) return '-'
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    } catch (err) {
      console.error('Error formatting date:', timestamp, err)
      return '-'
    }
  }

  const getTimeSince = (timestamp: any) => {
    const created = parseTimestamp(timestamp)
    if (!created) return '-'
    
    try {
      const now = new Date()
      const diffMs = now.getTime() - created.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return '< 1m'
      if (diffMins < 60) return `${diffMins}m`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d`
    } catch (err) {
      console.error('Error calculating time since:', timestamp, err)
      return '-'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'start':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'done':
      case 'close':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const handleCreateJiraTicket = (drift: Event) => {
    setDriftToCreateTicket(drift)
    setShowCreateTicketPrompt(true)
    setTicketUrl('')
    setTicketUrlError(false)
  }

  const handleCreateTicketConfirm = async () => {
    if (!ticketUrl.trim()) {
      setTicketUrlError(true)
      return
    }

    if (!driftToCreateTicket?.metadata?.id) {
      console.error('Cannot create ticket: missing drift ID')
      return
    }

    try {
      setCreatingTicket(true)
      setShowCreateTicketPrompt(false)

      // Update the drift with the new ticket URL
      const updateData = {
        title: driftToCreateTicket.title,
        attributes: driftToCreateTicket.attributes,
        links: {
          ...driftToCreateTicket.links,
          ticket: ticketUrl.trim(),
        },
      }

      await eventsApi.update(driftToCreateTicket.metadata.id, updateData)
      
      // Reload the drifts list to reflect the change
      await loadDrifts()
      
    } catch (err: any) {
      console.error('Error creating ticket:', err)
      setError('Error creating ticket')
    } finally {
      setCreatingTicket(false)
      setDriftToCreateTicket(null)
    }
  }

  const handleMarkAsDone = (drift: Event) => {
    setDriftToMarkDone(drift)
    setShowMarkDonePrompt(true)
    setMarkDoneUser('')
    setMarkDoneUserError(false)
  }

  const handleMarkDoneConfirm = async () => {
    if (!markDoneUser.trim()) {
      setMarkDoneUserError(true)
      return
    }

    if (!driftToMarkDone?.metadata?.id) {
      console.error('Cannot mark drift as done: missing ID')
      return
    }

    try {
      setMarkingDone(true)
      setShowMarkDonePrompt(false)

      // Update the drift status to "done"
      const updateData = {
        title: driftToMarkDone.title,
        attributes: {
          ...driftToMarkDone.attributes,
          status: Status.DONE,
          owner: markDoneUser.trim(),
        },
        links: driftToMarkDone.links,
      }

      await eventsApi.update(driftToMarkDone.metadata.id, updateData)
      
      // Reload the drifts list to reflect the change
      await loadDrifts()
      
    } catch (err: any) {
      console.error('Error marking drift as done:', err)
      setError('Error marking drift as done')
    } finally {
      setMarkingDone(false)
      setDriftToMarkDone(null)
    }
  }

  const isJiraTicket = (ticketUrl: string) => {
    const url = ticketUrl.toLowerCase()
    return url.includes('atlassian.net') || url.includes('jira') || /[a-z]+-\d+/i.test(ticketUrl)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Active Drifts</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Monitor and manage active configuration drift detection
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadDrifts}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => navigate('/drifts/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Drift
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
        {/* Total Drifts Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-yellow-50/50 dark:from-slate-800 dark:to-yellow-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Active Drifts</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{drifts.length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-lg"></div>
                <FontAwesomeIcon icon={faCodeBranch} className="relative w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Unique Services Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-orange-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Affected Services</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {new Set(drifts.map((d: Event) => d.attributes.service)).size}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg"></div>
                <AlertCircle className="relative w-12 h-12 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Environments Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full border-0 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Critical Issues</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {drifts.filter((d: Event) => d.attributes.status === 'error' || d.attributes.priority === Priority.P1).length}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                <AlertTriangle className="relative w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {drifts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FontAwesomeIcon icon={faCodeBranch} className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No active drifts
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            All configurations are in sync or resolved
          </p>
          <Button
            onClick={() => navigate('/drifts/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Drift
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Env
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {drifts.map((drift) => (
                  <tr 
                    key={drift.metadata?.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedDrift(drift)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCodeBranch} className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={drift.attributes.service}>
                          {drift.attributes.service}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={drift.title}>
                        {drift.title}
                      </div>
                      {drift.attributes.message && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={drift.attributes.message}>
                          {drift.attributes.message}
                        </div>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      {drift.attributes.environment && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(drift.attributes.environment).bg} ${getEnvironmentColor(drift.attributes.environment).text}`}>
                          {getEnvironmentLabel(drift.attributes.environment)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          ['done', 'close', 'closed'].includes(String(drift.attributes.status || '').toLowerCase()) 
                            ? 'default' 
                            : ['error', 'failed'].includes(String(drift.attributes.status || '').toLowerCase())
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {getStatusLabel(drift.attributes.status)}
                      </Badge>
                    </td>
                    <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {getTimeSince(drift.metadata?.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {drift.links?.ticket ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={drift.links.ticket}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={
                                isJiraTicket(drift.links.ticket) 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }
                              title={isJiraTicket(drift.links.ticket) ? "View Jira ticket" : "View ticket"}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isJiraTicket(drift.links.ticket) ? (
                                <FontAwesomeIcon icon={faJira} className="w-4 h-4" />
                              ) : (
                                <ExternalLink className="w-4 h-4" />
                              )}
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCreateJiraTicket(drift)
                            }}
                            title="Add Jira ticket"
                          >
                            <FontAwesomeIcon icon={faJira} className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsDone(drift)
                          }}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Mark as done"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedDrift && (
        <EventDetailsModal 
          event={selectedDrift}
          onClose={() => setSelectedDrift(null)}
        />
      )}

      {/* Mark as Done Confirmation Modal */}
      {showMarkDonePrompt && driftToMarkDone && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowMarkDonePrompt(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mark Drift as Done
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMarkDonePrompt(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Mark <span className="font-semibold">{driftToMarkDone.title}</span> as resolved for service <span className="font-semibold">{driftToMarkDone.attributes.service}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={markDoneUser}
                  onChange={(e) => {
                    setMarkDoneUser(e.target.value)
                    setMarkDoneUserError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleMarkDoneConfirm()
                    }
                  }}
                  placeholder="e.g., john.doe"
                  className={markDoneUserError ? 'border-red-500' : ''}
                  autoFocus
                />
                {markDoneUserError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Name is required
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMarkDonePrompt(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkDoneConfirm}
                  disabled={markingDone}
                  className="flex-1"
                >
                  {markingDone ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Marking Done...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Done
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Jira Ticket Modal */}
      {showCreateTicketPrompt && driftToCreateTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowCreateTicketPrompt(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faJira} className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add Jira Ticket
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateTicketPrompt(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add a Jira ticket for drift <span className="font-semibold">{driftToCreateTicket.title}</span> on service <span className="font-semibold">{driftToCreateTicket.attributes.service}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jira Ticket URL <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  value={ticketUrl}
                  onChange={(e) => {
                    setTicketUrl(e.target.value)
                    setTicketUrlError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTicketConfirm()
                    }
                  }}
                  placeholder={`${import.meta.env.VITE_JIRA_DOMAIN || 'https://company.atlassian.net'}/browse/DRIFT-123`}
                  className={ticketUrlError ? 'border-red-500' : ''}
                  autoFocus
                />
                {ticketUrlError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Ticket URL is required
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the full Jira ticket URL or just the ticket ID (e.g., DRIFT-123)
                </p>
                <div className="mt-2">
                  <a
                    href={import.meta.env.VITE_JIRA_DOMAIN || 'https://company.atlassian.net'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <FontAwesomeIcon icon={faJira} className="w-3 h-3" />
                    Open Company Jira
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateTicketPrompt(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicketConfirm}
                  disabled={creatingTicket}
                  className="flex-1"
                >
                  {creatingTicket ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faJira} className="w-4 h-4 mr-2" />
                      Add Ticket
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
