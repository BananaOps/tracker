import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, catalogApi } from '../lib/api'
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { getEnvironmentLabel } from '../lib/eventUtils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'

export default function CreateLock() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  
  const [formData, setFormData] = useState({
    service: '',
    who: '',
    environment: '',
    resource: '',
    event_id: '',
  })

  const environments = [
    'development',
    'integration',
    'tnr',
    'uat',
    'recette',
    'preproduction',
    'production',
    'mco',
  ]

  const resources = [
    'deployment',
    'operation',
    'maintenance',
    'migration',
  ]

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true)
        const data = await catalogApi.list()
        const serviceNames = data.catalogs.map(catalog => catalog.name).sort()
        setServices(serviceNames)
      } catch (err) {
        console.error('Error loading services:', err)
        // Ne pas définir l'erreur ici, juste logger
        // L'utilisateur pourra toujours saisir manuellement
      } finally {
        setLoadingServices(false)
      }
    }

    fetchServices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.service || !formData.who || !formData.environment) {
      setError('Service, Locked By, and Environment fields are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const lockData: any = {
        service: formData.service,
        who: formData.who,
        environment: formData.environment,
      }
      
      if (formData.resource) {
        lockData.resource = formData.resource
      }
      
      if (formData.event_id) {
        lockData.event_id = formData.event_id
      }
      
      await locksApi.create(lockData)
      
      navigate('/locks')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error creating lock'
      
      // Améliorer le message d'erreur pour les locks
      let displayMessage = errorMessage
      if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
        displayMessage = `🔒 Service ${formData.service} is already locked in ${formData.environment}. Please check the Locks page to see who has locked it and unlock it first if needed.`
      } else if (errorMessage.toLowerCase().includes('internal error')) {
        displayMessage = `🔒 Cannot create lock: Service ${formData.service} may already be locked. Please check the Locks page.`
      }
      
      setError(displayMessage)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/locks')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Lock</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Lock a service to prevent concurrent deployments
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-5 h-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service <span className="text-red-500">*</span>
                </label>
                {loadingServices ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 dark:text-gray-400">Loading services...</span>
                  </div>
                ) : services.length > 0 ? (
                  <Select
                    value={formData.service}
                    onValueChange={(value) => setFormData({ ...formData, service: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      placeholder="ex: api-gateway, user-service"
                      required
                    />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      No services found in catalog. You can enter the name manually.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="who" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Locked By <span className="text-red-500">*</span>
                </label>
                <Input
                  id="who"
                  type="text"
                  value={formData.who}
                  onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                  placeholder="ex: john.doe, team-platform"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="environment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Environment <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData({ ...formData, environment: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {getEnvironmentLabel(env)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="resource" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resource</label>
                <Select
                  value={formData.resource}
                  onValueChange={(value) => setFormData({ ...formData, resource: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resource (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((res) => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Type of resource to lock (optional)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event ID</label>
                <Input
                  id="event_id"
                  type="text"
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  placeholder="ex: 123e4567-e89b-12d3-a456-426614174000"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Associated event ID (optional)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => navigate('/locks')}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Create Lock
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

