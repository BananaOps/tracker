import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { EventType, Status } from '../types/api'
import type { Event } from '../types/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Plus, Filter, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import EventDetailsModal from '../components/EventDetailsModal'
import { getEnvironmentLabel, getPriorityLabel, getStatusLabel } from '../lib/eventUtils'

export default function DriftsList() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
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
    </div>
  )
}
