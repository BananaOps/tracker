import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, Platform, type Catalog, type SLA, type UsedDeliverable, type CommunicationChannel, type DashboardLink, type VulnerabilitySummary } from '../types/api'
import { ArrowLeft, Save, Package, X } from 'lucide-react'
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
      .map(c => c.name)
      .filter(n => n !== formData.name)
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
    
    // Debug: Log the data being sent
    console.log('📤 Sending catalog data:', JSON.stringify(formData, null, 2))
    
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

  if (isEditing && isLoadingCatalog) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/catalog')}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Service' : 'Add to Catalog'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEditing ? `Editing ${name}` : 'Create a new service in the catalog'}
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h2>

            {/* Service Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Name *
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  required
                  disabled={isEditing}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  placeholder="e.g., auth-service, payment-api, user-dashboard"
                />
              </div>
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Service name cannot be changed
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <select
                  id="type"
                  required
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

              {/* Language */}
              <div>
                <label htmlFor="languages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Language *
                </label>
                <select
                  id="languages"
                  required
                  value={formData.languages}
                  onChange={(e) => handleChange('languages', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

              {/* Platform - Only for Projects */}
              {formData.type === CatalogType.PROJECT && (
                <div>
                  <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deployment Platform *
                  </label>
                  <select
                    id="platform"
                    required
                    value={formData.platform}
                    onChange={(e) => handleChange('platform', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select the primary deployment platform (AWS/Azure/GCP/Scaleway equivalents)
                  </p>
                </div>
              )}

              {/* Owner */}
              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner *
                </label>
                <input
                  type="text"
                  id="owner"
                  required
                  value={formData.owner}
                  onChange={(e) => handleChange('owner', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., team-backend, john.doe, platform-team"
                />
              </div>

              {/* Version */}
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version *
                </label>
                <input
                  type="text"
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., v1.2.3, 2.0.0, latest"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Service description, role, and features..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Repository */}
              <div>
                <label htmlFor="repository" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repository
                </label>
                <input
                  type="url"
                  id="repository"
                  value={formData.repository}
                  onChange={(e) => handleChange('repository', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://github.com/org/repo"
                />
              </div>

              {/* Documentation */}
              <div>
                <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Documentation
                </label>
                <input
                  type="url"
                  id="link"
                  value={formData.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://docs.example.com/service"
                />
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dependencies
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upstream Dependencies (In) */}
              <div>
                <DependencySelector
                  label="Upstream Dependencies"
                  availableServices={availableServices}
                  value={newDepIn}
                  onChange={setNewDepIn}
                  onAdd={addDependencyIn}
                  placeholder="Select or type service name..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                  Services that this service depends on
                </p>
                <div className="space-y-1">
                  {(formData.dependenciesIn || []).map(dep => (
                    <div key={dep} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="text-sm text-blue-900 dark:text-blue-100">{dep}</span>
                      <button
                        type="button"
                        onClick={() => removeDependencyIn(dep)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(formData.dependenciesIn || []).length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                      No upstream dependencies added yet
                    </p>
                  )}
                </div>
              </div>

              {/* Downstream Dependencies (Out) */}
              <div>
                <DependencySelector
                  label="Downstream Dependencies"
                  availableServices={availableServices}
                  value={newDepOut}
                  onChange={setNewDepOut}
                  onAdd={addDependencyOut}
                  placeholder="Select or type service name..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                  Services that depend on this service
                </p>
                <div className="space-y-1">
                  {(formData.dependenciesOut || []).map(dep => (
                    <div key={dep} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <span className="text-sm text-green-900 dark:text-green-100">{dep}</span>
                      <button
                        type="button"
                        onClick={() => removeDependencyOut(dep)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(formData.dependenciesOut || []).length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                      No downstream dependencies added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Used Deliverables Section - Only for Projects */}
          {formData.type === CatalogType.PROJECT && (
            <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Used Deliverables
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Track which packages, charts, containers, modules, and libraries are used in this project
                </p>
                <UsedDeliverablesManager
                  usedDeliverables={formData.usedDeliverables || []}
                  onUpdate={handleUpdateUsedDeliverables}
                  availableDeliverables={allCatalogs?.catalogs
                    .filter(c => [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE, CatalogType.LIBRARY].includes(c.type))
                    .map(c => ({ 
                      name: c.name, 
                      type: c.type, 
                      availableVersions: c.availableVersions || [],
                      latestVersion: c.latestVersion,
                      referenceVersion: c.referenceVersion
                    })) || []
                  }
                />
              </div>
            </div>
          )}

          {/* SLA Configuration */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  SLA Configuration
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Define Service Level Agreement targets
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSLA}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  slaEnabled
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {slaEnabled ? 'Disable SLA' : 'Enable SLA'}
              </button>
            </div>

            {slaEnabled && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                {/* SLA Level */}
                <div>
                  <label htmlFor="slaLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SLA Level *
                  </label>
                  <select
                    id="slaLevel"
                    value={formData.sla?.level || SLALevel.MEDIUM}
                    onChange={(e) => handleSLAChange('level', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={SLALevel.CRITICAL}>Critical (99.99% uptime)</option>
                    <option value={SLALevel.HIGH}>High (99.9% uptime)</option>
                    <option value={SLALevel.MEDIUM}>Medium (99.5% uptime)</option>
                    <option value={SLALevel.LOW}>Low (99% uptime)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Uptime Percentage */}
                  <div>
                    <label htmlFor="uptimePercentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Uptime Target (%)
                    </label>
                    <input
                      type="number"
                      id="uptimePercentage"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.sla?.uptimePercentage || ''}
                      onChange={(e) => handleSLAChange('uptimePercentage', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="99.5"
                    />
                  </div>

                  {/* Response Time */}
                  <div>
                    <label htmlFor="responseTimeMs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Response Time Target (ms)
                    </label>
                    <input
                      type="number"
                      id="responseTimeMs"
                      min="0"
                      value={formData.sla?.responseTimeMs || ''}
                      onChange={(e) => handleSLAChange('responseTimeMs', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="500"
                    />
                  </div>
                </div>

                {/* SLA Description */}
                <div>
                  <label htmlFor="slaDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SLA Description
                  </label>
                  <textarea
                    id="slaDescription"
                    rows={2}
                    value={formData.sla?.description || ''}
                    onChange={(e) => handleSLAChange('description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional SLA details and requirements..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Communication Channels */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <CommunicationChannelsManager
              channels={formData.communicationChannels || []}
              onChange={handleUpdateCommunicationChannels}
            />
          </div>

          {/* Dashboard Links */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <DashboardLinksManager
              dashboards={formData.dashboardLinks || []}
              onChange={handleUpdateDashboardLinks}
            />
          </div>

          {/* Vulnerability Summary */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <VulnerabilityManager
              vulnerabilitySummary={formData.vulnerabilitySummary}
              onChange={handleUpdateVulnerabilitySummary}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUpdateMutation.isPending || !formData.name || !formData.owner}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                {createUpdateMutation.isPending 
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update' : 'Create')
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
