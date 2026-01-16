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
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { AlertCircle } from 'lucide-react'

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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-3xl mx-auto">
      <div className="flex items-center space-x-3">
        <FontAwesomeIcon icon={faCodeBranch} className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Drift</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a detected configuration drift</p>
        </div>
      </div>

      {createMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error creating drift. Please try again.
          </AlertDescription>
        </Alert>
      )}
      
      {showToast && (
        <Toast 
          message="Drift created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Alert>
          <FontAwesomeIcon icon={faCodeBranch} className="w-5 h-5 text-yellow-600" />
          <AlertDescription>
            <h3 className="text-sm font-medium mb-1">What is a drift?</h3>
            <p className="text-sm">
              A drift is a configuration deviation detected between the expected state and the actual state of a resource.
              This can be a manual modification, an unplanned update, or a configuration divergence.
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Drift Information</CardTitle>
            <CardDescription>Basic information about the configuration drift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Drift Title <span className="text-red-500">*</span>
              </Label>
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
                <Label htmlFor="service">
                  Affected Service <span className="text-red-500">*</span>
                  {catalogLoading && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Loading...)</span>}
                </Label>
                {catalogServices.length > 0 ? (
                  <Select
                    value={formData.attributes.service}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      attributes: { ...formData.attributes, service: value }
                    })}
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogServices.map((service: string) => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="service"
                    type="text"
                    required
                    value={formData.attributes.service}
                    onChange={(e) => setFormData({
                      ...formData,
                      attributes: { ...formData.attributes, service: e.target.value }
                    })}
                    placeholder="Ex: load-balancer, database, api-gateway"
                  />
                )}
                {catalogServices.length === 0 && !catalogLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No services in catalog. Add services in the <a href="/catalog/create" className="text-primary-600 hover:underline">Catalog</a> first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={formData.attributes.environment}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, environment: value as Environment }
                  })}
                >
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Environment.DEVELOPMENT}>Development</SelectItem>
                    <SelectItem value={Environment.INTEGRATION}>Integration</SelectItem>
                    <SelectItem value={Environment.UAT}>UAT</SelectItem>
                    <SelectItem value={Environment.RECETTE}>Recette</SelectItem>
                    <SelectItem value={Environment.PREPRODUCTION}>Preproduction</SelectItem>
                    <SelectItem value={Environment.PRODUCTION}>Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.attributes.priority}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, priority: value as Priority }
                  })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Priority.P1}>P1 - Critical (production impact)</SelectItem>
                    <SelectItem value={Priority.P2}>P2 - High (fix quickly)</SelectItem>
                    <SelectItem value={Priority.P3}>P3 - Medium</SelectItem>
                    <SelectItem value={Priority.P4}>P4 - Low</SelectItem>
                    <SelectItem value={Priority.P5}>P5 - Very Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.attributes.status}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, status: value as Status }
                  })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Status.OPEN}>Open (detected)</SelectItem>
                    <SelectItem value={Status.START}>In Progress (fixing)</SelectItem>
                    <SelectItem value={Status.DONE}>Resolved</SelectItem>
                    <SelectItem value={Status.CLOSE}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Drift Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                required
                rows={4}
                value={formData.attributes.message}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, message: e.target.value }
                })}
                placeholder="Describe the detected drift: what configuration changed, what is the difference between expected and actual state..."
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
              <Label htmlFor="impact" className="font-normal cursor-pointer">
                This drift has an impact on the service
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Check if the drift affects service functionality or security
            </p>

            <div className="space-y-2">
              <Label htmlFor="owner">
                Owner / Responsible <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="ticket">Ticket URL (optional)</Label>
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
            <FontAwesomeIcon icon={faCodeBranch} className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Drift'}
          </Button>
        </div>
      </form>
    </div>
  )
}
