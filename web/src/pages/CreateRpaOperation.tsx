import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { eventsApi, catalogApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { EventType, Priority, Status, Environment } from '../types/api'
import type { CreateEventRequest } from '../types/api'
import { convertEventForAPI } from '../lib/apiConverters'
import Toast from '../components/Toast'
import ServiceAutocomplete from '../components/ServiceAutocomplete'
import { AlertCircle, Bot, Clock, Plus, Search } from 'lucide-react'

export default function CreateRpaOperation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalogs', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const catalogServices = catalogData?.catalogs.map((c: any) => c.name).sort() || []

  const now = new Date()
  const defaultStartDate = now.toISOString().slice(0, 16)

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
      setTimeout(() => { navigate('/rpa') }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating RPA Operation:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)

    let startDateISO: string | undefined
    let endDateISO: string | undefined
    if (formData.attributes.startDate) {
      const startDateTime = new Date(formData.attributes.startDate)
      startDateISO = startDateTime.toISOString()
      endDateISO = new Date(startDateTime.getTime() + 60 * 60 * 1000).toISOString()
    }

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

    createMutation.mutate(convertEventForAPI(submitData))
  }

  // ── Design tokens ──────────────────────────────────────────────────────────
  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
  const hud = {
    surface:        'rgb(var(--hud-surface))',
    surfaceHigh:    'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary:        'rgb(var(--hud-primary))',
    primaryDim:     'rgb(var(--hud-primary-dim))',
    tertiary:       'rgb(var(--hud-tertiary))',
    onSurface:      'rgb(var(--hud-on-surface))',
    onSurfaceVar:   'rgb(var(--hud-on-surface-var))',
    error:          'rgb(var(--hud-error))',
    success:        'rgb(var(--hud-success))',
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
            Create an RPA Operation
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            Track executions of your robots, automation scripts, or automated workflows.
          </p>
        </div>

        {createMutation.isError && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-8" style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: hud.error }} />
            <p className="text-sm font-medium" style={{ color: hud.error }}>Error creating RPA operation. Please try again.</p>
          </div>
        )}

        {showToast && <Toast message="RPA Operation created successfully!" onClose={() => setShowToast(false)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* ── Left Column ── */}
            <div className="md:col-span-8 space-y-8">

              {/* Operation Information */}
              <section className="p-8 rounded-xl overflow-visible relative z-10" style={{ background: hud.surface }}>
                <SectionHeader icon={<Search className="w-5 h-5" />} title="Operation Information" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Operation Name <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g.: Automatic invoice processing, Customer data synchronization"
                      className={inputCls} style={inputStyle} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative z-10">
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Service / RPA Robot <span style={{ color: hud.error }}>*</span></label>
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
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Environment</label>
                      <select value={formData.attributes.environment}
                        onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, environment: e.target.value as Environment } })}
                        className={inputCls + ' appearance-none'} style={inputStyle}>
                        <option value={Environment.PRODUCTION}>Production</option>
                        <option value={Environment.PREPRODUCTION}>Preproduction</option>
                        <option value={Environment.UAT}>UAT</option>
                        <option value={Environment.RECETTE}>Recette</option>
                        <option value={Environment.INTEGRATION}>Integration</option>
                        <option value={Environment.DEVELOPMENT}>Development</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Operation Status</label>
                    <select value={formData.attributes.status}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, status: e.target.value as Status } })}
                      className={inputCls + ' appearance-none'} style={inputStyle}>
                      <option value={Status.START}>Started</option>
                      <option value={Status.SUCCESS}>Success</option>
                      <option value={Status.FAILURE}>Failure</option>
                      <option value={Status.WARNING}>Warning</option>
                      <option value={Status.ERROR}>Error</option>
                      <option value={Status.DONE}>Done</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Description <span style={{ color: hud.error }}>*</span></label>
                    <textarea required rows={4} value={formData.attributes.message}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, message: e.target.value } })}
                      placeholder="Describe the operation: number of items processed, results, any errors..."
                      className={inputCls + ' resize-none'} style={inputStyle} />
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Owner <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.attributes.owner || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, owner: e.target.value } })}
                      placeholder="e.g.: team-automation, rpa-team"
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column ── */}
            <div className="md:col-span-4 space-y-8">

              {/* Scheduling */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface, borderLeft: `4px solid ${hud.tertiary}` }}>
                <SectionHeader icon={<Clock className="w-5 h-5" />} title="Scheduling" color={hud.tertiary} />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Start Date</label>
                    <input type="datetime-local" value={formData.attributes.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, startDate: e.target.value } })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <p className="text-xs px-1" style={{ color: hud.onSurfaceVar }}>
                    End date will be automatically set to <strong>1 hour</strong> after the start date.
                  </p>
                </div>
              </section>

              {/* RPA info widget */}
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Bot className="w-20 h-20" />
                </div>
                <div className="flex flex-col items-center text-center py-2">
                  <Bot className="w-10 h-10 mb-4" style={{ color: hud.primary }} />
                  <h4 className="font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>RPA Operation</h4>
                  <p className="text-xs leading-relaxed" style={{ color: hud.onSurfaceVar }}>
                    Robotic Process Automation refers to the automation of repetitive business processes by software robots.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <button type="button" onClick={() => navigate('/rpa')}
              className="px-8 py-3 font-bold transition-colors hover:opacity-80"
              style={{ color: hud.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-10 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${hud.primary}, ${hud.primaryDim})`,
                color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 4px 20px ${ha('primary', 0.25)}`,
              }}>
              <Bot className="w-4 h-4" />
              {createMutation.isPending ? 'Creating...' : 'Create RPA Operation'}
            </button>
          </div>
        </form>
      </div>

      {/* Decorative glows */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none" style={{ background: ha('primary', 0.05) }} />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: ha('tertiary', 0.05) }} />
    </div>
  )
}
