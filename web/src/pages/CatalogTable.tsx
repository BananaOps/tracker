import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language } from '../types/api'
import { Package, BookOpen, Search, X, Plus } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 100 }),
  })

  const allCatalogs = data?.catalogs || []

  // Extraire les valeurs uniques pour les filtres
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(allCatalogs.map(c => String(c.type).toLowerCase()))).sort()
  }, [allCatalogs])

  const uniqueLanguages = useMemo(() => {
    return Array.from(new Set(allCatalogs.map(c => String(c.languages).toLowerCase()))).sort()
  }, [allCatalogs])

  // Filtrer les catalogues
  const catalogs = useMemo(() => {
    return allCatalogs.filter(catalog => {
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
                  {uniqueTypes.map(type => (
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
                  {uniqueLanguages.map(lang => (
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
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Langage
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
                  Liens
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {catalogs.map((catalog) => (
                <tr key={catalog.name} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {catalog.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-3">
                      {catalog.repository && (
                        <a
                          href={catalog.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                          title="Repository"
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
                        >
                          <BookOpen className="w-5 h-5" />
                        </a>
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
