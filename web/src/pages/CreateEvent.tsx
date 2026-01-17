import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import ServiceAutocomplete from '../components/ServiceAutocomplete'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Clock, AlertCircle } from 'lucide-react'

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

  // État pour la récurrence
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'1week' | '2weeks' | '4weeks'>('1week')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

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
      status: Status.OPEN,
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
        navigate(-1) // Retour à la page précédente
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating event:', error)
    },
  })

  const getErrorMessage = () => {
    if (!createMutation.isError) return ''
    
    const error = createMutation.error as any
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
    
    // Améliorer le message d'erreur pour les locks
    if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
      return `🔒 Cannot create event: Service is already locked. Please check the Locks page to see who has locked it and unlock it first if needed.`
    } else if (errorMessage.toLowerCase().includes('cannot create event')) {
      // Le backend renvoie déjà "cannot create event: ..." avec le détail
      return `🔒 ${errorMessage}`
    } else if (errorMessage.toLowerCase().includes('internal error')) {
      return `🔒 Cannot create event: There may be a lock conflict. Please check the Locks page.`
    }
    
    return `❌ Error creating event: ${errorMessage}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Si récurrence activée, créer plusieurs événements
    if (isRecurring && recurrenceEndDate && startDateISO) {
      const events: any[] = []
      const startDate = new Date(formData.attributes.startDate!)
      const endDate = new Date(formData.attributes.endDate!)
      const recurrenceEnd = new Date(recurrenceEndDate)
      
      // Calculer l'intervalle en jours
      const intervalDays = recurrenceFrequency === '1week' ? 7 : recurrenceFrequency === '2weeks' ? 14 : 28
      
      let currentStart = new Date(startDate)
      let currentEnd = new Date(endDate)
      
      // Générer les événements récurrents
      while (currentStart <= recurrenceEnd) {
        const recurringEvent = {
          ...eventData,
          title: `${formData.title} (${currentStart.toLocaleDateString()})`,
          attributes: {
            ...eventData.attributes,
            startDate: currentStart.toISOString(),
            endDate: currentEnd.toISOString(),
          },
        }
        events.push(convertEventForAPI(recurringEvent))
        
        // Avancer à la prochaine occurrence
        currentStart = new Date(currentStart.getTime() + intervalDays * 24 * 60 * 60 * 1000)
        currentEnd = new Date(currentEnd.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      }
      
      // Créer tous les événements
      try {
        for (const event of events) {
          await eventsApi.create(event)
        }
        queryClient.invalidateQueries({ queryKey: ['events'] })
        setShowToast(true)
        setTimeout(() => {
          navigate(-1)
        }, 2000)
      } catch (error) {
        console.error('Error creating recurring events:', error)
      }
    } else {
      // Créer un seul événement
      const apiData = convertEventForAPI(eventData)
      createMutation.mutate(apiData)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen max-w-3xl mx-auto pt-12">
      <div className="flex items-center space-x-3">
        <Clock className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Event</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a new event in the system</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="flex items-start gap-2 p-4 text-red-800 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{getErrorMessage()}</p>
            {getErrorMessage().includes('🔒') && (
              <p className="text-sm mt-2">
                💡 Tip: You can view and manage locks on the <a href="/locks" className="underline hover:text-red-800 dark:hover:text-red-200">Locks page</a>
              </p>
            )}
          </div>
        </div>
      )}
      
      {showToast && (
        <Toast 
          message="Event created successfully!"
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">What is an event?</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Events track important activities in your infrastructure: deployments, operations, incidents, drifts, and RPA executions. They provide a timeline of changes and help correlate issues with deployments.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
            <CardDescription>Basic information about the event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Deployment service-api v2.1.0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select
                  value={formData.attributes.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, type: e.target.value as EventType }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={EventType.DEPLOYMENT}>Deployment</option>
                  <option value={EventType.OPERATION}>Operation</option>
                  <option value={EventType.DRIFT}>Drift</option>
                  <option value={EventType.INCIDENT}>Incident</option>
                  <option value={EventType.RPA_USAGE}>RPA Usage</option>
                </select>
              </div>

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
                  <option value={Priority.P1}>P1 - Critical</option>
                  <option value={Priority.P2}>P2 - High</option>
                  <option value={Priority.P3}>P3 - Medium</option>
                  <option value={Priority.P4}>P4 - Low</option>
                  <option value={Priority.P5}>P5 - Very Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  <option value={Status.OPEN}>Open (Planned)</option>
                  <option value={Status.START}>Started</option>
                  <option value={Status.IN_PROGRESS}>In Progress</option>
                  <option value={Status.SUCCESS}>Success</option>
                  <option value={Status.DONE}>Done</option>
                  <option value={Status.FAILURE}>Failed</option>
                  <option value={Status.WARNING}>Warning</option>
                  <option value={Status.ERROR}>Error</option>
                  <option value={Status.CLOSE}>Closed</option>
                </select>
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
                  <option value={Environment.PREPRODUCTION}>Preproduction</option>
                  <option value={Environment.PRODUCTION}>Production</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service <span className="text-red-500">*</span>
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
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Owner <span className="text-red-500">*</span>
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
                  placeholder="Ex: john.doe, team-platform"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={3}
                value={formData.attributes.message}
                onChange={(e) => setFormData({
                  ...formData,
                  attributes: { ...formData.attributes, message: e.target.value }
                })}
                placeholder="Detailed event description"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.attributes.endDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    attributes: { ...formData.attributes, endDate: e.target.value }
                  })}
                />
              </div>
            </div>

            {/* Recurring Events Section */}
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Create recurring event
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="recurrenceFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Frequency <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="recurrenceFrequency"
                        value={recurrenceFrequency}
                        onChange={(e) => setRecurrenceFrequency(e.target.value as '1week' | '2weeks' | '4weeks')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={isRecurring}
                      >
                        <option value="1week">Every week</option>
                        <option value="2weeks">Every 2 weeks</option>
                        <option value="4weeks">Every 4 weeks</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recurrence End Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="recurrenceEndDate"
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        required={isRecurring}
                        min={formData.attributes.startDate?.slice(0, 10)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 Multiple events will be created automatically based on the selected frequency until the end date.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pullRequest" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pull Request (optional)</label>
              <Input
                id="pullRequest"
                type="url"
                value={formData.links?.pullRequestLink || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  links: { ...formData.links, pullRequestLink: e.target.value }
                })}
                placeholder="https://github.com/org/repo/pull/123"
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
                placeholder="https://jira.company.com/browse/PROJ-123"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Full Jira ticket URL
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => navigate(-1)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                <Clock className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
