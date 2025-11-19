import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'

export default function CreateEvent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Charger le catalogue pour la liste des services
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map(c => c.name).sort() || []

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'manual', // Source automatique
      type: EventType.DEPLOYMENT,
      priority: Priority.P3,
      service: '',
      status: Status.START,
      environment: Environment.PRODUCTION,
      owner: '', // Champ auteur
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/events/timeline')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // S'assurer que la source est toujours "manual"
    const eventData = {
      ...formData,
      attributes: {
        ...formData.attributes,
        source: 'manual',
      },
    }
    createMutation.mutate(eventData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Event</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a new event in the system</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
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
                attributes: { ...formData.attributes, type: Number(e.target.value) as EventType }
              })}
            >
              <option value={EventType.DEPLOYMENT}>Deployment</option>
              <option value={EventType.OPERATION}>Operation</option>
              <option value={EventType.DRIFT}>Drift</option>
              <option value={EventType.INCIDENT}>Incident</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select
              className="select"
              value={formData.attributes.priority}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, priority: Number(e.target.value) as Priority }
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
                attributes: { ...formData.attributes, status: Number(e.target.value) as Status }
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
                attributes: { ...formData.attributes, environment: Number(e.target.value) as Environment }
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
              Service {catalogLoading && <span className="text-xs text-gray-500 dark:text-gray-400">(Loading...)</span>}
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
                {catalogServices.map(service => (
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Author</label>
            <input
              type="text"
              required
              className="input"
              value={formData.attributes.owner || ''}
              onChange={(e) => setFormData({
                ...formData,
                attributes: { ...formData.attributes, owner: e.target.value }
              })}
              placeholder="Ex: john.doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ticket (optional)</label>
          <input
            type="text"
            className="input"
            value={formData.links?.ticket || ''}
            onChange={(e) => setFormData({
              ...formData,
              links: { ...formData.links, ticket: e.target.value }
            })}
            placeholder="JIRA-123"
          />
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
