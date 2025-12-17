import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, type Catalog, type SLA } from '../types/api'
import { ArrowLeft, Save, Package, X, Plus } from 'lucide-react'

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
  })

  const [newDepIn, setNewDepIn] = useState('')
  const [newDepOut, setNewDepOut] = useState('')
  const [slaEnabled, setSlaEnabled] = useState(false)

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
    createUpdateMutation.mutate(formData as Catalog)
  }

  const handleChange = (field: keyof Catalog, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
                  Version
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upstream Dependencies
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Services that this service depends on
                </p>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newDepIn}
                    onChange={(e) => setNewDepIn(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDependencyIn())}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., database, redis"
                  />
                  <button
                    type="button"
                    onClick={addDependencyIn}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
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
                </div>
              </div>

              {/* Downstream Dependencies (Out) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Downstream Dependencies
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Services that depend on this service
                </p>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newDepOut}
                    onChange={(e) => setNewDepOut(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDependencyOut())}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., api-gateway, web-app"
                  />
                  <button
                    type="button"
                    onClick={addDependencyOut}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
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
                </div>
              </div>
            </div>
          </div>

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
