import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../lib/api'
import type { Event } from '../types/api'
import { EventType, Status, Priority } from '../types/api'
import { AlertTriangle, Plus, RefreshCw, AlertCircle, ExternalLink, CheckCircle, X, Search, Filter } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { faJira } from '@fortawesome/free-brands-svg-icons'
import { getEnvironmentColor, getEnvironmentLabel, getStatusLabel } from '../lib/eventUtils'
import EventDetailsModal from '../components/EventDetailsModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'

export default function AllDriftsList() {
  const navigate = useNavigate()
  const [drifts, setDrifts] = useState<Event[]>([])
  const [filteredDrifts, setFilteredDrifts] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrift, setSelectedDrift] = useState<Event | null>(null)
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Mark as done states
  const [showMarkDonePrompt, setShowMarkDonePrompt] = useState(false)
  const [driftToMarkDone, setDriftToMarkDone] = useState<Event | null>(null)
  const [markDoneUser, setMarkDoneUser] = useState('')
  const [markDoneUserError, setMarkDoneUserError] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)

  // Add ticket states
  const [showCreateTicketPrompt, setShowCreateTicketPrompt] = useState(false)
  const [driftToCreateTicket, setDriftToCreateTicket] = useState<Event | null>(null)
  const [ticketUrl, setTicketUrl] = useState('')
  const [ticketUrlError, setTicketUrlError] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)

  const loadDrifts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load ALL drifts (no filtering)
      const searchParams = {
        type: EventType.DRIFT as unknown as number,
      }

      const data = await eventsApi.search(searchParams)
      
      setDrifts(data.events || [])
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

  // Filter and search logic
  useEffect(() => {
    let filtered = [...drifts]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(drift => 
        drift.title.toLowerCase().includes(query) ||
        drift.attributes.service.toLowerCase().includes(query) ||
        (drift.attributes.message && drift.attributes.message.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(drift => 
        String(drift.attributes.status || '').toLowerCase() === statusFilter
      )
    }

    // Environment filter
    if (environmentFilter !== 'all') {
      filtered = filtered.filter(drift => 
        String(drift.attributes.environment || '').toLowerCase() === environmentFilter
      )
    }

    // Service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(drift => 
        drift.attributes.service === serviceFilter
      )
    }

    setFilteredDrifts(filtered)
  }, [drifts, searchQuery, statusFilter, environmentFilter, serviceFilter])

  // Get unique values for filters
  const uniqueStatuses = [...new Set(drifts.map(d => String(d.attributes.status || '').toLowerCase()))].filter(Boolean)
  const uniqueEnvironments = [...new Set(drifts.map(d => String(d.attributes.environment || '').toLowerCase()))].filter(Boolean)
  const uniqueServices = [...new Set(drifts.map(d => d.attributes.service))].sort()

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
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
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

      const updateData = {
        title: driftToCreateTicket.title,
        attributes: driftToCreateTicket.attributes,
        links: {
          ...driftToCreateTicket.links,
          ticket: ticketUrl.trim(),
        },
      }

      await eventsApi.update(driftToCreateTicket.metadata.id, updateData)
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

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setEnvironmentFilter('all')
    setServiceFilter('all')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || environmentFilter !== 'all' || serviceFilter !== 'all'

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Configuration Drifts</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Search and filter through all configuration drift records
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

      {/* Search and Filters */}
      <div className="space-y-1.5">
        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search drifts by title, service, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Environment Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment
                </label>
                <select
                  value={environmentFilter}
                  onChange={(e) => setEnvironmentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Environments</option>
                  {uniqueEnvironments.map(env => (
                    <option key={env} value={env}>
                      {getEnvironmentLabel(env)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service
                </label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Services</option>
                  {uniqueServices.map(service => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {filteredDrifts.length} of {drifts.length} drifts
        </span>
        {hasActiveFilters && (
          <Badge variant="secondary">
            Filters active
          </Badge>
        )}
      </div>

      {/* Table */}
      {filteredDrifts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FontAwesomeIcon icon={faCodeBranch} className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {hasActiveFilters ? 'No drifts match your filters' : 'No drifts found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {hasActiveFilters ? 'Try adjusting your search or filters' : 'No configuration drifts have been recorded'}
          </p>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/drifts/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Drift
            </Button>
          )}
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
                {filteredDrifts.map((drift) => (
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

      {/* Mark as Done Modal */}
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

      {/* Add Jira Ticket Modal */}
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
