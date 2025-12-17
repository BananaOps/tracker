import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, Platform, type Catalog } from '../types/api'
import { Package, BookOpen, Search, X, Plus, Edit, Trash2, GitBranch } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faJava, 
  faPython, 
  faPhp, 
  faJs, 
  faDocker, 
  faRust,
  faGolang,
  faGithub
} from '@fortawesome/free-brands-svg-icons'
import { 
  faCode, 
  faFileCode, 
  faCube 
} from '@fortawesome/free-solid-svg-icons'

export default function CatalogTable() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => catalogApi.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      setDeleteConfirm(null)
    },
  })

  const allCatalogs = data?.catalogs || []

  // Extraire les valeurs uniques pour les filtres
  const uniqueTypes = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.map((c: Catalog) => String(c.type).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  const uniqueLanguages = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.map((c: Catalog) => String(c.languages).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  // Filtrer les catalogues
  const catalogs = useMemo(() => {
    return allCatalogs.filter((catalog: Catalog) => {
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = catalog.name.toLowerCase().includes(query)
        const matchesDescription = catalog.description?.toLowerCase().includes(query)
        const matchesOwner = catalog.owner?.toLowerCase().includes(query)
        if (!matchesName && !matchesDescription && !matchesOwner) return false
      }

      // Filtre par type
      if (selectedTypes.length > 0) {
        const catalogType = String(catalog.type).toLowerCase()
        if (!selectedTypes.includes(catalogType)) return false
      }

      // Filtre par langage
      if (selectedLanguages.length > 0) {
        const catalogLang = String(catalog.languages).toLowerCase()
        if (!selectedLanguages.includes(catalogLang)) return false
      }

      return true
    })
  }, [allCatalogs, searchQuery, selectedTypes, selectedLanguages])

  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value))
    } else {
      setter([...selected, value])
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedTypes([])
    setSelectedLanguages([])
  }

  const handleEdit = (catalogName: string) => {
    navigate(`/catalog/edit/${catalogName}`)
  }

  const handleDelete = (catalogName: string) => {
    if (deleteConfirm === catalogName) {
      deleteMutation.mutate(catalogName)
    } else {
      setDeleteConfirm(catalogName)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  const activeFiltersCount = selectedTypes.length + selectedLanguages.length + (searchQuery ? 1 : 0)

  const getCatalogTypeLabel = (type: CatalogType | string) => {
    const typeStr = String(type).toLowerCase()
    const labels: Record<string, string> = {
      'module': 'Module',
      'library': 'Library',
      'workflow': 'Workflow',
      'project': 'Projet',
      'chart': 'Chart',
      'package': 'Package',
      'container': 'Container',
    }
    return labels[typeStr] || 'Inconnu'
  }

  const getLanguageLabel = (lang: Language | string) => {
    const langStr = String(lang).toLowerCase()
    const labels: Record<string, string> = {
      'golang': 'Go',
      'kotlin': 'Kotlin',
      'java': 'Java',
      'terraform': 'Terraform',
      'helm': 'Helm',
      'javascript': 'JavaScript',
      'yaml': 'YAML',
      'docker': 'Docker',
      'python': 'Python',
      'php': 'PHP',
      'rust': 'Rust',
      'typescript': 'TypeScript',
      'groovy': 'Groovy',
    }
    return labels[langStr] || 'Inconnu'
  }

  const getLanguageIcon = (lang: Language | string) => {
    const langStr = String(lang).toLowerCase()
    
    switch (langStr) {
      case 'java':
        return <FontAwesomeIcon icon={faJava} className="w-4 h-4" style={{ color: '#f89820' }} />
      case 'python':
        return <FontAwesomeIcon icon={faPython} className="w-4 h-4" style={{ color: '#3776ab' }} />
      case 'php':
        return <FontAwesomeIcon icon={faPhp} className="w-4 h-4" style={{ color: '#777bb4' }} />
      case 'javascript':
        return <FontAwesomeIcon icon={faJs} className="w-4 h-4" style={{ color: '#f7df1e' }} />
      case 'typescript':
        return <FontAwesomeIcon icon={faJs} className="w-4 h-4" style={{ color: '#3178c6' }} />
      case 'docker':
        return <FontAwesomeIcon icon={faDocker} className="w-4 h-4" style={{ color: '#2496ed' }} />
      case 'rust':
        return <FontAwesomeIcon icon={faRust} className="w-4 h-4" style={{ color: '#ce422b' }} />
      case 'golang':
        return <FontAwesomeIcon icon={faGolang} className="w-4 h-4" style={{ color: '#00add8' }} />
      case 'kotlin':
        return <FontAwesomeIcon icon={faJava} className="w-4 h-4" style={{ color: '#7f52ff' }} />
      case 'terraform':
        return <FontAwesomeIcon icon={faCube} className="w-4 h-4 text-purple-700" />
      case 'helm':
        return <FontAwesomeIcon icon={faCube} className="w-4 h-4 text-blue-700" />
      case 'yaml':
        return <FontAwesomeIcon icon={faFileCode} className="w-4 h-4 text-red-500" />
      case 'groovy':
        return <FontAwesomeIcon icon={faCode} className="w-4 h-4 text-teal-600" />
      default:
        return <FontAwesomeIcon icon={faCode} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Catalog</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Inventory of modules, libraries and projects ({catalogs.length} of {allCatalogs.length} items)
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-primary-600 font-medium">
                • {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            console.log('Add to Catalog clicked - navigating...')
            navigate('/catalog/create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to Catalog
        </button>
      </div>

      {/* Filtres rapides */}
      <div className="card">
        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filtres par type et langage */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              {/* Filtres Type */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueTypes.map((type: string) => (
                    <button
                      key={type}
                      onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      {getCatalogTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtres Langage */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Language:</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueLanguages.map((lang: string) => (
                    <button
                      key={lang}
                      onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center space-x-1 ${
                        selectedLanguages.includes(lang)
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      {getLanguageIcon(lang)}
                      <span>{getLanguageLabel(lang)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bouton Clear All */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1 font-medium"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dependencies
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {catalogs.map((catalog: Catalog) => (
                <tr 
                  key={catalog.name} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => navigate(`/catalog/${catalog.name}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{catalog.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {getCatalogTypeLabel(catalog.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center space-x-1 w-fit">
                      {getLanguageIcon(catalog.languages)}
                      <span>{getLanguageLabel(catalog.languages)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {catalog.platform ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {getPlatformLabel(catalog.platform)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {catalog.sla ? (
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${getSLAColor(catalog.sla.level)}20`,
                          color: getSLAColor(catalog.sla.level)
                        }}
                      >
                        {getSLALabel(catalog.sla.level)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-xs">
                      {((catalog.dependenciesIn?.length || 0) + (catalog.dependenciesOut?.length || 0)) > 0 ? (
                        <>
                          <GitBranch className="w-4 h-4 text-gray-400" />
                          <span className="text-blue-600 dark:text-blue-400">
                            {catalog.dependenciesIn?.length || 0} in
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-green-600 dark:text-green-400">
                            {catalog.dependenciesOut?.length || 0} out
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {catalog.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-3">
                      {catalog.repository && (
                        <a
                          href={catalog.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                          title="Repository"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon icon={faGithub} className="w-5 h-5" />
                        </a>
                      )}
                      {catalog.link && (
                        <a
                          href={catalog.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                          title="Documentation"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <BookOpen className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(catalog.name)
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {deleteConfirm === catalog.name ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(catalog.name)
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? '...' : 'Confirmer'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelDelete()
                            }}
                            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(catalog.name)
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {catalogs.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No items in catalog
        </div>
      )}
    </div>
  )
}

// Helper functions for SLA
function getSLAColor(level?: SLALevel): string {
  switch (level) {
    case SLALevel.CRITICAL:
      return '#ef4444'
    case SLALevel.HIGH:
      return '#f97316'
    case SLALevel.MEDIUM:
      return '#eab308'
    case SLALevel.LOW:
      return '#22c55e'
    default:
      return '#94a3b8'
  }
}

function getSLALabel(level?: SLALevel): string {
  switch (level) {
    case SLALevel.CRITICAL:
      return 'Critical'
    case SLALevel.HIGH:
      return 'High'
    case SLALevel.MEDIUM:
      return 'Medium'
    case SLALevel.LOW:
      return 'Low'
    default:
      return 'Not Set'
  }
}

function getPlatformLabel(platform?: Platform): string {
  switch (platform) {
    case Platform.EC2:
      return 'EC2/VM'
    case Platform.LAMBDA:
      return 'Lambda/Functions'
    case Platform.KUBERNETES:
      return 'Kubernetes'
    case Platform.ECS:
      return 'ECS/Containers'
    case Platform.FARGATE:
      return 'Fargate'
    case Platform.CLOUD_RUN:
      return 'Cloud Run'
    case Platform.APP_SERVICE:
      return 'App Service'
    case Platform.STEP_FUNCTIONS:
      return 'Step Functions'
    case Platform.EVENT_BRIDGE:
      return 'Event Bridge'
    case Platform.RDS:
      return 'RDS/Database'
    case Platform.DYNAMODB:
      return 'DynamoDB/NoSQL'
    case Platform.S3:
      return 'S3/Storage'
    case Platform.CLOUDFRONT:
      return 'CloudFront/CDN'
    case Platform.API_GATEWAY:
      return 'API Gateway'
    case Platform.CLOUDWATCH:
      return 'CloudWatch'
    case Platform.ON_PREMISE:
      return 'On-Premise'
    case Platform.HYBRID:
      return 'Hybrid Cloud'
    case Platform.MULTI_CLOUD:
      return 'Multi-Cloud'
    default:
      return 'Not Set'
  }
}
