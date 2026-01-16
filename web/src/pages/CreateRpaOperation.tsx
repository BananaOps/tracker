import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { Bot } from 'lucide-react'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function CreateRpaOperation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  // Charger le catalogue pour la liste des services
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  // Date par défaut : maintenant
  const now = new Date()
  const defaultStartDate = now.toISOString().slice(0, 16) // Format datetime-local

  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    attributes: {
      message: '',
      source: 'tracker',
      type: EventType.RPA_USAGE,
      priority: Priority.P3,
      service: '',
      status: Status.START,
      environment: Environment.PRODUCTION,
      owner: '',
      startDate: defaultStartDate,
    },
    links: {},
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setShowToast(true)
      setTimeout(() => {
        navigate('/rpa')
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating RPA Operation:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)
    
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
        type: EventType.RPA_USAGE,
        priority: formData.attributes.priority,
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
    
    // Convertir les enums en nombres pour l'API
    const apiData = convertEventForAPI(submitData)
    createMutation.mutate(apiData)
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-3xl mx-auto pt-12">
      <div className="flex items-center space-x-3">
        <Bot className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create RPA Operation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register an RPA automation operation</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Error creating RPA operation. Please try again.</span>
        </div>
      )}
      
      {showToast && (
        <Toast 
          message="RPA Operation created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <Bot className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">What is an RPA operation?</h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              RPA (Robotic Process Automation) refers to the automation of repetitive business processes.
              Use this page to track executions of your robots, automation scripts, or automated workflows.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Operation Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Automatic invoice processing, Customer data synchronization"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Service / RPA Robot <span className="text-red-500">*</span>
                    {catalogLoading && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Loading...)</span>}
                  </label>
                  {catalogServices.length > 0 ? (
                    <select
                      value={formData.attributes.service}
                      onChange={(e) => setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, service: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select a service</option>
                      {catalogServices.map((service: string) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      required
                      value={formData.attributes.service}
                      onChange={(e) => setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, service: e.target.value }
                      })}
                      placeholder="Ex: rpa-invoice-processor, rpa-data-sync"
                    />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {catalogServices.length > 0 
                      ? 'Name of the robot or RPA service' 
                      : 'No services in catalog. Add services in the Catalog first.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="environment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Environment</label>
                  <select
                    value={formData.attributes.environment}
                    onChange={(e) => setFormData({
                      ...formData,
                      attributes: { ...formData.attributes, environment: e.target.value as Environment }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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

              <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Operation Status</label>
                <select
                  value={formData.attributes.status}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, status: e.target.value as Status }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={Status.START}>Started</option>
                  <option value={Status.SUCCESS}>Success</option>
                  <option value={Status.FAILURE}>Failure</option>
                  <option value={Status.WARNING}>Warning</option>
                  <option value={Status.ERROR}>Error</option>
                  <option value={Status.DONE}>Done</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Operation Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  value={formData.attributes.message}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, message: e.target.value }
                  })}
                  placeholder="Describe the operation performed: number of items processed, duration, results, any errors..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.attributes.startDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, startDate: e.target.value }
                  })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  End date will be automatically set to 1 hour after start date
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Owner / Responsible <span className="text-red-500">*</span>
                </label>
                <Input
                  id="owner"
                  type="text"
                  required
                  value={formData.attributes.owner || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, owner: e.target.value }
                  })}
                  placeholder="Ex: team-automation, rpa-team"
                />
              </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => navigate('/rpa')}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                <Bot className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create RPA Operation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

