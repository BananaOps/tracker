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
import { AlertCircle, GitBranch, Link2, Ticket, Plus } from 'lucide-react'

export default function CreateDrift() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showToast, setShowToast] = useState(false)

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
      setTimeout(() => { navigate('/drifts') }, 2000)
    },
    onError: (error: any) => {
      console.error('Error creating drift:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(false)
    createMutation.mutate(convertEventForAPI(formData))
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

  // Downstream services
  const selectedCatalog = catalogData?.catalogs.find((c: any) => c.name === formData.attributes.service)
  const downstreamServices: string[] = selectedCatalog?.dependenciesOut || selectedCatalog?.dependencies_out || []

  return (
    <div className="min-h-full overflow-auto" style={{ background: 'rgb(var(--hud-bg))', color: hud.onSurface }}>
      <div className="max-w-5xl mx-auto p-8">

        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Create a Drift
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            Register a configuration deviation detected between the expected and actual state of a resource.
          </p>
        </div>

        {createMutation.isError && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-8" style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: hud.error }} />
            <p className="text-sm font-medium" style={{ color: hud.error }}>Error creating drift. Please try again.</p>
          </div>
        )}

        {showToast && <Toast message="Drift created successfully!" onClose={() => setShowToast(false)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* ── Left Column ── */}
            <div className="md:col-span-8 space-y-8">

              {/* Drift Information */}
              <section className="p-8 rounded-xl overflow-visible relative z-10" style={{ background: hud.surface }}>
                <SectionHeader icon={<FontAwesomeIcon icon={faCodeBranch} className="w-5 h-5" />} title="Drift Information" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Drift Title <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g.: Drift detected on load balancer configuration"
                      className={inputCls} style={inputStyle} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative z-10">
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Affected Service <span style={{ color: hud.error }}>*</span></label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Status</label>
                      <select value={formData.attributes.status}
                        onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, status: e.target.value as Status } })}
                        className={inputCls + ' appearance-none'} style={inputStyle}>
                        <option value={Status.OPEN}>Open (detected)</option>
                        <option value={Status.START}>In Progress (fixing)</option>
                        <option value={Status.DONE}>Resolved</option>
                        <option value={Status.CLOSE}>Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Description <span style={{ color: hud.error }}>*</span></label>
                    <textarea required rows={4} value={formData.attributes.message}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, message: e.target.value } })}
                      placeholder="Describe the detected drift: what configuration changed, expected vs actual state..."
                      className={inputCls + ' resize-none'} style={inputStyle} />
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Owner <span style={{ color: hud.error }}>*</span></label>
                    <input type="text" required value={formData.attributes.owner || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, owner: e.target.value } })}
                      placeholder="e.g.: team-platform, john.doe"
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              </section>

              {/* Resources */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Link2 className="w-5 h-5" />} title="Resources" />
                <div>
                  <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Ticket Jira</label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-3 w-4 h-4" style={{ color: hud.onSurfaceVar }} />
                    <input type="url" value={formData.links?.ticket || ''}
                      onChange={(e) => setFormData({ ...formData, links: { ...formData.links, ticket: e.target.value } })}
                      placeholder="e.g.: https://jira.company.com/browse/DRIFT-123"
                      className={inputCls + ' pl-10'} style={inputStyle} />
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column ── */}
            <div className="md:col-span-4 space-y-8">

              {/* Impact Detection */}
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

              {/* Downstream Services */}
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
            <button type="button" onClick={() => navigate('/drifts')}
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
              <GitBranch className="w-4 h-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Drift'}
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
