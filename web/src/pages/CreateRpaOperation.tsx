import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWrench, faRobot } from '@fortawesome/free-solid-svg-icons'

export default function CreateRpaOperation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
      type: EventType.OPERATION,
      priority: Priority.P3,
      service: '',
      status: Status.START,
      environment: Environment.PRODUCTION,
      owner: '',
    },
    links: {},
  })

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setSuccessMessage('RPA Operation created successfully!')
      setTimeout(() => {
        navigate('/rpa')
      }, 1500)
    },
    onError: (error: any) => {
      console.error('Error creating RPA Operation:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    
    // Convertir startDate et calculer endDate
    let startDateISO = undefined
    let endDateISO = undefined
    
    if (formData.attributes.startDate) {
      const startDateTime = new Date(formData.attributes.startDate)
      startDateISO = startDateTime.toISOString()
      
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)
      endDateISO = endDateTime.toISOString()
    }
    
    // Préparer les données avec les valeurs automatiques
    const submitData: CreateEventRequest = {
      title: formData.title,
      attributes: {
        message: formData.attributes.message,
        type: EventType.OPERATION,
        priority: Priority.P1,
        source: 'tracker',
        service: formData.attributes.service,
        status: formData.attributes.status,
        environment: formData.attributes.environment,
        owner: formData.attributes.owner,
        startDate: startDateISO,
        endDate: endDateISO,
      },
      links: {},
    }
    
    createMutation.mutate(submitData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <FontAwesomeIcon icon={faWrench} className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create RPA Operation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register an RPA automation operation</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
        </div>
      )}

      {createMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error creating RPA operation. Please try again.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-purple-800">What is an RPA operation?</h3>
              <p className="text-sm text-purple-700 mt-1">
                RPA (Robotic Process Automation) refers to the automation of repetitive business processes.
                Use this page to track executions of your robots, automation scripts, or automated workflows.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Operation Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Automatic invoice processing, Customer data synchronization"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service / RPA Robot <span className="text-red-500">*</span>
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
                placeholder="Ex: rpa-invoice-processor, rpa-data-sync"
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {catalogServices.length > 0 
                ? 'Name of the robot or RPA service' 
                : 'No services in catalog. Add services in the Catalog first.'}
            </p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operation Status</label>
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
            <option value={Status.FAILURE}>Failure</option>
            <option value={Status.WARNING}>Warning</option>
            <option value={Status.ERROR}>Error</option>
            <option value={Status.DONE}>Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Operation Description <span className="text-red-500">*</span>
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
            placeholder="Describe the operation performed: number of items processed, duration, results, any errors..."
          />
        </div>

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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            End date will be automatically set to 1 hour after start date
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
            placeholder="Ex: team-automation, rpa-team"
          />
        </div>



        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/rpa')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faWrench} className="w-4 h-4" />
            <span>{createMutation.isPending ? 'Creating...' : 'Create RPA Operation'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

