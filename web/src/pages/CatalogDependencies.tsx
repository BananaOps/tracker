import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, CatalogType, Platform, type Catalog } from '../types/api'
import { ArrowLeft, GitBranch, Search, X, Grid, List, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import {
  ReactFlow,
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  MarkerType,
  Position,
  useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useMemo, useState, useCallback } from 'react'

type LayoutType = 'circular' | 'hierarchical' | 'force' | 'grid'
type ViewMode = 'graph' | 'list'

export default function CatalogDependencies() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSLA, setSelectedSLA] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchical')
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [nodeSize, setNodeSize] = useState<'small' | 'medium' | 'large'>('medium')

  const { data: allCatalogs, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  // Build complete dependency graph with improved layouts
  const { nodes, edges } = useMemo(() => {
    if (!allCatalogs) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []
    const edgeSet = new Set<string>()

    // Enhanced filtering with direct dependencies inclusion
    let filteredCatalogs = allCatalogs.catalogs.filter(catalog => {
      // SLA filter
      if (selectedSLA.length > 0) {
        const slaLevel = catalog.sla?.level || SLALevel.UNSPECIFIED
        if (!selectedSLA.includes(slaLevel)) return false
      }

      // Type filter
      if (selectedTypes.length > 0) {
        const catalogType = String(catalog.type).toLowerCase()
        if (!selectedTypes.includes(catalogType)) return false
      }

      // Platform filter
      if (selectedPlatforms.length > 0) {
        if (!catalog.platform) return false
        const catalogPlatform = String(catalog.platform).toLowerCase()
        if (!selectedPlatforms.includes(catalogPlatform)) return false
      }

      return true
    })

    // If there's a search query, include direct dependencies
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      
      // First, find services that match the search
      const matchingServices = filteredCatalogs.filter(catalog =>
        catalog.name.toLowerCase().includes(query)
      )
      
      // Then, collect all direct dependencies of matching services
      const dependencyNames = new Set<string>()
      matchingServices.forEach(service => {
        // Add dependencies in (services this one depends on)
        service.dependenciesIn?.forEach(dep => dependencyNames.add(dep))
        // Add dependencies out (services that depend on this one)
        service.dependenciesOut?.forEach(dep => dependencyNames.add(dep))
      })
      
      // Include matching services and their direct dependencies
      filteredCatalogs = filteredCatalogs.filter(catalog => {
        // Include if it matches the search query
        if (catalog.name.toLowerCase().includes(query)) return true
        // Include if it's a direct dependency of a matching service
        if (dependencyNames.has(catalog.name)) return true
        return false
      })
    }

    // Sort catalogs by dependency count for better positioning
    const sortedCatalogs = [...filteredCatalogs].sort((a, b) => {
      const aDeps = (a.dependenciesIn?.length || 0) + (a.dependenciesOut?.length || 0)
      const bDeps = (b.dependenciesIn?.length || 0) + (b.dependenciesOut?.length || 0)
      return bDeps - aDeps // Most dependencies first
    })

    // Separate services with and without dependencies
    const servicesWithoutDeps = sortedCatalogs.filter(c => 
      (c.dependenciesIn?.length || 0) + (c.dependenciesOut?.length || 0) === 0
    )
    const servicesWithDeps = sortedCatalogs.filter(c => 
      (c.dependenciesIn?.length || 0) + (c.dependenciesOut?.length || 0) > 0
    )

    // Calculate node positions based on layout type with improved spacing
    const getNodePosition = (catalog: Catalog, index: number, total: number, sortedIndex: number) => {
      const nodeSizes = {
        small: { width: 100, height: 80, spacing: 120 },
        medium: { width: 140, height: 100, spacing: 160 },
        large: { width: 180, height: 120, spacing: 200 }
      }
      const currentNodeSize = nodeSizes[nodeSize]
      const dependencyCount = (catalog.dependenciesIn?.length || 0) + (catalog.dependenciesOut?.length || 0)
      
      // Determine if this service has dependencies and its position within its group
      const hasNoDeps = dependencyCount === 0
      const groupIndex = hasNoDeps 
        ? servicesWithoutDeps.findIndex(c => c.name === catalog.name)
        : servicesWithDeps.findIndex(c => c.name === catalog.name)

      switch (layoutType) {
        case 'circular':
          if (hasNoDeps) {
            // Services without dependencies: smaller inner circle
            const innerRadius = 250
            const innerAngleStep = (2 * Math.PI) / servicesWithoutDeps.length
            const innerAngle = groupIndex * innerAngleStep
            return {
              x: 600 + innerRadius * Math.cos(innerAngle),
              y: 400 + innerRadius * Math.sin(innerAngle)
            }
          } else {
            // Services with dependencies: larger outer circle
            const outerRadius = Math.max(450, servicesWithDeps.length * 12)
            const outerAngleStep = (2 * Math.PI) / servicesWithDeps.length
            const outerAngle = groupIndex * outerAngleStep
            return {
              x: 600 + outerRadius * Math.cos(outerAngle),
              y: 400 + outerRadius * Math.sin(outerAngle)
            }
          }

        case 'hierarchical':
          if (hasNoDeps) {
            // Services without dependencies: top section (level 0)
            const maxPerRow = 10
            const row = Math.floor(groupIndex / maxPerRow)
            const col = groupIndex % maxPerRow
            return {
              x: 100 + col * currentNodeSize.spacing,
              y: 100 + (row * 140) // Start at top
            }
          } else {
            // Services with dependencies: lower sections (levels 1-5)
            const level = Math.min(Math.floor(dependencyCount / 3) + 1, 5)
            const servicesAtLevel = servicesWithDeps.filter(c => {
              const deps = (c.dependenciesIn?.length || 0) + (c.dependenciesOut?.length || 0)
              return Math.min(Math.floor(deps / 3) + 1, 5) === level
            })
            
            const levelIndex = servicesAtLevel.findIndex(c => c.name === catalog.name)
            const maxPerLevel = Math.ceil(servicesAtLevel.length / Math.max(1, Math.ceil(servicesAtLevel.length / 8)))
            
            const row = Math.floor(levelIndex / maxPerLevel)
            const col = levelIndex % maxPerLevel
            
            // Add offset for services without dependencies section
            const noDepsRows = Math.ceil(servicesWithoutDeps.length / 10)
            const offsetY = 300 + (noDepsRows * 140) // Space after no-deps section
            
            return {
              x: 100 + col * currentNodeSize.spacing,
              y: offsetY + (level * 180) + (row * 140)
            }
          }

        case 'grid':
          if (hasNoDeps) {
            // Services without dependencies: top grid
            const maxCols = 10
            const gridRow = Math.floor(groupIndex / maxCols)
            const gridCol = groupIndex % maxCols
            return {
              x: 100 + gridCol * currentNodeSize.spacing,
              y: 100 + gridRow * (currentNodeSize.height + 40)
            }
          } else {
            // Services with dependencies: bottom grid with offset
            const maxCols = 10
            const gridRow = Math.floor(groupIndex / maxCols)
            const gridCol = groupIndex % maxCols
            
            // Add offset for services without dependencies section
            const noDepsRows = Math.ceil(servicesWithoutDeps.length / 10)
            const offsetY = 300 + (noDepsRows * (currentNodeSize.height + 40))
            
            return {
              x: 100 + gridCol * currentNodeSize.spacing,
              y: offsetY + gridRow * (currentNodeSize.height + 40)
            }
          }

        case 'force':
          if (hasNoDeps) {
            // Services without dependencies: left cluster
            const leftClusterX = 300
            const leftClusterY = 400
            const leftRadius = Math.min(200, servicesWithoutDeps.length * 8)
            const leftAngle = (groupIndex / servicesWithoutDeps.length) * 2 * Math.PI
            const jitter = (Math.random() - 0.5) * 60
            
            return {
              x: leftClusterX + leftRadius * Math.cos(leftAngle) + jitter,
              y: leftClusterY + leftRadius * Math.sin(leftAngle) + jitter
            }
          } else {
            // Services with dependencies: right cluster
            const rightClusterX = 900
            const rightClusterY = 400
            const rightRadius = Math.max(250, dependencyCount * 15)
            const rightAngle = (groupIndex / servicesWithDeps.length) * 2 * Math.PI
            const jitter = (Math.random() - 0.5) * 80
            
            return {
              x: rightClusterX + rightRadius * Math.cos(rightAngle) + jitter,
              y: rightClusterY + rightRadius * Math.sin(rightAngle) + jitter
            }
          }

        default:
          // Default: separate sections
          if (hasNoDeps) {
            const defaultRow = Math.floor(groupIndex / 10)
            const defaultCol = groupIndex % 10
            return { 
              x: 100 + defaultCol * currentNodeSize.spacing, 
              y: 100 + defaultRow * (currentNodeSize.height + 40) 
            }
          } else {
            const defaultRow = Math.floor(groupIndex / 10)
            const defaultCol = groupIndex % 10
            const noDepsRows = Math.ceil(servicesWithoutDeps.length / 10)
            const offsetY = 300 + (noDepsRows * (currentNodeSize.height + 40))
            
            return { 
              x: 100 + defaultCol * currentNodeSize.spacing, 
              y: offsetY + defaultRow * (currentNodeSize.height + 40) 
            }
          }
      }
    }

    sortedCatalogs.forEach((catalog, sortedIndex) => {
      const originalIndex = filteredCatalogs.findIndex(c => c.name === catalog.name)
      const position = getNodePosition(catalog, originalIndex, filteredCatalogs.length, sortedIndex)
      const slaColor = catalog.sla ? getSLAColor(catalog.sla.level) : '#94a3b8'
      const nodeSizes = {
        small: { minWidth: '80px', fontSize: '10px', padding: '8px' },
        medium: { minWidth: '120px', fontSize: '11px', padding: '12px' },
        large: { minWidth: '160px', fontSize: '12px', padding: '16px' }
      }
      const currentSize = nodeSizes[nodeSize]

      nodes.push({
        id: catalog.name,
        data: { 
          label: catalog.name,
          sla: catalog.sla?.level,
          type: catalog.type,
          platform: catalog.platform,
          depsCount: (catalog.dependenciesIn?.length || 0) + (catalog.dependenciesOut?.length || 0)
        },
        position,
        type: 'default',
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: `3px solid ${slaColor}`,
          borderRadius: '10px',
          padding: currentSize.padding,
          fontSize: currentSize.fontSize,
          fontWeight: '600',
          boxShadow: `0 0 20px ${slaColor}40`,
          minWidth: currentSize.minWidth,
          textAlign: 'center',
          cursor: 'pointer',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // Create edges for dependencies - avoid crossing through no-dependency zone
      catalog.dependenciesIn?.forEach(depName => {
        const edgeId = `${depName}-${catalog.name}`
        if (!edgeSet.has(edgeId) && filteredCatalogs.some(c => c.name === depName)) {
          const sourceCatalog = filteredCatalogs.find(c => c.name === depName)
          const targetCatalog = catalog
          
          // Check if source and target have dependencies
          const sourceHasDeps = sourceCatalog && ((sourceCatalog.dependenciesIn?.length || 0) + (sourceCatalog.dependenciesOut?.length || 0)) > 0
          const targetHasDeps = (targetCatalog.dependenciesIn?.length || 0) + (targetCatalog.dependenciesOut?.length || 0) > 0
          
          // Only create edges between services that both have dependencies
          // This prevents arrows from crossing through the no-dependency zone
          if (sourceHasDeps && targetHasDeps) {
            edgeSet.add(edgeId)
            
            // Use different edge styles based on layout to avoid crossing zones
            let edgeType = 'smoothstep'
            let edgeStyle = { stroke: '#64748b', strokeWidth: 2 }
            
            if (layoutType === 'hierarchical' || layoutType === 'grid') {
              // For hierarchical and grid layouts, use straight edges that go around the no-deps zone
              edgeType = 'step'
              edgeStyle = { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5,5' }
            } else if (layoutType === 'force') {
              // For force layout, use curved edges
              edgeType = 'smoothstep'
            }
            
            edges.push({
              id: edgeId,
              source: depName,
              target: catalog.name,
              type: edgeType,
              animated: true,
              style: edgeStyle,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#64748b',
              },
              // Add path options to avoid crossing the no-dependency zone
              ...(layoutType === 'hierarchical' && {
                pathOptions: { offset: 20, borderRadius: 10 }
              })
            })
          }
        }
      })
    })

    return { nodes, edges }
  }, [allCatalogs, searchQuery, selectedSLA, selectedTypes, selectedPlatforms, layoutType, nodeSize])

  // Extract unique values for filters
  const uniqueTypes = useMemo(() => {
    if (!allCatalogs) return []
    return Array.from(new Set(allCatalogs.catalogs.map((c: Catalog) => String(c.type).toLowerCase()))).sort()
  }, [allCatalogs])

  const uniquePlatforms = useMemo(() => {
    if (!allCatalogs) return []
    return Array.from(new Set(allCatalogs.catalogs.filter((c: Catalog) => c.platform).map((c: Catalog) => String(c.platform).toLowerCase()))).sort()
  }, [allCatalogs])

  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value))
    } else {
      setter([...selected, value])
    }
  }

  const toggleSLAFilter = (level: string) => {
    toggleFilter(level, selectedSLA, setSelectedSLA)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSLA([])
    setSelectedTypes([])
    setSelectedPlatforms([])
  }

  const stats = useMemo(() => {
    if (!allCatalogs) return { total: 0, withDeps: 0, totalDeps: 0 }

    const total = allCatalogs.catalogs.length
    const withDeps = allCatalogs.catalogs.filter(c => 
      (c.dependenciesIn && c.dependenciesIn.length > 0) || 
      (c.dependenciesOut && c.dependenciesOut.length > 0)
    ).length
    const totalDeps = allCatalogs.catalogs.reduce((sum, c) => 
      sum + (c.dependenciesIn?.length || 0) + (c.dependenciesOut?.length || 0), 0
    )

    return { total, withDeps, totalDeps }
  }, [allCatalogs])

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/catalog')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-3">
              <GitBranch className="w-8 h-8" />
              <span>Global Dependencies</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Complete view of all service dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
               borderTop: '4px solid #6366f1',
               boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.total}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Services
          </div>
        </div>

        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
               borderTop: '4px solid #10b981',
               boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {stats.withDeps}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            With Dependencies
          </div>
        </div>

        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%)',
               borderTop: '4px solid #3b82f6',
               boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {stats.totalDeps}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Dependencies
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Layout and View Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Layout:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayoutType('hierarchical')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    layoutType === 'hierarchical'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Hierarchical
                </button>
                <button
                  onClick={() => setLayoutType('grid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    layoutType === 'grid'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Grid className="w-3 h-3 inline mr-1" />
                  Grid
                </button>
                <button
                  onClick={() => setLayoutType('circular')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    layoutType === 'circular'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Circular
                </button>
                <button
                  onClick={() => setLayoutType('force')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    layoutType === 'force'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Force
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Node Size:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setNodeSize('small')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    nodeSize === 'small'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <ZoomOut className="w-3 h-3 inline mr-1" />
                  Small
                </button>
                <button
                  onClick={() => setNodeSize('medium')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    nodeSize === 'medium'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setNodeSize('large')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    nodeSize === 'large'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <ZoomIn className="w-3 h-3 inline mr-1" />
                  Large
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Maximize2 className="w-3 h-3 inline mr-1" />
                Graph
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-3 h-3 inline mr-1" />
                List
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
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

          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              {/* Type Filters */}
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

              {/* Platform Filters */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform:</span>
                <div className="flex flex-wrap gap-2">
                  {uniquePlatforms.map((platform: string) => {
                    const platformColors = getPlatformColor(platform as Platform)
                    return (
                      <button
                        key={platform}
                        onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center space-x-1 ${
                          selectedPlatforms.includes(platform)
                            ? `${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText} ring-2 ring-offset-1 ring-gray-400`
                            : `${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText} hover:opacity-80`
                        }`}
                      >
                        <span>{getPlatformIcon(platform as Platform)}</span>
                        <span>{getPlatformLabel(platform as Platform)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* SLA Filters */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SLA:</span>
                <div className="flex flex-wrap gap-2">
                  {[SLALevel.CRITICAL, SLALevel.HIGH, SLALevel.MEDIUM, SLALevel.LOW].map(level => (
                    <button
                      key={level}
                      onClick={() => toggleSLAFilter(level)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedSLA.includes(level)
                          ? 'text-white'
                          : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: selectedSLA.includes(level) ? getSLAColor(level) : `${getSLAColor(level)}30`,
                        color: selectedSLA.includes(level) ? 'white' : getSLAColor(level),
                      }}
                    >
                      {getSLALabel(level)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(searchQuery || selectedSLA.length > 0 || selectedTypes.length > 0 || selectedPlatforms.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1 font-medium"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2" style={{ borderColor: getSLAColor(SLALevel.CRITICAL) }}></div>
            <span className="text-gray-600 dark:text-gray-400">Critical SLA</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2" style={{ borderColor: getSLAColor(SLALevel.HIGH) }}></div>
            <span className="text-gray-600 dark:text-gray-400">High SLA</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2" style={{ borderColor: getSLAColor(SLALevel.MEDIUM) }}></div>
            <span className="text-gray-600 dark:text-gray-400">Medium SLA</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded border-2" style={{ borderColor: getSLAColor(SLALevel.LOW) }}></div>
            <span className="text-gray-600 dark:text-gray-400">Low SLA</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-gray-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Dependency</span>
          </div>
        </div>
      </div>

      {/* Graph or List View */}
      {viewMode === 'graph' ? (
        <div className="card p-0 overflow-hidden" style={{ height: '700px' }}>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Dependency Graph
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Showing {nodes.length} services with {edges.length} dependencies
                </p>
              </div>
              {nodes.length > 50 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">
                  ⚠️ Large dataset - Consider using List view for better performance
                </div>
              )}
            </div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            attributionPosition="bottom-left"
            onNodeClick={(_, node) => navigate(`/catalog/${node.id}`)}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                const slaLevel = n.data?.sla
                return getSLAColor(slaLevel)
              }}
              nodeColor={(n) => {
                const slaLevel = n.data?.sla
                return getSLAColor(slaLevel) + '40'
              }}
              nodeBorderRadius={2}
            />
          </ReactFlow>
        </div>
      ) : (
        <div className="card">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dependencies List View
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing {nodes.length} services with their dependencies
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dependencies In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dependencies Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Deps
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {allCatalogs?.catalogs
                  .filter(catalog => {
                    // Apply same filters as graph
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase()
                      if (!catalog.name.toLowerCase().includes(query)) return false
                    }
                    if (selectedSLA.length > 0) {
                      const slaLevel = catalog.sla?.level || SLALevel.UNSPECIFIED
                      if (!selectedSLA.includes(slaLevel)) return false
                    }
                    if (selectedTypes.length > 0) {
                      const catalogType = String(catalog.type).toLowerCase()
                      if (!selectedTypes.includes(catalogType)) return false
                    }
                    if (selectedPlatforms.length > 0) {
                      if (!catalog.platform) return false
                      const catalogPlatform = String(catalog.platform).toLowerCase()
                      if (!selectedPlatforms.includes(catalogPlatform)) return false
                    }
                    return true
                  })
                  .sort((a, b) => {
                    const aDeps = (a.dependenciesIn?.length || 0) + (a.dependenciesOut?.length || 0)
                    const bDeps = (b.dependenciesIn?.length || 0) + (b.dependenciesOut?.length || 0)
                    return bDeps - aDeps // Sort by total dependencies (descending)
                  })
                  .map((catalog) => {
                    const depsIn = catalog.dependenciesIn?.length || 0
                    const depsOut = catalog.dependenciesOut?.length || 0
                    const totalDeps = depsIn + depsOut
                    const slaColor = catalog.sla ? getSLAColor(catalog.sla.level) : '#94a3b8'
                    const platformColors = catalog.platform ? getPlatformColor(catalog.platform) : { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-900/30', darkText: 'dark:text-gray-300' }

                    return (
                      <tr 
                        key={catalog.name}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/catalog/${catalog.name}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: slaColor }}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {catalog.name}
                              </div>
                              {catalog.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {catalog.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {getCatalogTypeLabel(catalog.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: slaColor }}
                          >
                            {getSLALabel(catalog.sla?.level)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {catalog.platform ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium space-x-1 ${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText}`}>
                              <span>{getPlatformIcon(catalog.platform)}</span>
                              <span>{getPlatformLabel(catalog.platform)}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {depsIn}
                            </span>
                            {depsIn > 0 && catalog.dependenciesIn && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {catalog.dependenciesIn.slice(0, 3).map((dep, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  >
                                    {dep}
                                  </span>
                                ))}
                                {catalog.dependenciesIn.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{catalog.dependenciesIn.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {depsOut}
                            </span>
                            {depsOut > 0 && catalog.dependenciesOut && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {catalog.dependenciesOut.slice(0, 3).map((dep, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  >
                                    {dep}
                                  </span>
                                ))}
                                {catalog.dependenciesOut.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{catalog.dependenciesOut.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${
                              totalDeps === 0 ? 'text-gray-400 dark:text-gray-500' :
                              totalDeps < 3 ? 'text-green-600 dark:text-green-400' :
                              totalDeps < 6 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {totalDeps}
                            </span>
                            {totalDeps > 0 && (
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    totalDeps < 3 ? 'bg-green-500' :
                                    totalDeps < 6 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((totalDeps / 10) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Empty state for list view */}
          {allCatalogs?.catalogs.filter(catalog => {
            if (searchQuery) {
              const query = searchQuery.toLowerCase()
              if (!catalog.name.toLowerCase().includes(query)) return false
            }
            if (selectedSLA.length > 0) {
              const slaLevel = catalog.sla?.level || SLALevel.UNSPECIFIED
              if (!selectedSLA.includes(slaLevel)) return false
            }
            if (selectedTypes.length > 0) {
              const catalogType = String(catalog.type).toLowerCase()
              if (!selectedTypes.includes(catalogType)) return false
            }
            if (selectedPlatforms.length > 0) {
              if (!catalog.platform) return false
              const catalogPlatform = String(catalog.platform).toLowerCase()
              if (!selectedPlatforms.includes(catalogPlatform)) return false
            }
            return true
          }).length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No services found</p>
              <p className="text-xs mt-1">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
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

function getCatalogTypeLabel(type: CatalogType | string) {
  const typeStr = String(type).toLowerCase()
  const labels: Record<string, string> = {
    'module': 'Module',
    'library': 'Library',
    'workflow': 'Workflow',
    'project': 'Project',
    'chart': 'Chart',
    'package': 'Package',
    'container': 'Container',
  }
  return labels[typeStr] || 'Unknown'
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

function getPlatformIcon(platform?: Platform): string {
  switch (platform) {
    case Platform.EC2:
      return '⬛'
    case Platform.LAMBDA:
      return '⚡'
    case Platform.KUBERNETES:
      return '⚙️'
    case Platform.ECS:
      return '📋'
    case Platform.FARGATE:
      return '▫️'
    case Platform.CLOUD_RUN:
      return '▶️'
    case Platform.APP_SERVICE:
      return '🔲'
    case Platform.STEP_FUNCTIONS:
      return '🔄'
    case Platform.EVENT_BRIDGE:
      return '⚡'
    case Platform.RDS:
      return '💾'
    case Platform.DYNAMODB:
      return '🔶'
    case Platform.S3:
      return '📁'
    case Platform.CLOUDFRONT:
      return '🌐'
    case Platform.API_GATEWAY:
      return '🔌'
    case Platform.CLOUDWATCH:
      return '📊'
    case Platform.ON_PREMISE:
      return '🏭'
    case Platform.HYBRID:
      return '🔗'
    case Platform.MULTI_CLOUD:
      return '☁️'
    default:
      return '⚫'
  }
}

function getPlatformLabel(platform?: Platform): string {
  switch (platform) {
    case Platform.EC2:
      return 'EC2/VM'
    case Platform.LAMBDA:
      return 'Lambda'
    case Platform.KUBERNETES:
      return 'Kubernetes'
    case Platform.ECS:
      return 'ECS'
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
      return 'RDS'
    case Platform.DYNAMODB:
      return 'DynamoDB'
    case Platform.S3:
      return 'S3'
    case Platform.CLOUDFRONT:
      return 'CloudFront'
    case Platform.API_GATEWAY:
      return 'API Gateway'
    case Platform.CLOUDWATCH:
      return 'CloudWatch'
    case Platform.ON_PREMISE:
      return 'On-Premise'
    case Platform.HYBRID:
      return 'Hybrid'
    case Platform.MULTI_CLOUD:
      return 'Multi-Cloud'
    default:
      return 'Unknown'
  }
}

