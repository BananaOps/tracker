import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../lib/api'
import { EventType } from '../types/api'
import { TrendingUp, Clock, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWrench } from '@fortawesome/free-solid-svg-icons'

export default function RpaUsage() {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'operations'],
    queryFn: () => eventsApi.search({ type: EventType.OPERATION }),
  })

  const operations = data?.events || []

  // Filtrer les opérations RPA (basé sur la source ou le service)
  const rpaOperations = operations.filter(op => 
    op.attributes.source.toLowerCase().includes('rpa') ||
    op.attributes.service.toLowerCase().includes('rpa') ||
    op.attributes.message.toLowerCase().includes('rpa')
  )

  // Statistiques
  const currentMonth = new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const thisMonthOps = rpaOperations.filter(op => {
    if (!op.metadata?.createdAt) return false
    const date = new Date(op.metadata.createdAt)
    return date >= monthStart && date <= monthEnd
  })

  // Grouper par service
  const byService = rpaOperations.reduce((acc, op) => {
    const service = op.attributes.service
    if (!acc[service]) {
      acc[service] = []
    }
    acc[service].push(op)
    return acc
  }, {} as Record<string, typeof rpaOperations>)

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">RPA Usage</h2>
          <p className="mt-1 text-sm text-gray-500">
            Suivi de l'utilisation des processus RPA (Robotic Process Automation)
          </p>
        </div>
        <Link to="/rpa/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Créer une opération RPA</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faWrench} className="h-6 w-6 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Opérations RPA</p>
              <p className="text-2xl font-semibold text-gray-900">{rpaOperations.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ce mois</p>
              <p className="text-2xl font-semibold text-gray-900">{thisMonthOps.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Services RPA</p>
              <p className="text-2xl font-semibold text-gray-900">{Object.keys(byService).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilisation par service</h3>
        <div className="space-y-4">
          {Object.entries(byService).map(([service, ops]) => (
            <div key={service} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{service}</h4>
                <span className="text-sm text-gray-500">{ops.length} opérations</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${(ops.length / rpaOperations.length) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opérations récentes</h3>
        <div className="space-y-3">
          {rpaOperations.slice(0, 10).map((op) => (
            <div key={op.metadata?.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{op.title}</p>
                <p className="text-sm text-gray-600 mt-1">{op.attributes.message}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Service: <span className="font-medium">{op.attributes.service}</span></span>
                  <span>Source: <span className="font-medium">{op.attributes.source}</span></span>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 ml-4">
                {op.metadata?.createdAt && (
                  <time>
                    {format(new Date(op.metadata.createdAt), 'PPp', { locale: fr })}
                  </time>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {rpaOperations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucune opération RPA enregistrée
        </div>
      )}
    </div>
  )
}
