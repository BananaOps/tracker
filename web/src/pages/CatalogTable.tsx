import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, Platform, CommunicationType, DashboardType, type Catalog } from '../types/api'
import { Package, BookOpen, Search, X, Plus, Server, Cloud, Database, Zap, Globe, Shield, HardDrive, Activity, Mail, Filter, SlidersHorizontal } from 'lucide-react'
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
  faGithub,
  faSlack,
  faDiscord,
  faTelegram,
  faMicrosoft,
  faAws,
  faGoogle,
  faDigitalOcean
} from '@fortawesome/free-brands-svg-icons'
import { 
  faCode, 
  faFileCode, 
  faCube,
  faComments,
  faServer,
  faCloud,
  faDatabase as faDatabaseSolid
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { KubernetesIcon } from '../components/icons/KubernetesIcon'
import { KotlinIcon } from '../components/icons/KotlinIcon'
import { TerraformIcon } from '../components/icons/TerraformIcon'
import { SlackIcon } from '../components/icons/SlackIcon'
import { GrafanaIcon } from '../components/icons/GrafanaIcon'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'

export default function CatalogTable() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedSLAs, setSelectedSLAs] = useState<string[]>([])
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState(false) // Fermé par défaut


  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 100 }),
  })



  const allCatalogs = data?.catalogs || []

  // Extraire les valeurs uniques pour les filtres
  const uniqueTypes = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.map((c: Catalog) => String(c.type).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  const uniqueLanguages = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.map((c: Catalog) => String(c.languages).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  const uniquePlatforms = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.filter((c: Catalog) => c.platform).map((c: Catalog) => String(c.platform).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  const uniqueSLAs = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.filter((c: Catalog) => c.sla?.level).map((c: Catalog) => String(c.sla!.level).toLowerCase()))).sort() as string[]
  }, [allCatalogs])

  const uniqueOwners = useMemo<string[]>(() => {
    return Array.from(new Set(allCatalogs.filter((c: Catalog) => c.owner).map((c: Catalog) => c.owner))).sort() as string[]
  }, [allCatalogs])

  const filteredOwners = useMemo(() => {
    if (!ownerSearchQuery.trim()) return uniqueOwners
    const query = ownerSearchQuery.toLowerCase()
    return uniqueOwners.filter(owner => owner.toLowerCase().includes(query))
  }, [uniqueOwners, ownerSearchQuery])

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

      // Filtre par plateforme
      if (selectedPlatforms.length > 0) {
        if (!catalog.platform) return false
        const catalogPlatform = String(catalog.platform).toLowerCase()
        if (!selectedPlatforms.includes(catalogPlatform)) return false
      }

      // Filtre par SLA
      if (selectedSLAs.length > 0) {
        if (!catalog.sla?.level) return false
        const catalogSLA = String(catalog.sla.level).toLowerCase()
        if (!selectedSLAs.includes(catalogSLA)) return false
      }

      // Filtre par Owner
      if (selectedOwners.length > 0) {
        if (!catalog.owner) return false
        if (!selectedOwners.includes(catalog.owner)) return false
      }

      return true
    })
  }, [allCatalogs, searchQuery, selectedTypes, selectedLanguages, selectedPlatforms, selectedSLAs, selectedOwners])

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
    setSelectedPlatforms([])
    setSelectedSLAs([])
    setSelectedOwners([])
  }



  const activeFiltersCount = selectedTypes.length + selectedLanguages.length + selectedPlatforms.length + selectedSLAs.length + selectedOwners.length + (searchQuery ? 1 : 0)

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
        return <KotlinIcon className="w-4 h-4" />
      case 'terraform':
        return <TerraformIcon className="w-4 h-4" />
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Filters - Style Datadog */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col shrink-0 transition-all duration-300">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </h3>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Filters Content */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Type Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Type</h4>
                <div className="space-y-2">
                  {uniqueTypes.map((type: string) => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getCatalogTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Language Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Language</h4>
                <div className="space-y-2">
                  {uniqueLanguages.map((lang: string) => (
                    <label key={lang} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedLanguages.includes(lang)}
                        onCheckedChange={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)}
                      />
                      <div className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getLanguageIcon(lang)}
                        <span>{getLanguageLabel(lang)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Platform Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Platform</h4>
                <div className="space-y-2">
                  {uniquePlatforms.map((platform: string) => (
                    <label key={platform} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)}
                      />
                      <div className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {getPlatformIcon(platform as Platform)}
                        <span>{getPlatformLabel(platform as Platform)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* SLA Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">SLA Level</h4>
                <div className="space-y-2">
                  {uniqueSLAs.map((sla: string) => (
                    <label key={sla} className="flex items-center space-x-2 cursor-pointer group">
                      <Checkbox
                        checked={selectedSLAs.includes(sla)}
                        onCheckedChange={() => toggleFilter(sla, selectedSLAs, setSelectedSLAs)}
                      />
                      <span 
                        className="text-sm font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${getSLAColor(sla as SLALevel)}20`,
                          color: getSLAColor(sla as SLALevel)
                        }}
                      >
                        {getSLALabel(sla as SLALevel)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Owner Filter */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Owner</h4>
                {uniqueOwners.length > 0 ? (
                  <div className="space-y-3">
                    {/* Owner Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <Input
                        placeholder="Search owners..."
                        value={ownerSearchQuery}
                        onChange={(e) => setOwnerSearchQuery(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                      {ownerSearchQuery && (
                        <button
                          onClick={() => setOwnerSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Owners List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredOwners.length > 0 ? (
                        filteredOwners.map((owner: string) => (
                          <label key={owner} className="flex items-center space-x-2 cursor-pointer group">
                            <Checkbox
                              checked={selectedOwners.includes(owner)}
                              onCheckedChange={() => toggleFilter(owner, selectedOwners, setSelectedOwners)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 truncate" title={owner}>
                              {owner}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">No owners found</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No owners</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-9 w-9"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Catalog</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {catalogs.length} of {allCatalogs.length} items
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            
            <Button onClick={() => navigate('/catalog/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Add to Catalog
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, description, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {selectedTypes.map((type: string) => (
                <Badge key={type} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {getCatalogTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </Badge>
              ))}
              {selectedLanguages.map((lang: string) => (
                <Badge key={lang} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center">
                  {getLanguageIcon(lang)}
                  <span>{getLanguageLabel(lang)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)} />
                </Badge>
              ))}
              {selectedPlatforms.map((platform: string) => (
                <Badge key={platform} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center">
                  {getPlatformIcon(platform as Platform)}
                  <span>{getPlatformLabel(platform as Platform)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)} />
                </Badge>
              ))}
              {selectedSLAs.map((sla: string) => (
                <Badge 
                  key={sla} 
                  className="gap-1 cursor-pointer hover:opacity-80 flex items-center"
                  style={{
                    backgroundColor: `${getSLAColor(sla as SLALevel)}20`,
                    color: getSLAColor(sla as SLALevel),
                    border: `1px solid ${getSLAColor(sla as SLALevel)}40`
                  }}
                >
                  <span>{getSLALabel(sla as SLALevel)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(sla, selectedSLAs, setSelectedSLAs)} />
                </Badge>
              ))}
              {selectedOwners.map((owner: string) => (
                <Badge key={owner} variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  {owner}
                  <X className="w-3 h-3" onClick={() => toggleFilter(owner, selectedOwners, setSelectedOwners)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
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
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Links
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
                      <span 
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]" 
                        title={catalog.name}
                      >
                        {catalog.name.length > 25 ? `${catalog.name.substring(0, 25)}...` : catalog.name}
                      </span>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 w-fit ${getPlatformColor(catalog.platform).bg} ${getPlatformColor(catalog.platform).text} ${getPlatformColor(catalog.platform).darkBg} ${getPlatformColor(catalog.platform).darkText}`}>
                        {getPlatformIcon(catalog.platform)}
                        <span>{getPlatformLabel(catalog.platform)}</span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {catalog.owner}
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
                      {catalog.communicationChannels && catalog.communicationChannels.map((channel, idx) => (
                        <a
                          key={idx}
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors"
                          style={{ color: getCommunicationChannelColor(channel.type) }}
                          title={`${channel.name} (${getCommunicationChannelLabel(channel.type)})`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getCommunicationChannelIcon(channel.type)}
                        </a>
                      ))}
                      {catalog.dashboardLinks && catalog.dashboardLinks.map((dashboard, idx) => (
                        <a
                          key={`dashboard-${idx}`}
                          href={dashboard.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors"
                          style={{ color: getDashboardColor(dashboard.type) }}
                          title={`${dashboard.name} (${getDashboardLabel(dashboard.type)})`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getDashboardIcon(dashboard.type)}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {catalogs.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No items in catalog</p>
              {activeFiltersCount > 0 && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>
      </div>
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

function getPlatformIcon(platform?: Platform) {
  switch (platform) {
    case Platform.EC2:
      return <FontAwesomeIcon icon={faAws} className="w-3 h-3" style={{ color: '#FF9900' }} />
    case Platform.LAMBDA:
      return <Zap className="w-3 h-3 text-yellow-600" />
    case Platform.KUBERNETES:
      return <KubernetesIcon className="w-3 h-3" />
    case Platform.ECS:
      return <FontAwesomeIcon icon={faDocker} className="w-3 h-3" style={{ color: '#2496ED' }} />
    case Platform.FARGATE:
      return <FontAwesomeIcon icon={faAws} className="w-3 h-3" style={{ color: '#FF9900' }} />
    case Platform.CLOUD_RUN:
      return <FontAwesomeIcon icon={faGoogle} className="w-3 h-3" style={{ color: '#4285F4' }} />
    case Platform.APP_SERVICE:
      return <FontAwesomeIcon icon={faMicrosoft} className="w-3 h-3" style={{ color: '#0078D4' }} />
    case Platform.STEP_FUNCTIONS:
      return <Zap className="w-3 h-3 text-orange-600" />
    case Platform.EVENT_BRIDGE:
      return <Activity className="w-3 h-3 text-pink-600" />
    case Platform.RDS:
      return <FontAwesomeIcon icon={faDatabaseSolid} className="w-3 h-3" style={{ color: '#527FFF' }} />
    case Platform.DYNAMODB:
      return <FontAwesomeIcon icon={faAws} className="w-3 h-3" style={{ color: '#4053D6' }} />
    case Platform.S3:
      return <HardDrive className="w-3 h-3 text-red-600" />
    case Platform.CLOUDFRONT:
      return <Globe className="w-3 h-3 text-violet-600" />
    case Platform.API_GATEWAY:
      return <Shield className="w-3 h-3 text-lime-600" />
    case Platform.CLOUDWATCH:
      return <Activity className="w-3 h-3 text-sky-600" />
    case Platform.ON_PREMISE:
      return <Server className="w-3 h-3 text-gray-600" />
    case Platform.HYBRID:
      return <Cloud className="w-3 h-3 text-slate-600" />
    case Platform.MULTI_CLOUD:
      return <FontAwesomeIcon icon={faCloud} className="w-3 h-3" style={{ color: '#E91E63' }} />
    default:
      return <Server className="w-3 h-3 text-gray-600" />
  }
}

function getPlatformColor(platform?: Platform): { bg: string; text: string; darkBg: string; darkText: string } {
  switch (platform) {
    case Platform.EC2:
      return { bg: 'bg-orange-100', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300' }
    case Platform.LAMBDA:
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300' }
    case Platform.KUBERNETES:
      return { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300' }
    case Platform.ECS:
      return { bg: 'bg-indigo-100', text: 'text-indigo-800', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300' }
    case Platform.FARGATE:
      return { bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-300' }
    case Platform.CLOUD_RUN:
      return { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300' }
    case Platform.APP_SERVICE:
      return { bg: 'bg-cyan-100', text: 'text-cyan-800', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-300' }
    case Platform.STEP_FUNCTIONS:
      return { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-300' }
    case Platform.EVENT_BRIDGE:
      return { bg: 'bg-pink-100', text: 'text-pink-800', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-300' }
    case Platform.RDS:
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-300' }
    case Platform.DYNAMODB:
      return { bg: 'bg-teal-100', text: 'text-teal-800', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-300' }
    case Platform.S3:
      return { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300' }
    case Platform.CLOUDFRONT:
      return { bg: 'bg-violet-100', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-300' }
    case Platform.API_GATEWAY:
      return { bg: 'bg-lime-100', text: 'text-lime-800', darkBg: 'dark:bg-lime-900/30', darkText: 'dark:text-lime-300' }
    case Platform.CLOUDWATCH:
      return { bg: 'bg-sky-100', text: 'text-sky-800', darkBg: 'dark:bg-sky-900/30', darkText: 'dark:text-sky-300' }
    case Platform.ON_PREMISE:
      return { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-900/30', darkText: 'dark:text-gray-300' }
    case Platform.HYBRID:
      return { bg: 'bg-slate-100', text: 'text-slate-800', darkBg: 'dark:bg-slate-900/30', darkText: 'dark:text-slate-300' }
    case Platform.MULTI_CLOUD:
      return { bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-300' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-900/30', darkText: 'dark:text-gray-300' }
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

// Helper functions for Communication Channels
function getCommunicationChannelIcon(type?: CommunicationType) {
  switch (type) {
    case CommunicationType.SLACK:
      return <SlackIcon className="w-5 h-5" />
    case CommunicationType.TEAMS:
      return <FontAwesomeIcon icon={faMicrosoft} className="w-5 h-5" />
    case CommunicationType.EMAIL:
      return <Mail className="w-5 h-5" />
    case CommunicationType.DISCORD:
      return <FontAwesomeIcon icon={faDiscord} className="w-5 h-5" />
    case CommunicationType.MATTERMOST:
      return <FontAwesomeIcon icon={faComments} className="w-5 h-5" />
    case CommunicationType.TELEGRAM:
      return <FontAwesomeIcon icon={faTelegram} className="w-5 h-5" />
    default:
      return <FontAwesomeIcon icon={faComments} className="w-5 h-5" />
  }
}

function getCommunicationChannelColor(type?: CommunicationType): string {
  switch (type) {
    case CommunicationType.SLACK:
      return '#4A154B' // Slack purple
    case CommunicationType.TEAMS:
      return '#6264A7' // Teams blue
    case CommunicationType.EMAIL:
      return '#EA4335' // Gmail red
    case CommunicationType.DISCORD:
      return '#5865F2' // Discord blurple
    case CommunicationType.MATTERMOST:
      return '#0058CC' // Mattermost blue
    case CommunicationType.TELEGRAM:
      return '#0088CC' // Telegram blue
    default:
      return '#6B7280' // Gray
  }
}

function getCommunicationChannelLabel(type?: CommunicationType): string {
  switch (type) {
    case CommunicationType.SLACK:
      return 'Slack'
    case CommunicationType.TEAMS:
      return 'Microsoft Teams'
    case CommunicationType.EMAIL:
      return 'Email'
    case CommunicationType.DISCORD:
      return 'Discord'
    case CommunicationType.MATTERMOST:
      return 'Mattermost'
    case CommunicationType.TELEGRAM:
      return 'Telegram'
    default:
      return 'Communication'
  }
}

// Dashboard helper functions
function getDashboardIcon(type?: DashboardType) {
  switch (type) {
    case DashboardType.GRAFANA:
      return <GrafanaIcon className="w-5 h-5" />
    case DashboardType.PROMETHEUS:
    case DashboardType.KIBANA:
      return <Activity className="w-5 h-5" />
    case DashboardType.DATADOG:
    case DashboardType.NEWRELIC:
    case DashboardType.DYNATRACE:
    case DashboardType.APPDYNAMICS:
      return <Activity className="w-5 h-5" />
    default:
      return <Activity className="w-5 h-5" />
  }
}

function getDashboardLabel(type?: DashboardType): string {
  switch (type) {
    case DashboardType.GRAFANA:
      return 'Grafana'
    case DashboardType.DATADOG:
      return 'Datadog'
    case DashboardType.NEWRELIC:
      return 'New Relic'
    case DashboardType.PROMETHEUS:
      return 'Prometheus'
    case DashboardType.KIBANA:
      return 'Kibana'
    case DashboardType.SPLUNK:
      return 'Splunk'
    case DashboardType.DYNATRACE:
      return 'Dynatrace'
    case DashboardType.APPDYNAMICS:
      return 'AppDynamics'
    case DashboardType.CUSTOM:
      return 'Custom'
    default:
      return 'Dashboard'
  }
}

function getDashboardColor(type?: DashboardType): string {
  switch (type) {
    case DashboardType.GRAFANA:
      return '#f97316' // orange-500
    case DashboardType.DATADOG:
      return '#a855f7' // purple-500
    case DashboardType.NEWRELIC:
      return '#22c55e' // green-500
    case DashboardType.PROMETHEUS:
      return '#ef4444' // red-500
    case DashboardType.KIBANA:
      return '#f59e0b' // amber-500
    case DashboardType.SPLUNK:
      return '#6b7280' // gray-500
    case DashboardType.DYNATRACE:
      return '#3b82f6' // blue-500
    case DashboardType.APPDYNAMICS:
      return '#6366f1' // indigo-500
    case DashboardType.CUSTOM:
      return '#14b8a6' // teal-500
    default:
      return '#6b7280' // gray-500
  }
}
