import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { EventType, Status } from '../types/api'
import type { Event } from '../types/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Plus, Filter, X, ExternalLink, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import EventDetailsModal from '../components/EventDetailsModal'
import { getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'
import { convertEventToRequest } from '../lib/apiConverters'
import { getJiraCreateUrl, config } from '../config'

export default function DriftsList() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [selectedDrift, setSelectedDrift] = useState<Event | null>(null)
  const [jiraTicketUrl, setJiraTicketUrl] = useState('')
  const queryClient = useQueryClient()
  
  // États des filtres
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'drifts'],
    queryFn: () => eventsApi.search({ type: EventType.DRIFT as unknown as number }),
  })

  // Charger le catalogue pour la liste des services
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const allDrifts = data?.events || []
  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  // Mutation pour mettre à jour un drift avec le lien Jira
  const updateDriftMutation = useMutation({
    mutationFn: async ({ drift, ticketUrl }: { drift: Event; ticketUrl: string }) => {
      const eventRequest = convertEventToRequest(drift)
      return eventsApi.update(drift.metadata!.id!, {
        ...eventRequest,
        links: {
          ...eventRequest.links,
          ticket: ticketUrl,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'drifts'] })
      setShowJiraModal(false)
      setJiraTicketUrl('')
      setSelectedDrift(null)
    },
  })

  const handleCreateJiraTicket = (drift: Event) => {
    setSelectedDrift(drift)
    setJiraTicketUrl(drift.links?.ticket || '')
    setShowJiraModal(true)
  }

  const handleSaveJiraTicket = () => {
    if (selectedDrift && jiraTicketUrl) {
      updateDriftMutation.mutate({ drift: selectedDrift, ticketUrl: jiraTicketUrl })
    }
  }
  
  // Extraire les valeurs uniques pour les filtres
  const uniqueEnvironments = useMemo(() => {
    return Array.from(new Set(allDrifts.map(e => e.attributes.environment).filter(Boolean))).sort()
  }, [allDrifts])

  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(allDrifts.map(e => e.attributes.priority))).sort()
  }, [allDrifts])

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(allDrifts.map(e => e.attributes.status))).sort()
  }, [allDrifts])

  // Filtrer les drifts
  const drifts = useMemo(() => {
    return allDrifts.filter(drift => {
      // Filtre par environnement
      if (selectedEnvironments.length > 0) {
        const driftEnv = String(drift.attributes.environment || '').toLowerCase()
        const hasMatch = selectedEnvironments.some(env => env.toLowerCase() === driftEnv)
        if (!hasMatch) return false
      }

      // Filtre par priorité
      if (selectedPriorities.length > 0) {
        const driftPriority = String(drift.attributes.priority || '').toLowerCase()
        const hasMatch = selectedPriorities.some(priority => priority.toLowerCase() === driftPriority)
        if (!hasMatch) return false
      }

      // Filtre par status
      if (selectedStatuses.length > 0) {
        const driftStatus = String(drift.attributes.status || '').toLowerCase()
        const hasMatch = selectedStatuses.some(status => status.toLowerCase() === driftStatus)
        if (!hasMatch) return false
      }

      // Filtre par service
      if (selectedServices.length > 0) {
        if (!selectedServices.includes(drift.attributes.service)) return false
      }

      return true
    })
  }, [allDrifts, selectedEnvironments, selectedPriorities, selectedStatuses, selectedServices])

  // Fonctions pour gérer les filtres
  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value))
    } else {
      setter([...selected, value])
    }
  }

  const clearAllFilters = () => {
    setSelectedEnvironments([])
    setSelectedPriorities([])
    setSelectedStatuses([])
    setSelectedServices([])
  }

  const activeFiltersCount = selectedEnvironments.length + selectedPriorities.length + 
    selectedStatuses.length + selectedServices.length

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuration Drifts</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configuration drift detection ({drifts.length} drift{drifts.length > 1 ? 's' : ''} detected)
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-primary-600 font-medium">
                • {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/drifts/create" className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Drift</span>
          </Link>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 text-primary-600 rounded-full font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Filtre Environment */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</h4>
              <div className="space-y-2">
                {uniqueEnvironments.map(env => (
                  <label key={env} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEnvironments.includes(String(env))}
                      onChange={() => toggleFilter(String(env), selectedEnvironments, setSelectedEnvironments)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getEnvironmentLabel(env)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Priority */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</h4>
              <div className="space-y-2">
                {uniquePriorities.map(priority => (
                  <label key={priority} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(String(priority))}
                      onChange={() => toggleFilter(String(priority), selectedPriorities, setSelectedPriorities)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getPriorityLabel(priority)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h4>
              <div className="space-y-2">
                {uniqueStatuses.map(status => (
                  <label key={status} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(String(status))}
                      onChange={() => toggleFilter(String(status), selectedStatuses, setSelectedStatuses)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{getStatusLabel(status)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtre Service (depuis le catalogue) */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service (Catalog)
                {catalogLoading && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Loading...)</span>}
              </h4>
              {catalogServices.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {catalogServices.map((service: string) => (
                    <label key={service} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleFilter(service, selectedServices, setSelectedServices)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={service}>{service}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No services in catalog</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Total Drifts Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-yellow-50/50 dark:from-slate-800 dark:to-yellow-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Total Drifts</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{drifts.length}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-lg"></div>
                <FontAwesomeIcon icon={faCodeBranch} className="relative h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Unresolved Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Unresolved</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {drifts.filter((d: Event) => d.attributes.status !== Status.DONE && d.attributes.status !== Status.CLOSE).length}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                <AlertTriangle className="relative h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Resolved Card */}
        <div className="relative group h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative card border-0 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="flex items-center justify-between p-6 min-h-[120px]">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Resolved</p>
                </div>
                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  {drifts.filter((d: Event) => d.attributes.status === Status.DONE || d.attributes.status === Status.CLOSE).length}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg"></div>
                <FontAwesomeIcon icon={faCodeBranch} className="relative h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
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
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Service:</span>
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-xs font-semibold">
                      {drift.attributes.service}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-500 dark:text-gray-400">Source:</span>
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

                <div className="mt-3 flex items-center justify-between">
                  {drift.links?.ticket ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Ticket:</span>
                      <a
                        href={drift.links.ticket}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="break-all">{drift.links.ticket}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">No ticket linked</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateJiraTicket(drift)
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>{drift.links?.ticket ? 'Update Ticket' : 'Add Ticket'}</span>
                  </button>
                </div>
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
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {activeFiltersCount > 0 ? 'No drifts found with selected filters' : 'No drifts detected'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Jira Ticket Modal */}
      {showJiraModal && selectedDrift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {selectedDrift.links?.ticket ? 'Update Jira Ticket' : 'Add Jira Ticket'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Link a Jira ticket to this drift
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowJiraModal(false)
                    setJiraTicketUrl('')
                    setSelectedDrift(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Drift Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Drift Information</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">{selectedDrift.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Service: {selectedDrift.attributes.service}</p>
                </div>

                {/* Jira Ticket URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jira Ticket URL
                  </label>
                  <input
                    type="url"
                    value={jiraTicketUrl}
                    onChange={(e) => setJiraTicketUrl(e.target.value)}
                    placeholder="https://your-domain.atlassian.net/browse/PROJ-123"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter the full URL of the Jira ticket (e.g., https://your-domain.atlassian.net/browse/PROJ-123)
                  </p>
                </div>

                {/* Quick Create Button */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Quick Create in Jira</span>
                  </h4>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                    Create a new ticket in Jira, then paste the URL above.
                  </p>
                  <a
                    href={getJiraCreateUrl(selectedDrift.title, selectedDrift.attributes.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Jira (New Tab)</span>
                  </a>
                  {config.jira.domain === 'your-domain.atlassian.net' && (
                    <p className="mt-2 text-xs text-orange-700 dark:text-orange-300 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Configure your Jira domain in the deployment values.yaml</span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowJiraModal(false)
                      setJiraTicketUrl('')
                      setSelectedDrift(null)
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveJiraTicket}
                    disabled={!jiraTicketUrl || updateDriftMutation.isPending}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {updateDriftMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Save Ticket Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
