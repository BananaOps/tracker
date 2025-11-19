import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType, Status } from '../types/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TrendingDown, AlertTriangle, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DriftsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'drifts'],
    queryFn: () => eventsApi.search({ type: EventType.DRIFT }),
  })

  const drifts = data?.events || []

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Drifts de configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Détection des dérives de configuration ({drifts.length} drifts détectés)
          </p>
        </div>
        <Link to="/drifts/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Créer un drift</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <TrendingDown className="h-6 w-6 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Drifts</p>
              <p className="text-2xl font-semibold text-gray-900">{drifts.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Non résolus</p>
              <p className="text-2xl font-semibold text-gray-900">
                {drifts.filter(d => d.attributes.status !== Status.DONE && d.attributes.status !== Status.CLOSE).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingDown className="h-6 w-6 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Résolus</p>
              <p className="text-2xl font-semibold text-gray-900">
                {drifts.filter(d => d.attributes.status === Status.DONE || d.attributes.status === Status.CLOSE).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {drifts.map((drift) => (
          <div key={drift.metadata?.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{drift.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    drift.attributes.status === Status.DONE || drift.attributes.status === Status.CLOSE
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {drift.attributes.status === Status.DONE || drift.attributes.status === Status.CLOSE
                      ? 'Résolu'
                      : 'En cours'}
                  </span>
                </div>

                <p className="text-gray-600 mb-3">{drift.attributes.message}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium text-gray-900">{drift.attributes.service}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-2 font-medium text-gray-900">{drift.attributes.source}</span>
                  </div>
                  {drift.attributes.environment && (
                    <div>
                      <span className="text-gray-500">Environnement:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {drift.attributes.environment}
                      </span>
                    </div>
                  )}
                  {drift.attributes.owner && (
                    <div>
                      <span className="text-gray-500">Owner:</span>
                      <span className="ml-2 font-medium text-gray-900">{drift.attributes.owner}</span>
                    </div>
                  )}
                </div>

                {drift.links?.ticket && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">Ticket: </span>
                    <span className="text-sm font-medium text-primary-600">{drift.links.ticket}</span>
                  </div>
                )}
              </div>

              <div className="text-right text-sm text-gray-500 ml-4">
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
        <div className="text-center py-12 text-gray-500">
          Aucun drift détecté
        </div>
      )}
    </div>
  )
}
