import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'

export default function CreateEvent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  // Charger le catalogue pour la liste des services
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  // Calculer les dates par défaut
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  const defaultStartDate = now.toISOString().slice(0, 16) // Format datetime-local
  const defaultEndDate = oneHourLater.toISOString().slice(0, 16)

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'tracker',
      type: EventType.DEPLOYMENT,
      priority: Priority.P3,
      service: '',
      status: Status.START,
      environment: Environment.PRODUCTION,
      owner: '',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setShowToast(true)
      setTimeout(() => {
        navigate('/events/timeline')
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating event:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)
    
    // Convertir les dates en ISO complet
    let startDateISO = undefined
    let endDateISO = undefined
    
    if (formData.attributes.startDate) {
      startDateISO = new Date(formData.attributes.startDate).toISOString()
    }
    
    if (formData.attributes.endDate) {
      endDateISO = new Date(formData.attributes.endDate).toISOString()
    }
    
    // S'assurer que la source est toujours "tracker"
    const eventData = {
      ...formData,
      attributes: {
        ...formData.attributes,
        source: 'tracker',
        startDate: startDateISO,
        endDate: endDateISO,
      },
    }
    
    // Convertir les enums en nombres pour l'API
    const apiData = convertEventForAPI(eventData)
    createMutation.mutate(apiData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Event</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a new event in the system</p>
      </div>

      {createMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error creating event. Please try again.</p>
        </div>
      )}
      
      {showToast && (
        <Toast 
          message="Event created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Deployment service-api v2.1.0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <select
              className="select"
              value={formData.attributes.type}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, type: e.target.value as EventType }
              })}
            >
              <option value={EventType.DEPLOYMENT}>Deployment</option>
              <option value={EventType.OPERATION}>Operation</option>
              <option value={EventType.DRIFT}>Drift</option>
              <option value={EventType.INCIDENT}>Incident</option>
              <option value={EventType.RPA_USAGE}>RPA Usage</option>
            </select>
          </div>

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
              <option value={Priority.P1}>P1 - Critical</option>
              <option value={Priority.P2}>P2 - High</option>
              <option value={Priority.P3}>P3 - Medium</option>
              <option value={Priority.P4}>P4 - Low</option>
              <option value={Priority.P5}>P5 - Very Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              <option value={Status.START}>Started</option>
              <option value={Status.SUCCESS}>Success</option>
              <option value={Status.FAILURE}>Failed</option>
              <option value={Status.WARNING}>Warning</option>
              <option value={Status.ERROR}>Error</option>
            </select>
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
              <option value={Environment.PREPRODUCTION}>Preproduction</option>
              <option value={Environment.PRODUCTION}>Production</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service <span className="text-red-500">*</span>
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
                placeholder="Ex: service-api"
              />
            )}
            {catalogServices.length === 0 && !catalogLoading && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No services in catalog. Add services in the <a href="/catalog/create" className="text-primary-600 hover:underline">Catalog</a> first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Owner <span className="text-red-500">*</span>
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
              placeholder="Ex: john.doe, team-platform"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            className="input"
            value={formData.attributes.message}
            onChange={(e) => setFormData({
              ...formData,
              attributes: { ...formData.attributes, message: e.target.value }
            })}
            placeholder="Detailed event description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
            <input
              type="datetime-local"
              className="input"
              value={formData.attributes.startDate || ''}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, startDate: e.target.value }
              })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
            <input
              type="datetime-local"
              className="input"
              value={formData.attributes.endDate || ''}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, endDate: e.target.value }
              })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pull Request (optional)</label>
          <input
            type="url"
            className="input"
            value={formData.links?.pullRequestLink || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, pullRequestLink: e.target.value }
            })}
            placeholder="https://github.com/org/repo/pull/123"
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
            placeholder="https://jira.company.com/browse/PROJ-123"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Full Jira ticket URL (e.g., https://jira.company.com/browse/PROJ-123)
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/events/timeline')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
