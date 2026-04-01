import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, Platform, type Catalog, type SLA, type UsedDeliverable, type CommunicationChannel, type DashboardLink, type VulnerabilitySummary } from '../types/api'
import { Package, X, GitBranch, Shield, Plus } from 'lucide-react'
import DependencySelector from '../components/DependencySelector'
import UsedDeliverablesManager from '../components/UsedDeliverablesManager'
import CommunicationChannelsManager from '../components/CommunicationChannelsManager'
import DashboardLinksManager from '../components/DashboardLinksManager'
import VulnerabilityManager from '../components/VulnerabilityManager'

export default function CreateCatalog() {
  const navigate = useNavigate()
  const { name } = useParams()
  const queryClient = useQueryClient()
  const isEditing = Boolean(name)

  const { data: existingCatalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['catalog', name],
    queryFn: () => catalogApi.get(name!),
    enabled: isEditing,
  })

  const [formData, setFormData] = useState<Partial<Catalog>>({
    name: '',
    type: CatalogType.MODULE,
    languages: Language.JAVASCRIPT,
    owner: '',
    version: '',
    link: '',
    description: '',
    repository: '',
    dependenciesIn: [],
    dependenciesOut: [],
    sla: undefined,
    platform: Platform.KUBERNETES,
    usedDeliverables: [],
    communicationChannels: [],
    dashboardLinks: [],
    vulnerabilitySummary: undefined,
  })

  const [newDepIn, setNewDepIn] = useState('')
  const [newDepOut, setNewDepOut] = useState('')
  const [slaEnabled, setSlaEnabled] = useState(false)

  // Fetch all catalogs for dependency selection
  const { data: allCatalogs } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  // Get list of available service names (excluding current service)
  const availableServices = useMemo(() => {
    if (!allCatalogs) return []
    return allCatalogs.catalogs
      .map((c: Catalog) => c.name)
      .filter((n: string) => n !== formData.name)
      .sort()
  }, [allCatalogs, formData.name])

  useEffect(() => {
    if (existingCatalog) {
      setFormData(existingCatalog)
      setSlaEnabled(Boolean(existingCatalog.sla))
    }
  }, [existingCatalog])

  const createUpdateMutation = useMutation({
    mutationFn: (data: Catalog) => catalogApi.createOrUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/catalog')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.owner) return
    
    // Debug: Log the data being sent in development only
    if (import.meta.env.DEV) {
      console.log('📤 Sending catalog data:', JSON.stringify(formData, null, 2))
    }
    
    createUpdateMutation.mutate(formData as Catalog)
  }

  const handleChange = (field: keyof Catalog, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleUpdateUsedDeliverables = (usedDeliverables: UsedDeliverable[]) => {
    setFormData(prev => ({ ...prev, usedDeliverables }))
  }

  const handleUpdateCommunicationChannels = (communicationChannels: CommunicationChannel[]) => {
    setFormData(prev => ({ ...prev, communicationChannels }))
  }

  const handleUpdateDashboardLinks = (dashboardLinks: DashboardLink[]) => {
    setFormData(prev => ({ ...prev, dashboardLinks }))
  }

  const handleUpdateVulnerabilitySummary = (vulnerabilitySummary?: VulnerabilitySummary) => {
    setFormData(prev => ({ ...prev, vulnerabilitySummary }))
  }

  const handleSLAChange = (field: keyof SLA, value: any) => {
    setFormData(prev => ({
      ...prev,
      sla: {
        ...prev.sla,
        level: prev.sla?.level || SLALevel.MEDIUM,
        [field]: value
      } as SLA
    }))
  }

  const addDependencyIn = () => {
    if (newDepIn.trim()) {
      setFormData(prev => ({
        ...prev,
        dependenciesIn: [...(prev.dependenciesIn || []), newDepIn.trim()]
      }))
      setNewDepIn('')
    }
  }

  const removeDependencyIn = (dep: string) => {
    setFormData(prev => ({
      ...prev,
      dependenciesIn: (prev.dependenciesIn || []).filter(d => d !== dep)
    }))
  }

  const addDependencyOut = () => {
    if (newDepOut.trim()) {
      setFormData(prev => ({
        ...prev,
        dependenciesOut: [...(prev.dependenciesOut || []), newDepOut.trim()]
      }))
      setNewDepOut('')
    }
  }

  const removeDependencyOut = (dep: string) => {
    setFormData(prev => ({
      ...prev,
      dependenciesOut: (prev.dependenciesOut || []).filter(d => d !== dep)
    }))
  }

  const toggleSLA = () => {
    if (slaEnabled) {
      setFormData(prev => ({ ...prev, sla: undefined }))
      setSlaEnabled(false)
    } else {
      setFormData(prev => ({
        ...prev,
        sla: {
          level: SLALevel.MEDIUM,
          uptimePercentage: 99.5,
          responseTimeMs: 500,
          description: ''
        }
      }))
      setSlaEnabled(true)
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
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
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

  if (isEditing && isLoadingCatalog) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: 'rgb(var(--hud-bg))' }}>
        <p style={{ color: 'rgb(var(--hud-on-surface-var))' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto" style={{ background: hud.bg, color: hud.onSurface }}>
      <div className="max-w-5xl mx-auto p-8">

        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isEditing ? `Edit Service — ${name}` : 'New Service'}
          </h2>
          <p className="max-w-2xl leading-relaxed" style={{ color: hud.onSurfaceVar }}>
            {isEditing
              ? 'Update service metadata, dependencies and SLA configuration.'
              : 'Register a new service in the catalog. Define its dependencies, SLA and operational details.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* ── Left Column ── */}
            <div className="md:col-span-8 space-y-8">

              {/* Section: Service Information */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<Package className="w-5 h-5" />} title="Service Information" />
                <div className="space-y-6">
                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                      Service Name <span style={{ color: hud.error }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g., auth-service, payment-api"
                      className={inputCls}
                      style={{ ...inputStyle, opacity: isEditing ? 0.6 : 1 }}
                    />
                    {isEditing && (
                      <p className="text-xs mt-1" style={{ color: hud.onSurfaceVar }}>Service name cannot be changed</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Type <span style={{ color: hud.error }}>*</span>
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className={inputCls + ' appearance-none'}
                        style={inputStyle}
                      >
                        <option value={CatalogType.MODULE}>Module</option>
                        <option value={CatalogType.LIBRARY}>Library</option>
                        <option value={CatalogType.WORKFLOW}>Workflow</option>
                        <option value={CatalogType.PROJECT}>Project</option>
                        <option value={CatalogType.CHART}>Chart</option>
                        <option value={CatalogType.PACKAGE}>Package</option>
                        <option value={CatalogType.CONTAINER}>Container</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Primary Language <span style={{ color: hud.error }}>*</span>
                      </label>
                      <select
                        required
                        value={formData.languages}
                        onChange={(e) => handleChange('languages', e.target.value)}
                        className={inputCls + ' appearance-none'}
                        style={inputStyle}
                      >
                        <option value={Language.GOLANG}>Go</option>
                        <option value={Language.KOTLIN}>Kotlin</option>
                        <option value={Language.JAVA}>Java</option>
                        <option value={Language.TERRAFORM}>Terraform</option>
                        <option value={Language.HELM}>Helm</option>
                        <option value={Language.JAVASCRIPT}>JavaScript</option>
                        <option value={Language.TYPESCRIPT}>TypeScript</option>
                        <option value={Language.YAML}>YAML</option>
                        <option value={Language.DOCKER}>Docker</option>
                        <option value={Language.PYTHON}>Python</option>
                        <option value={Language.PHP}>PHP</option>
                        <option value={Language.RUST}>Rust</option>
                        <option value={Language.GROOVY}>Groovy</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Owner <span style={{ color: hud.error }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.owner}
                        onChange={(e) => handleChange('owner', e.target.value)}
                        placeholder="e.g., team-backend, john.doe"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Version</label>
                      <input
                        type="text"
                        value={formData.version}
                        onChange={(e) => handleChange('version', e.target.value)}
                        placeholder="e.g., v1.2.3, 2.0.0"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {formData.type === CatalogType.PROJECT && (
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>
                        Deployment Platform <span style={{ color: hud.error }}>*</span>
                      </label>
                      <select
                        required
                        value={formData.platform}
                        onChange={(e) => handleChange('platform', e.target.value)}
                        className={inputCls + ' appearance-none'}
                        style={inputStyle}
                      >
                        <optgroup label="Compute Platforms">
                          <option value={Platform.EC2}>EC2 / VM / Compute Engine / Instance</option>
                          <option value={Platform.LAMBDA}>Lambda / Functions / Cloud Functions</option>
                          <option value={Platform.KUBERNETES}>Kubernetes / EKS / AKS / GKE / Kapsule</option>
                          <option value={Platform.ECS}>ECS / Container Instances / Cloud Run</option>
                        </optgroup>
                        <optgroup label="Container Platforms">
                          <option value={Platform.FARGATE}>Fargate / Container Instances</option>
                          <option value={Platform.CLOUD_RUN}>Cloud Run</option>
                          <option value={Platform.APP_SERVICE}>App Service</option>
                        </optgroup>
                        <optgroup label="Serverless Platforms">
                          <option value={Platform.STEP_FUNCTIONS}>Step Functions / Logic Apps / Workflows</option>
                          <option value={Platform.EVENT_BRIDGE}>EventBridge / Event Grid / Eventarc</option>
                        </optgroup>
                        <optgroup label="Database Platforms">
                          <option value={Platform.RDS}>RDS / SQL Database / Cloud SQL</option>
                          <option value={Platform.DYNAMODB}>DynamoDB / Cosmos DB / Firestore</option>
                        </optgroup>
                        <optgroup label="Storage & CDN">
                          <option value={Platform.S3}>S3 / Blob Storage / Cloud Storage</option>
                          <option value={Platform.CLOUDFRONT}>CloudFront / CDN / Cloud CDN</option>
                        </optgroup>
                        <optgroup label="API & Monitoring">
                          <option value={Platform.API_GATEWAY}>API Gateway / API Management</option>
                          <option value={Platform.CLOUDWATCH}>CloudWatch / Monitor / Cloud Monitoring</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value={Platform.ON_PREMISE}>On-Premise</option>
                          <option value={Platform.HYBRID}>Hybrid Cloud</option>
                          <option value={Platform.MULTI_CLOUD}>Multi-Cloud</option>
                        </optgroup>
                      </select>
                      <p className="text-xs mt-1" style={{ color: hud.onSurfaceVar }}>
                        Select the primary deployment platform (AWS/Azure/GCP/Scaleway equivalents)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Service description, role, and features..."
                      className={inputCls + ' resize-none'}
                      style={inputStyle}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Repository</label>
                      <input
                        type="url"
                        value={formData.repository}
                        onChange={(e) => handleChange('repository', e.target.value)}
                        placeholder="https://github.com/org/repo"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Documentation</label>
                      <input
                        type="url"
                        value={formData.link}
                        onChange={(e) => handleChange('link', e.target.value)}
                        placeholder="https://docs.example.com/service"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Dependencies */}
              <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
                <SectionHeader icon={<GitBranch className="w-5 h-5" />} title="Dependencies" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <DependencySelector
                      label="Upstream Dependencies"
                      availableServices={availableServices}
                      value={newDepIn}
                      onChange={setNewDepIn}
                      onAdd={addDependencyIn}
                      placeholder="Select or type service name..."
                    />
                    <p className="text-xs mt-1 mb-3" style={{ color: hud.onSurfaceVar }}>Services that this service depends on</p>
                    <div className="space-y-1">
                      {(formData.dependenciesIn || []).map(dep => (
                        <div key={dep} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                          style={{ background: ha('primary', 0.08) }}>
                          <span>{dep}</span>
                          <button type="button" onClick={() => removeDependencyIn(dep)} className="opacity-60 hover:opacity-100">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(formData.dependenciesIn || []).length === 0 && (
                        <p className="text-xs italic py-2" style={{ color: hud.onSurfaceVar }}>No upstream dependencies added yet</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <DependencySelector
                      label="Downstream Dependencies"
                      availableServices={availableServices}
                      value={newDepOut}
                      onChange={setNewDepOut}
                      onAdd={addDependencyOut}
                      placeholder="Select or type service name..."
                    />
                    <p className="text-xs mt-1 mb-3" style={{ color: hud.onSurfaceVar }}>Services that depend on this service</p>
                    <div className="space-y-1">
                      {(formData.dependenciesOut || []).map(dep => (
                        <div key={dep} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                          style={{ background: ha('success', 0.08) }}>
                          <span>{dep}</span>
                          <button type="button" onClick={() => removeDependencyOut(dep)} className="opacity-60 hover:opacity-100">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(formData.dependenciesOut || []).length === 0 && (
                        <p className="text-xs italic py-2" style={{ color: hud.onSurfaceVar }}>No downstream dependencies added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column ── */}
            <div className="md:col-span-4 space-y-8">

              {/* SLA Widget */}
              <section className="p-8 rounded-xl overflow-hidden relative" style={{ background: hud.surfaceHigh, borderLeft: `4px solid ${hud.tertiary}` }}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="w-20 h-20" />
                </div>
                <SectionHeader icon={<Shield className="w-5 h-5" />} title="SLA" color={hud.tertiary} />
                <div className="flex flex-col items-center text-center py-2">
                  <Shield className="w-10 h-10 mb-4" style={{ color: slaEnabled ? hud.tertiary : hud.success }} />
                  <h4 className="font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Service Level Agreement</h4>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={slaEnabled} onChange={toggleSLA} className="sr-only peer" />
                    <div className="relative w-14 h-7 rounded-full peer transition-colors"
                      style={{ background: slaEnabled ? hud.tertiary : hud.surfaceHighest }}>
                      <div className="absolute top-0.5 left-[4px] bg-white rounded-full h-6 w-6 transition-transform"
                        style={{ transform: slaEnabled ? 'translateX(100%)' : 'translateX(0)' }} />
                    </div>
                    <span className="ms-3 text-sm font-medium" style={{ color: hud.onSurfaceVar }}>Enable</span>
                  </label>
                  {slaEnabled && (
                    <div className="w-full space-y-4 mt-6 text-left">
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>SLA Level <span style={{ color: hud.error }}>*</span></label>
                        <select
                          value={formData.sla?.level || SLALevel.MEDIUM}
                          onChange={(e) => handleSLAChange('level', e.target.value)}
                          className={inputCls + ' appearance-none'}
                          style={inputStyle}
                        >
                          <option value={SLALevel.CRITICAL}>Critical (99.99%)</option>
                          <option value={SLALevel.HIGH}>High (99.9%)</option>
                          <option value={SLALevel.MEDIUM}>Medium (99.5%)</option>
                          <option value={SLALevel.LOW}>Low (99%)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Uptime Target (%)</label>
                        <input
                          type="number"
                          step="0.01" min="0" max="100"
                          value={formData.sla?.uptimePercentage || ''}
                          onChange={(e) => handleSLAChange('uptimePercentage', parseFloat(e.target.value))}
                          placeholder="99.5"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Response Time (ms)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.sla?.responseTimeMs || ''}
                          onChange={(e) => handleSLAChange('responseTimeMs', parseInt(e.target.value))}
                          placeholder="500"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: hud.onSurfaceVar }}>Description</label>
                        <textarea
                          rows={2}
                          value={formData.sla?.description || ''}
                          onChange={(e) => handleSLAChange('description', e.target.value)}
                          placeholder="Additional SLA details..."
                          className={inputCls + ' resize-none'}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* ── Full-width sections ── */}

          {/* Used Deliverables (Projects only) */}
          {formData.type === CatalogType.PROJECT && (
            <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
              <SectionHeader icon={<Package className="w-5 h-5" />} title="Used Deliverables" />
              <p className="text-sm mb-6" style={{ color: hud.onSurfaceVar }}>
                Track which packages, charts, containers, modules, and libraries are used in this project
              </p>
              <UsedDeliverablesManager
                usedDeliverables={formData.usedDeliverables || []}
                onUpdate={handleUpdateUsedDeliverables}
                availableDeliverables={allCatalogs?.catalogs
                  .filter((c: Catalog) => [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE, CatalogType.LIBRARY].includes(c.type))
                  .map((c: Catalog) => ({
                    name: c.name,
                    type: c.type,
                    availableVersions: c.availableVersions || [],
                    latestVersion: c.latestVersion,
                    referenceVersion: c.referenceVersion
                  })) || []
                }
              />
            </section>
          )}

          {/* Communication Channels */}
          <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
            <CommunicationChannelsManager
              channels={formData.communicationChannels || []}
              onChange={handleUpdateCommunicationChannels}
            />
          </section>

          {/* Dashboard Links */}
          <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
            <DashboardLinksManager
              dashboards={formData.dashboardLinks || []}
              onChange={handleUpdateDashboardLinks}
            />
          </section>

          {/* Vulnerability Summary */}
          <section className="p-8 rounded-xl" style={{ background: hud.surface }}>
            <VulnerabilityManager
              vulnerabilitySummary={formData.vulnerabilitySummary}
              onChange={handleUpdateVulnerabilitySummary}
            />
          </section>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${ha('outline-var', 0.15)}` }}>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="px-8 py-3 font-bold transition-colors hover:opacity-80"
              style={{ color: hud.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUpdateMutation.isPending || !formData.name || !formData.owner}
              className="flex items-center gap-2 px-10 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${hud.primary}, ${ha('primary-dim', 1)})`,
                color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 4px 20px ${ha('primary', 0.25)}`,
              }}
            >
              <Plus className="w-4 h-4" />
              {createUpdateMutation.isPending
                ? (isEditing ? 'Updating...' : 'Creating...')
                : (isEditing ? 'Update Service' : 'Create Service')}
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
