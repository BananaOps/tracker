import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { locksApi, catalogApi } from '../lib/api'
import { Lock, AlertCircle, Plus } from 'lucide-react'
import { getEnvironmentLabel } from '../lib/eventUtils'
import ServiceAutocomplete from '../components/ServiceAutocomplete'

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
        const serviceNames = data.catalogs.map((catalog: { name: string }) => catalog.name).sort()
        setServices(serviceNames)
      } catch (err) {
        console.error('Error loading services:', err)
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
      
      if (formData.resource) lockData.resource = formData.resource
      if (formData.event_id) lockData.event_id = formData.event_id
      
      await locksApi.create(lockData)
      navigate('/locks')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error creating lock'
      let displayMessage = errorMessage
      if (errorMessage.includes('already locked') || errorMessage.includes('is already locked')) {
        displayMessage = `🔒 Service ${formData.service} is already locked in ${formData.environment}. Please check the Locks page.`
      } else if (errorMessage.toLowerCase().includes('internal error')) {
        displayMessage = `🔒 Cannot create lock: Service ${formData.service} may already be locked. Please check the Locks page.`
      }
      setError(displayMessage)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const ha = (v: string, a: number) => `rgb(var(--hud-${v}) / ${a})`
  const hud = {
    bg: 'rgb(var(--hud-bg))',
    surface: 'rgb(var(--hud-surface))',
    surfaceLow: 'rgb(var(--hud-surface-low))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary: 'rgb(var(--hud-primary))',
    tertiary: 'rgb(var(--hud-tertiary))',
    error: 'rgb(var(--hud-error))',
    success: 'rgb(var(--hud-success))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
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
    <div className="min-h-full overflow-auto" style={{ background: hud.bg, color: hud.onSurface }}>
      <div className="max-w-5xl mx-auto p-8">

        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            New Lock
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            Lock a service to prevent concurrent deployments or operations.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-8"
            style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: hud.error }} />
            <p className="text-sm font-medium" style={{ color: hud.error }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* ── Left Column ── */}
            <div className="md:col-span-8 space-y-8">

              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Lock className="w-5 h-5" />} title="Lock Configuration" />
                <div className="space-y-6">

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                      Service <span style={{ color: hud.error }}>*</span>
                    </label>
                    <ServiceAutocomplete
                      id="service"
                      value={formData.service}
                      onChange={(value) => setFormData({ ...formData, service: value })}
                      services={services}
                      loading={loadingServices}
                      required
                      placeholder="Type to search or select a service"
                    />
                    {services.length === 0 && !loadingServices && (
                      <p className="text-xs mt-1" style={{ color: hud.tertiary }}>
                        No services found in catalog. You can enter the name manually.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Locked By <span style={{ color: hud.error }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.who}
                        onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                        placeholder="e.g., john.doe, team-platform"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Environment <span style={{ color: hud.error }}>*</span>
                      </label>
                      <select
                        required
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        className={inputCls + ' appearance-none'}
                        style={inputStyle}
                      >
                        <option value="">Select an environment</option>
                        {environments.map((env) => (
                          <option key={env} value={env}>{getEnvironmentLabel(env)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Resource</label>
                      <select
                        value={formData.resource}
                        onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                        className={inputCls + ' appearance-none'}
                        style={inputStyle}
                      >
                        <option value="">Select a resource (optional)</option>
                        {resources.map((res) => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Event ID</label>
                      <input
                        type="text"
                        value={formData.event_id}
                        onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                        placeholder="e.g., 123e4567-e89b-12d3..."
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column ── */}
            <div className="md:col-span-4 space-y-8">
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh, borderLeft: `4px solid ${hud.error}` }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Lock className="w-20 h-20" />
                </div>
                <div className="flex flex-col items-center text-center py-2">
                  <Lock className="w-10 h-10 mb-4" style={{ color: formData.service ? hud.error : hud.onSurfaceVar }} />
                  <h4 className="font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What is a lock?</h4>
                  <p className="text-xs leading-relaxed" style={{ color: hud.onSurfaceVar }}>
                    A lock prevents concurrent deployments or operations on a service. Only one team member can deploy or modify a locked service at a time.
                  </p>
                  {formData.service && formData.environment && (
                    <div className="mt-6 w-full p-3 rounded-lg text-left" style={{ background: ha('error', 0.1), border: `1px solid ${ha('error', 0.2)}` }}>
                      <p className="text-xs font-bold mb-1" style={{ color: hud.error }}>Will lock</p>
                      <p className="text-sm font-bold">{formData.service}</p>
                      <p className="text-xs mt-0.5" style={{ color: hud.onSurfaceVar }}>{getEnvironmentLabel(formData.environment)}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <button
              type="button"
              onClick={() => navigate('/locks')}
              className="px-8 py-3 font-bold transition-colors hover:opacity-80"
              style={{ color: hud.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-10 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${hud.primary}, ${ha('primary-dim', 1)})`,
                color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 4px 20px ${ha('primary', 0.25)}`,
              }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                : <><Plus className="w-4 h-4" /> Create Lock</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Background Glows */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none" style={{ background: ha('primary', 0.05) }} />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: ha('error', 0.04) }} />
    </div>
  )
}
