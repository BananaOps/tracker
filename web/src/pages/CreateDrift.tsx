import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'

export default function CreateDrift() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  // Charger le catalogue pour la liste des services
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'tracker',
      type: EventType.DRIFT,
      priority: Priority.P2,
      service: '',
      status: Status.OPEN,
      environment: Environment.PRODUCTION,
      impact: false,
      owner: '',
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setShowToast(true)
      setTimeout(() => {
        navigate('/drifts')
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating drift:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)
    
    // Convertir les enums en nombres pour l'API
    const apiData = convertEventForAPI(formData)
    createMutation.mutate(apiData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <FontAwesomeIcon icon={faCodeBranch} className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Drift</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a detected configuration drift</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error creating drift. Please try again.</p>
        </div>
      )}
      
      {showToast && (
        <Toast 
          message="Drift created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faCodeBranch} className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">What is a drift?</h3>
              <p className="text-sm text-yellow-700 mt-1">
                A drift is a configuration deviation detected between the expected state and the actual state of a resource.
                This can be a manual modification, an unplanned update, or a configuration divergence.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Drift Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Drift detected on load balancer configuration"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Affected Service <span className="text-red-500">*</span>
              {catalogLoading && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Loading...)</span>}
            </label>
            {catalogServices.length > 0 ? (
              <select
                required
                className="select"
                value={formData.attributes.service}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, service: e.target.value }
                })}
              >
                <option value="">Select a service</option>
                {catalogServices.map((service: string) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                className="input"
                value={formData.attributes.service}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, service: e.target.value }
                })}
                placeholder="Ex: load-balancer, database, api-gateway"
              />
            )}
            {catalogServices.length === 0 && !catalogLoading && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No services in catalog. Add services in the <a href="/catalog/create" className="text-primary-600 hover:underline">Catalog</a> first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</label>
            <select
              className="select"
              value={formData.attributes.environment}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, environment: e.target.value as Environment }
              })}
            >
              <option value={Environment.DEVELOPMENT}>Development</option>
              <option value={Environment.INTEGRATION}>Integration</option>
              <option value={Environment.UAT}>UAT</option>
              <option value={Environment.RECETTE}>Recette</option>
              <option value={Environment.PREPRODUCTION}>Preproduction</option>
              <option value={Environment.PRODUCTION}>Production</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select
              className="select"
              value={formData.attributes.priority}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, priority: e.target.value as Priority }
              })}
            >
              <option value={Priority.P1}>P1 - Critical (production impact)</option>
              <option value={Priority.P2}>P2 - High (fix quickly)</option>
              <option value={Priority.P3}>P3 - Medium</option>
              <option value={Priority.P4}>P4 - Low</option>
              <option value={Priority.P5}>P5 - Very Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              className="select"
              value={formData.attributes.status}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, status: e.target.value as Status }
              })}
            >
              <option value={Status.OPEN}>Open (detected)</option>
              <option value={Status.START}>In Progress (fixing)</option>
              <option value={Status.DONE}>Resolved</option>
              <option value={Status.CLOSE}>Closed</option>
            </select>
          </div>
        </div>



        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Drift Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            className="input"
            value={formData.attributes.message}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, message: e.target.value }
            })}
            placeholder="Describe the detected drift: what configuration changed, what is the difference between expected and actual state..."
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.attributes.impact || false}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, impact: e.target.checked }
              })}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              This drift has an impact on the service
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
            Check if the drift affects service functionality or security
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Owner / Responsible <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.attributes.owner || ''}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, owner: e.target.value }
            })}
            placeholder="Ex: team-platform, john.doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ticket URL (optional)</label>
          <input
            type="url"
            className="input"
            value={formData.links?.ticket || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, ticket: e.target.value }
            })}
            placeholder="https://jira.company.com/browse/DRIFT-123"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Full Jira ticket URL
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/drifts')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faCodeBranch} className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Creating...' : 'Create Drift'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
