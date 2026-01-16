import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, catalogApi } from '../lib/api'
import { Lock, AlertCircle } from 'lucide-react'
import { getEnvironmentLabel } from '../lib/eventUtils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'

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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-3xl mx-auto pt-12">
      <div className="flex items-center space-x-3">
        <Lock className="w-8 h-8 text-orange-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Lock</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lock a service to prevent concurrent deployments
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">What is a lock?</h3>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              A lock prevents concurrent deployments or operations on a service. Use locks to ensure only one team member can deploy or modify a service at a time, avoiding conflicts and ensuring safe operations.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
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
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
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
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select an environment</option>
                  {environments.map((env) => (
                    <option key={env} value={env}>
                      {getEnvironmentLabel(env)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="resource" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resource</label>
                <select
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select a resource (optional)</option>
                  {resources.map((res) => (
                    <option key={res} value={res}>
                      {res}
                    </option>
                  ))}
                </select>
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

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={() => navigate('/locks')}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
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
            </CardContent>
          </Card>
        </form>
      </div>
    )
  }

