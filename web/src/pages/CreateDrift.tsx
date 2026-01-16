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
import ServiceAutocomplete from '../components/ServiceAutocomplete'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { AlertCircle, GitBranch } from 'lucide-react'

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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-3xl mx-auto pt-12">
      <div className="flex items-center space-x-3">
        <GitBranch className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Drift</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a detected configuration drift</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Error creating drift. Please try again.</span>
        </div>
      )}
      
      {showToast && (
        <Toast 
          message="Drift created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <GitBranch className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">What is a drift?</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              A drift is a configuration deviation detected between the expected state and the actual state of a resource.
              This can be a manual modification, an unplanned update, or a configuration divergence.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Drift Information</CardTitle>
            <CardDescription>Basic information about the configuration drift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Drift Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Drift detected on load balancer configuration"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Affected Service <span className="text-red-500">*</span>
                </label>
                <ServiceAutocomplete
                  id="service"
                  value={formData.attributes.service}
                  onChange={(value) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, service: value }
                  })}
                  services={catalogServices}
                  loading={catalogLoading}
                  required
                  placeholder="Type to search or select a service"
                />
                {catalogServices.length === 0 && !catalogLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No services in catalog. Add services in the <a href="/catalog/create" className="text-primary-600 hover:underline">Catalog</a> first.
                  </p>
                )}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <select
                  value={formData.attributes.priority}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, priority: e.target.value as Priority }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={Priority.P1}>P1 - Critical (production impact)</option>
                  <option value={Priority.P2}>P2 - High (fix quickly)</option>
                  <option value={Priority.P3}>P3 - Medium</option>
                  <option value={Priority.P4}>P4 - Low</option>
                  <option value={Priority.P5}>P5 - Very Low</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={formData.attributes.status}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, status: e.target.value as Status }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={Status.OPEN}>Open (detected)</option>
                  <option value={Status.START}>In Progress (fixing)</option>
                  <option value={Status.DONE}>Resolved</option>
                  <option value={Status.CLOSE}>Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Drift Description <span className="text-red-500">*</span>
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
                placeholder="Describe the detected drift: what configuration changed, what is the difference between expected and actual state..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="impact"
                checked={formData.attributes.impact || false}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, impact: checked as boolean }
                })}
              />
              <label htmlFor="impact" className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300">
                This drift has an impact on the service
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Check if the drift affects service functionality or security
            </p>

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
                placeholder="Ex: team-platform, john.doe"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ticket" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ticket URL (optional)</label>
              <Input
                id="ticket"
                type="url"
                value={formData.links?.ticket || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  links: { ...formData.links, ticket: e.target.value }
                })}
                placeholder="https://jira.company.com/browse/DRIFT-123"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Full Jira ticket URL
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/drifts')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Drift'}
          </Button>
        </div>
      </form>
    </div>
  )
}
