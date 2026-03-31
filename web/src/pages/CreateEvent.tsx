import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import ServiceAutocomplete from '../components/ServiceAutocomplete'
import { AlertCircle, FileText, Clock, Link2, Search, Zap, Plus, Github, Ticket, Repeat } from 'lucide-react'

export default function CreateEvent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'1week' | '2weeks' | '4weeks'>('1week')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
  const defaultStartDate = now.toISOString().slice(0, 16)
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

  // Find downstream dependencies for the selected service
  const selectedCatalog = catalogData?.catalogs.find((c: any) => c.name === formData.attributes.service)
  const downstreamServices: string[] = selectedCatalog?.dependenciesOut || selectedCatalog?.dependencies_out || []

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setShowToast(true)
      setTimeout(() => { navigate(-1) }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating event:', error)
    },
  })

  const getErrorMessage = () => {
    if (!createMutation.isError) return ''
    const error = createMutation.error as any
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
    if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
      return `🔒 Cannot create event: Service is already locked. Please check the Locks page to see who has locked it and unlock it first if needed.`
    } else if (errorMessage.toLowerCase().includes('cannot create event')) {
      return `🔒 ${errorMessage}`
    } else if (errorMessage.toLowerCase().includes('internal error')) {
      return `🔒 Cannot create event: There may be a lock conflict. Please check the Locks page.`
    }
    return `❌ Error creating event: ${errorMessage}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)

    let startDateISO = undefined
    let endDateISO = undefined
    if (formData.attributes.startDate) {
      startDateISO = new Date(formData.attributes.startDate).toISOString()
    }
    if (formData.attributes.endDate) {
      endDateISO = new Date(formData.attributes.endDate).toISOString()
    }

    const eventData = {
      ...formData,
      attributes: {
        ...formData.attributes,
        source: 'tracker',
        startDate: startDateISO,
        endDate: endDateISO,
      },
    }

    if (isRecurring && recurrenceEndDate && startDateISO) {
      const events: any[] = []
      const startDate = new Date(formData.attributes.startDate!)
      const endDate = new Date(formData.attributes.endDate!)
      const recurrenceEnd = new Date(recurrenceEndDate)
      const intervalDays = recurrenceFrequency === '1week' ? 7 : recurrenceFrequency === '2weeks' ? 14 : 28
      let currentStart = new Date(startDate)
      let currentEnd = new Date(endDate)

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
        currentStart = new Date(currentStart.getTime() + intervalDays * 24 * 60 * 60 * 1000)
        currentEnd = new Date(currentEnd.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      }

      try {
        for (const event of events) {
          await eventsApi.create(event)
        }
        queryClient.invalidateQueries({ queryKey: ['events'] })
        setShowToast(true)
        setTimeout(() => { navigate(-1) }, 2000)
      } catch (error) {
        console.error('Error creating recurring events:', error)
      }
    } else {
      const apiData = convertEventForAPI(eventData)
      createMutation.mutate(apiData)
    }
  }

  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
  const hud = {
    surface: 'rgb(var(--hud-surface))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary: 'rgb(var(--hud-primary))',
    tertiary: 'rgb(var(--hud-tertiary))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outline: 'rgb(var(--hud-outline))',
    outlineVar: 'rgb(var(--hud-outline-var))',
    error: 'rgb(var(--hud-error))',
    success: 'rgb(var(--hud-success))',
  }

  const inputCls = "w-full border-0 border-b-2 border-transparent px-4 py-3 rounded-t-lg transition-all text-sm focus:outline-none"
  const inputStyle = { background: 'rgb(var(--hud-surface-low))', color: hud.onSurface }
  const labelCls = "block text-[10px] uppercase tracking-widest font-bold mb-2"

  const SectionHeader = ({ icon, title, color }: { icon: React.ReactNode; title: string; color?: string }) => (
    <div className="flex items-center gap-3 mb-8">
      <span style={{ color: color || hud.primary }}>{icon}</span>
      <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
    </div>
  )

  return (
    <div className="min-h-full overflow-auto" style={{ background: 'rgb(var(--hud-bg))', color: hud.onSurface }}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Create a New Event
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            Register a new operation, incident or deployment. Data accuracy ensures system integrity.
          </p>
        </div>

        {createMutation.isError && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-8" style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: hud.error }} />
            <div>
              <p className="text-sm font-medium" style={{ color: hud.error }}>{getErrorMessage()}</p>
              {getErrorMessage().includes('🔒') && (
                <p className="text-xs mt-2" style={{ color: hud.onSurfaceVar }}>
                  💡 View and manage locks on the <a href="/locks" className="underline" style={{ color: hud.primary }}>Locks page</a>
                </p>
              )}
            </div>
          </div>
        )}

        {showToast && <Toast message="Event created successfully!" onClose={() => setShowToast(false)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* ── Left Column: Core Info ── */}
            <div className="md:col-span-8 space-y-8">

              {/* Section: Event Information */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<FileText className="w-5 h-5" />} title="Event Information" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Event Title <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g.: Deploy Cluster-K8S-Production-V2"
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Event Type</label>
                    <select value={formData.attributes.type}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, type: e.target.value as EventType } })}
                      className={inputCls + ' appearance-none'} style={inputStyle}>
                      <option value={EventType.DEPLOYMENT}>Deployment</option>
                      <option value={EventType.OPERATION}>Operation</option>
                      <option value={EventType.DRIFT}>Drift</option>
                      <option value={EventType.INCIDENT}>Incident</option>
                      <option value={EventType.RPA_USAGE}>RPA Usage</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Environment</label>
                    <select value={formData.attributes.environment}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, environment: e.target.value as Environment } })}
                      className={inputCls + ' appearance-none'} style={inputStyle}>
                      <option value={Environment.PRODUCTION}>Production</option>
                      <option value={Environment.PREPRODUCTION}>Preproduction</option>
                      <option value={Environment.UAT}>UAT</option>
                      <option value={Environment.INTEGRATION}>Integration</option>
                      <option value={Environment.DEVELOPMENT}>Development</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Priority</label>
                    <select value={formData.attributes.priority}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, priority: e.target.value as Priority } })}
                      className={inputCls + ' appearance-none'} style={inputStyle}>
                      <option value={Priority.P1}>P1 - Critical</option>
                      <option value={Priority.P2}>P2 - High</option>
                      <option value={Priority.P3}>P3 - Medium</option>
                      <option value={Priority.P4}>P4 - Low</option>
                      <option value={Priority.P5}>P5 - Very Low</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Initial Status</label>
                    <select value={formData.attributes.status}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, status: e.target.value as Status } })}
                      className={inputCls + ' appearance-none'} style={inputStyle}>
                      <option value={Status.OPEN}>Open</option>
                      <option value={Status.PLANNED}>Planned</option>
                      <option value={Status.START}>Started</option>
                      <option value={Status.IN_PROGRESS}>In Progress</option>
                      <option value={Status.SUCCESS}>Success</option>
                      <option value={Status.DONE}>Done</option>
                      <option value={Status.FAILURE}>Failed</option>
                      <option value={Status.WARNING}>Warning</option>
                      <option value={Status.CLOSE}>Closed</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Section: Technical Details */}
              <section className="p-8 rounded-xl overflow-visible relative z-10" style={{ background: hud.surface }}>
                <SectionHeader icon={<Search className="w-5 h-5" />} title="Technical Details" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Message / Description <span style={{ color: hud.error }}>*</span></label>
                    <textarea required rows={4} value={formData.attributes.message}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, message: e.target.value } })}
                      placeholder="Describe the details of the intervention or observed symptoms..."
                      className={inputCls + ' resize-none'} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative z-10">
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Impacted Service <span style={{ color: hud.error }}>*</span></label>
                      <ServiceAutocomplete
                        id="service"
                        value={formData.attributes.service}
                        onChange={(value) => setFormData({ ...formData, attributes: { ...formData.attributes, service: value } })}
                        services={catalogServices}
                        loading={catalogLoading}
                        required
                        placeholder="Search for a service..."
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Owner <span style={{ color: hud.error }}>*</span></label>
                      <input type="text" required value={formData.attributes.owner || ''}
                        onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, owner: e.target.value } })}
                        placeholder="ex: john.doe, team-platform"
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Resources */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Link2 className="w-5 h-5" />} title="Resources" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Ticket Jira</label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-3 w-4 h-4" style={{ color: hud.onSurfaceVar }} />
                      <input type="url" value={formData.links?.ticket || ''}
                        onChange={(e) => setFormData({ ...formData, links: { ...formData.links, ticket: e.target.value } })}
                        placeholder="ex: https://jira.company.com/TRK-1234"
                        className={inputCls + ' pl-10'} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>GitHub PR</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-3 w-4 h-4" style={{ color: hud.onSurfaceVar }} />
                      <input type="url" value={formData.links?.pullRequestLink || ''}
                        onChange={(e) => setFormData({ ...formData, links: { ...formData.links, pullRequestLink: e.target.value } })}
                        placeholder="ex: https://github.com/org/repo/pull/452"
                        className={inputCls + ' pl-10'} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column: Planning ── */}
            <div className="md:col-span-4 space-y-8">

              {/* Section: Planning */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface, borderLeft: `4px solid ${hud.tertiary}` }}>
                <SectionHeader icon={<Clock className="w-5 h-5" />} title="Scheduling" color={hud.tertiary} />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Start</label>
                    <input type="datetime-local" value={formData.attributes.startDate || ''}
                      onChange={(e) => {
                        const newStart = e.target.value
                        const end = formData.attributes.endDate
                        setFormData({ ...formData, attributes: { ...formData.attributes, startDate: newStart, endDate: (end && newStart > end) ? newStart : end } })
                      }}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Estimated End</label>
                    <input type="datetime-local" value={formData.attributes.endDate || ''} min={formData.attributes.startDate || undefined}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, endDate: e.target.value } })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </section>

              {/* Section: Recurrence Widget */}
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Repeat className="w-20 h-20" />
                </div>
                <div className="flex flex-col items-center text-center py-2">
                  <Repeat className="w-10 h-10 mb-4" style={{ color: isRecurring ? hud.primary : hud.success }} />
                  <h4 className="font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recurrence</h4>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="sr-only peer" />
                    <div className="relative w-14 h-7 rounded-full peer transition-colors"
                      style={{ background: isRecurring ? hud.primary : hud.surfaceHighest }}>
                      <div className="absolute top-0.5 left-[4px] bg-white rounded-full h-6 w-6 transition-transform"
                        style={{ transform: isRecurring ? 'translateX(100%)' : 'translateX(0)' }} />
                    </div>
                    <span className="ms-3 text-sm font-medium" style={{ color: hud.onSurfaceVar }}>Enable</span>
                  </label>
                  {isRecurring && (
                    <div className="w-full space-y-4 mt-6 text-left">
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Frequency</label>
                        <select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                          className={inputCls + ' appearance-none'} style={inputStyle} required={isRecurring}>
                          <option value="1week">Every week</option>
                          <option value="2weeks">Every 2 weeks</option>
                          <option value="4weeks">Every 4 weeks</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>End Date</label>
                        <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          required={isRecurring} min={formData.attributes.startDate?.slice(0, 10)}
                          className={inputCls} style={inputStyle} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Impact Widget */}
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className="fa-solid fa-meteor text-7xl" />
                </div>
                <div className="flex flex-col items-center text-center py-2">
                  <i className="fa-solid fa-meteor text-4xl mb-4 transition-colors duration-300"
                    style={{ color: formData.attributes.impact ? hud.error : hud.success }} />
                  <h4 className="font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Impact Detection</h4>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.attributes.impact || false}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, impact: e.target.checked } })}
                      className="sr-only peer" />
                    <div className="relative w-14 h-7 rounded-full peer transition-colors"
                      style={{ background: formData.attributes.impact ? hud.error : hud.surfaceHighest }}>
                      <div className="absolute top-0.5 left-[4px] bg-white rounded-full h-6 w-6 transition-transform"
                        style={{ transform: formData.attributes.impact ? 'translateX(100%)' : 'translateX(0)' }} />
                    </div>
                    <span className="ms-3 text-sm font-medium" style={{ color: hud.onSurfaceVar }}>Impact detected</span>
                  </label>
                </div>
              </section>

              {/* Section: Downstream Impact */}
              {formData.attributes.service && (
                <section className="p-6 rounded-xl" style={{ background: hud.surface, borderLeft: `4px solid ${hud.error}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-diagram-project text-sm" style={{ color: hud.error }} />
                    <h4 className="text-xs uppercase tracking-widest font-bold" style={{ color: hud.onSurfaceVar }}>Downstream Services</h4>
                  </div>
                  {downstreamServices.length > 0 ? (
                    <ul className="space-y-2">
                      {downstreamServices.map((svc) => (
                        <li key={svc} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'rgb(var(--hud-surface-low))' }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: hud.error }} />
                          {svc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs" style={{ color: hud.onSurfaceVar }}>No downstream dependencies found.</p>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <button type="button" onClick={() => navigate(-1)}
              className="px-8 py-3 font-bold transition-colors hover:opacity-80"
              style={{ color: hud.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-10 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${hud.primary}, ${ha('primary-dim', 1)})`,
                color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 4px 20px ${ha('primary', 0.25)}`,
              }}>
              <Plus className="w-4 h-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Background Glows */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none" style={{ background: ha('primary', 0.05) }} />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: ha('tertiary', 0.05) }} />
    </div>
  )
}
