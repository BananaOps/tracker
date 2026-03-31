import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../lib/api'
import { CatalogType, Language, SLALevel, Platform, CommunicationType, DashboardType, type Catalog } from '../types/api'
import { Package, BookOpen, Search, X, Server, Cloud, Database, Zap, Globe, Shield, HardDrive, Activity, Mail, Filter, SlidersHorizontal } from 'lucide-react'
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
import { KubernetesIcon } from '../components/icons/KubernetesIcon'
import { KotlinIcon } from '../components/icons/KotlinIcon'
import { TerraformIcon } from '../components/icons/TerraformIcon'
import { SlackIcon } from '../components/icons/SlackIcon'
import { GrafanaIcon } from '../components/icons/GrafanaIcon'

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

  // ─── HUD Design Tokens ──────────────────────────────────────────────────────
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:           'rgb(var(--hud-bg))',
    surface:      'rgb(var(--hud-surface))',
    surfaceLow:   'rgb(var(--hud-surface-low))',
    surfaceHigh:  'rgb(var(--hud-surface-high))',
    primary:      'rgb(var(--hud-primary))',
    tertiary:     'rgb(var(--hud-tertiary))',
    error:        'rgb(var(--hud-error))',
    success:      'rgb(var(--hud-success))',
    onSurface:    'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outlineVar:   'rgb(var(--hud-outline-var))',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
            style={{ border: `3px solid ${a('primary', 0.2)}`, borderTopColor: T.primary }}
          />
          <p className="text-sm" style={{ color: T.onSurfaceVar }}>Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg }}>
      {/* Sidebar Filters */}
      {showSidebar && (
        <div
          className="w-64 flex flex-col shrink-0 transition-all duration-300"
          style={{ background: T.surface, borderRight: `1px solid ${a('outline-var', 0.15)}` }}
        >
          {/* Sidebar Header */}
          <div className="p-4" style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest"
                style={{ color: T.onSurfaceVar, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: T.primary, background: a('primary', 0.1) }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filters Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-5">

              {/* Type Filter */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>Type</p>
                <div className="space-y-2">
                  {uniqueTypes.map((type: string) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selectedTypes.includes(type) ? T.primary : 'transparent',
                          border: `1.5px solid ${selectedTypes.includes(type) ? T.primary : a('outline-var', 0.4)}`,
                        }}
                        onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      >
                        {selectedTypes.includes(type) && (
                          <span className="text-white text-[10px] font-bold leading-none">✓</span>
                        )}
                      </div>
                      <span
                        className="text-sm"
                        style={{ color: selectedTypes.includes(type) ? T.onSurface : T.onSurfaceVar }}
                        onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      >
                        {getCatalogTypeLabel(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }} />

              {/* Language Filter */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>Language</p>
                <div className="space-y-2">
                  {uniqueLanguages.map((lang: string) => (
                    <label key={lang} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selectedLanguages.includes(lang) ? T.primary : 'transparent',
                          border: `1.5px solid ${selectedLanguages.includes(lang) ? T.primary : a('outline-var', 0.4)}`,
                        }}
                        onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)}
                      >
                        {selectedLanguages.includes(lang) && (
                          <span className="text-white text-[10px] font-bold leading-none">✓</span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: selectedLanguages.includes(lang) ? T.onSurface : T.onSurfaceVar }}
                        onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)}
                      >
                        {getLanguageIcon(lang)}
                        <span>{getLanguageLabel(lang)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }} />

              {/* Platform Filter */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>Platform</p>
                <div className="space-y-2">
                  {uniquePlatforms.map((platform: string) => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selectedPlatforms.includes(platform) ? T.primary : 'transparent',
                          border: `1.5px solid ${selectedPlatforms.includes(platform) ? T.primary : a('outline-var', 0.4)}`,
                        }}
                        onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)}
                      >
                        {selectedPlatforms.includes(platform) && (
                          <span className="text-white text-[10px] font-bold leading-none">✓</span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: selectedPlatforms.includes(platform) ? T.onSurface : T.onSurfaceVar }}
                        onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)}
                      >
                        {getPlatformIcon(platform as Platform)}
                        <span>{getPlatformLabel(platform as Platform)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }} />

              {/* SLA Filter */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: T.onSurfaceVar }}>SLA Level</p>
                <div className="space-y-2">
                  {uniqueSLAs.map((sla: string) => (
                    <label key={sla} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selectedSLAs.includes(sla) ? T.primary : 'transparent',
                          border: `1.5px solid ${selectedSLAs.includes(sla) ? T.primary : a('outline-var', 0.4)}`,
                        }}
                        onClick={() => toggleFilter(sla, selectedSLAs, setSelectedSLAs)}
                      >
                        {selectedSLAs.includes(sla) && (
                          <span className="text-white text-[10px] font-bold leading-none">✓</span>
                        )}
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${getSLAColor(sla as SLALevel)}20`,
                          color: getSLAColor(sla as SLALevel),
                        }}
                        onClick={() => toggleFilter(sla, selectedSLAs, setSelectedSLAs)}
                      >
                        {getSLALabel(sla as SLALevel)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${a('outline-var', 0.15)}` }} />

              {/* Owner Filter */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>Owner</p>
                {uniqueOwners.length > 0 ? (
                  <div className="space-y-3">
                    {/* Owner Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: T.onSurfaceVar }} />
                      <input
                        placeholder="Search owners..."
                        value={ownerSearchQuery}
                        onChange={(e) => setOwnerSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg outline-none"
                        style={{
                          background: a('outline-var', 0.07),
                          border: `1px solid ${a('outline-var', 0.2)}`,
                          color: T.onSurface,
                        }}
                      />
                      {ownerSearchQuery && (
                        <button
                          onClick={() => setOwnerSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          style={{ color: T.onSurfaceVar }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Owners List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredOwners.length > 0 ? (
                        filteredOwners.map((owner: string) => (
                          <label key={owner} className="flex items-center gap-2 cursor-pointer">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                              style={{
                                background: selectedOwners.includes(owner) ? T.primary : 'transparent',
                                border: `1.5px solid ${selectedOwners.includes(owner) ? T.primary : a('outline-var', 0.4)}`,
                              }}
                              onClick={() => toggleFilter(owner, selectedOwners, setSelectedOwners)}
                            >
                              {selectedOwners.includes(owner) && (
                                <span className="text-white text-[10px] font-bold leading-none">✓</span>
                              )}
                            </div>
                            <span
                              className="text-sm truncate"
                              title={owner}
                              style={{ color: selectedOwners.includes(owner) ? T.onSurface : T.onSurfaceVar }}
                              onClick={() => toggleFilter(owner, selectedOwners, setSelectedOwners)}
                            >
                              {owner}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs italic" style={{ color: T.onSurfaceVar }}>No owners found</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: T.onSurfaceVar }}>No owners</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="p-4"
          style={{ background: T.surface, borderBottom: `1px solid ${a('outline-var', 0.15)}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-9 w-9 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: showSidebar ? a('primary', 0.12) : a('outline-var', 0.08),
                  color: showSidebar ? T.primary : T.onSurfaceVar,
                  border: `1px solid ${showSidebar ? a('primary', 0.25) : a('outline-var', 0.3)}`,
                }}
              >
                <Filter className="w-4 h-4" />
              </button>
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: T.onSurface, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Catalog
                </h2>
                <p className="text-sm" style={{ color: T.onSurfaceVar }}>
                  {catalogs.length} of {allCatalogs.length} items
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.onSurfaceVar }} />
            <input
              placeholder="Search by name, description, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg outline-none text-sm"
              style={{
                background: a('outline-var', 0.06),
                border: `1px solid ${a('outline-var', 0.2)}`,
                color: T.onSurface,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T.onSurfaceVar }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {selectedTypes.map((type: string) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full cursor-pointer transition-all"
                  style={{ background: a('primary', 0.12), color: T.primary }}
                >
                  {getCatalogTypeLabel(type)}
                  <X className="w-3 h-3" onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                </span>
              ))}
              {selectedLanguages.map((lang: string) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full cursor-pointer transition-all"
                  style={{ background: a('primary', 0.12), color: T.primary }}
                >
                  {getLanguageIcon(lang)}
                  <span>{getLanguageLabel(lang)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)} />
                </span>
              ))}
              {selectedPlatforms.map((platform: string) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full cursor-pointer transition-all"
                  style={{ background: a('primary', 0.12), color: T.primary }}
                >
                  {getPlatformIcon(platform as Platform)}
                  <span>{getPlatformLabel(platform as Platform)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)} />
                </span>
              ))}
              {selectedSLAs.map((sla: string) => (
                <span
                  key={sla}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full cursor-pointer transition-all"
                  style={{
                    background: `${getSLAColor(sla as SLALevel)}20`,
                    color: getSLAColor(sla as SLALevel),
                    border: `1px solid ${getSLAColor(sla as SLALevel)}40`,
                  }}
                >
                  <span>{getSLALabel(sla as SLALevel)}</span>
                  <X className="w-3 h-3" onClick={() => toggleFilter(sla, selectedSLAs, setSelectedSLAs)} />
                </span>
              ))}
              {selectedOwners.map((owner: string) => (
                <span
                  key={owner}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full cursor-pointer transition-all"
                  style={{ background: a('primary', 0.12), color: T.primary }}
                >
                  {owner}
                  <X className="w-3 h-3" onClick={() => toggleFilter(owner, selectedOwners, setSelectedOwners)} />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6" style={{ background: T.bg }}>
          <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.15)}` }}>
            <table className="min-w-full">
              <thead>
                <tr style={{ background: T.surfaceHigh }}>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    SLA
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                    Links
                  </th>
                </tr>
              </thead>
              <tbody>
                {catalogs.map((catalog: Catalog, i: number) => (
                  <tr
                    key={catalog.name}
                    className="cursor-pointer transition-colors group"
                    style={{ borderTop: i > 0 ? `1px solid ${a('outline-var', 0.12)}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surfaceLow)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/catalog/${catalog.name}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0" style={{ color: T.onSurfaceVar }} />
                        <span
                          className="text-sm font-semibold truncate max-w-[200px]"
                          title={catalog.name}
                          style={{ color: T.onSurface }}
                        >
                          {catalog.name.length > 25 ? `${catalog.name.substring(0, 25)}...` : catalog.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2.5 py-1 text-xs font-bold rounded-full"
                        style={{ background: a('primary', 0.12), color: T.primary }}
                      >
                        {getCatalogTypeLabel(catalog.type)}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5"
                      style={{ background: a('outline-var', 0.1), color: T.onSurface }}
                    >
                      {getLanguageIcon(catalog.languages)}
                      <span>{getLanguageLabel(catalog.languages)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {catalog.platform ? (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1 ${getPlatformColor(catalog.platform).bg} ${getPlatformColor(catalog.platform).text} ${getPlatformColor(catalog.platform).darkBg} ${getPlatformColor(catalog.platform).darkText}`}>
                        {getPlatformIcon(catalog.platform)}
                        <span>{getPlatformLabel(catalog.platform)}</span>
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: T.onSurfaceVar }}>-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {catalog.sla ? (
                      <span
                        className="px-2.5 py-1 text-xs font-bold rounded-full"
                        style={{
                          background: `${getSLAColor(catalog.sla.level)}20`,
                          color: getSLAColor(catalog.sla.level),
                        }}
                      >
                        {getSLALabel(catalog.sla.level)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: T.onSurfaceVar }}>-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: T.onSurface }}>
                    {catalog.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: T.onSurface }}>
                    {catalog.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3 items-center">
                      {catalog.repository && (
                        <a
                          href={catalog.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors"
                          style={{ color: T.onSurfaceVar }}
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
                          className="transition-colors"
                          style={{ color: T.onSurfaceVar }}
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
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto mb-3" style={{ color: a('on-surface-var', 0.3) }} />
              <p className="text-sm font-semibold" style={{ color: T.onSurface }}>No items in catalog</p>
              {activeFiltersCount > 0 && (
                <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>Try adjusting your filters</p>
              )}
            </div>
          )}
          </div>
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
