import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, CatalogType, Platform, type Catalog } from '../types/api'
import { ArrowLeft, GitBranch, Search, X, Grid, List, Maximize2, ZoomIn, ZoomOut, Filter, Server, Zap, Activity, Package } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDocker } from '@fortawesome/free-brands-svg-icons'
import {
  ReactFlow,
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  MarkerType,
  Position,
  NodeProps,
  Handle
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useMemo, useState, useCallback } from 'react'
import { KubernetesIcon } from '../components/icons/KubernetesIcon'

type LayoutType = 'circular' | 'hierarchical' | 'force' | 'grid'
type ViewMode = 'graph' | 'list'

// Custom Node Component for Dependency Graph
function DependencyNode({ data }: NodeProps) {
  const { name, platform, slaLevel, depsCount } = data
  const slaColor = getSLAColor(slaLevel)
  const platformColor = getPlatformColorHex(platform)

  return (
    <div
      style={{
        background: 'rgb(var(--hud-surface))',
        border: `2px solid ${slaColor}`,
        borderTopWidth: '4px',
        borderTopColor: platformColor,
        borderRadius: '8px',
        minWidth: '120px',
        minHeight: '80px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#6366f1',
          width: 6,
          height: 6,
          border: '2px solid rgb(var(--hud-surface))',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#10b981',
          width: 6,
          height: 6,
          border: '2px solid rgb(var(--hud-surface))',
        }}
      />

      <div className="p-2 flex flex-col items-center justify-center h-full">
        <div
          className="mb-1 flex items-center justify-center w-8 h-8 rounded-full"
          style={{ backgroundColor: `${platformColor}20` }}
        >
          {getPlatformIconComponent(platform, 'w-4 h-4')}
        </div>

        <div
          className="text-[10px] font-bold text-center mb-1 truncate max-w-full px-1"
          style={{ color: 'rgb(var(--hud-on-surface))' }}
        >
          {name}
        </div>

        {depsCount > 0 && (
          <div
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgb(var(--hud-surface-high))',
              color: 'rgb(var(--hud-on-surface-var))',
            }}
          >
            {depsCount} deps
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get platform icon as React component (same as CatalogDetail)
function getPlatformIconComponent(platform?: Platform, className: string = 'w-4 h-4') {
  const iconColor = getPlatformColorHex(platform)

  switch (platform) {
    case Platform.KUBERNETES:
      return (
        <div style={{ color: iconColor }}>
          <KubernetesIcon className={className} />
        </div>
      )
    case Platform.LAMBDA:
      return <Zap className={className} style={{ color: iconColor }} />
    case Platform.EC2:
      return <Server className={className} style={{ color: iconColor }} />
    case Platform.ECS:
    case Platform.FARGATE:
      return <FontAwesomeIcon icon={faDocker} className={className} style={{ color: iconColor }} />
    case Platform.RDS:
    case Platform.DYNAMODB:
      return <Activity className={className} style={{ color: iconColor }} />
    case Platform.S3:
      return <Package className={className} style={{ color: iconColor }} />
    case Platform.API_GATEWAY:
      return <GitBranch className={className} style={{ color: iconColor }} />
    case Platform.CLOUD_RUN:
      return <Zap className={className} style={{ color: iconColor }} />
    case Platform.APP_SERVICE:
      return <Server className={className} style={{ color: iconColor }} />
    case Platform.STEP_FUNCTIONS:
      return <GitBranch className={className} style={{ color: iconColor }} />
    case Platform.EVENT_BRIDGE:
      return <Zap className={className} style={{ color: iconColor }} />
    case Platform.CLOUDFRONT:
      return <Activity className={className} style={{ color: iconColor }} />
    case Platform.CLOUDWATCH:
      return <Activity className={className} style={{ color: iconColor }} />
    case Platform.ON_PREMISE:
      return <Server className={className} style={{ color: iconColor }} />
    case Platform.HYBRID:
      return <GitBranch className={className} style={{ color: iconColor }} />
    case Platform.MULTI_CLOUD:
      return <Activity className={className} style={{ color: iconColor }} />
    default:
      return <Server className={className} style={{ color: iconColor }} />
  }
}

// Helper function for filter badges (smaller icons, no color override)
function getPlatformIconComponentForFilter(platform?: Platform) {
  const className = 'w-3 h-3'

  switch (platform) {
    case Platform.KUBERNETES:
      return <KubernetesIcon className={className} />
    case Platform.LAMBDA:
      return <Zap className={className} />
    case Platform.EC2:
      return <Server className={className} />
    case Platform.ECS:
    case Platform.FARGATE:
      return <FontAwesomeIcon icon={faDocker} className={className} />
    case Platform.RDS:
    case Platform.DYNAMODB:
      return <Activity className={className} />
    case Platform.S3:
      return <Package className={className} />
    case Platform.API_GATEWAY:
      return <GitBranch className={className} />
    case Platform.CLOUD_RUN:
      return <Zap className={className} />
    case Platform.APP_SERVICE:
      return <Server className={className} />
    case Platform.STEP_FUNCTIONS:
      return <GitBranch className={className} />
    case Platform.EVENT_BRIDGE:
      return <Zap className={className} />
    case Platform.CLOUDFRONT:
      return <Activity className={className} />
    case Platform.CLOUDWATCH:
      return <Activity className={className} />
    case Platform.ON_PREMISE:
      return <Server className={className} />
    case Platform.HYBRID:
      return <GitBranch className={className} />
    case Platform.MULTI_CLOUD:
      return <Activity className={className} />
    default:
      return <Server className={className} />
  }
}

export default function CatalogDependencies() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSLA, setSelectedSLA] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchical')
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [nodeSize, setNodeSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // ── Design tokens ─────────────────────────────────────────────────────────
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg:           'rgb(var(--hud-bg))',
    surface:      'rgb(var(--hud-surface))',
    surfaceLow:   'rgb(var(--hud-surface-low))',
    surfaceHigh:  'rgb(var(--hud-surface-high))',
    primary:      'rgb(var(--hud-primary))',
    primaryDim:   'rgb(var(--hud-primary-dim))',
    tertiary:     'rgb(var(--hud-tertiary))',
    error:        'rgb(var(--hud-error))',
    success:      'rgb(var(--hud-success))',
    onSurface:    'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outlineVar:   'rgb(var(--hud-outline-var))',
  }

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
        if (catalog.name.toLowerCase().includes(query)) return true
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

      const hasNoDeps = dependencyCount === 0
      const groupIndex = hasNoDeps
        ? servicesWithoutDeps.findIndex(c => c.name === catalog.name)
        : servicesWithDeps.findIndex(c => c.name === catalog.name)

      switch (layoutType) {
        case 'circular':
          if (hasNoDeps) {
            const innerRadius = 250
            const innerAngleStep = (2 * Math.PI) / servicesWithoutDeps.length
            const innerAngle = groupIndex * innerAngleStep
            return {
              x: 600 + innerRadius * Math.cos(innerAngle),
              y: 400 + innerRadius * Math.sin(innerAngle)
            }
          } else {
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
            const maxPerRow = 10
            const row = Math.floor(groupIndex / maxPerRow)
            const col = groupIndex % maxPerRow
            return {
              x: 100 + col * currentNodeSize.spacing,
              y: 100 + (row * 140)
            }
          } else {
            const level = Math.min(Math.floor(dependencyCount / 3) + 1, 5)
            const servicesAtLevel = servicesWithDeps.filter(c => {
              const deps = (c.dependenciesIn?.length || 0) + (c.dependenciesOut?.length || 0)
              return Math.min(Math.floor(deps / 3) + 1, 5) === level
            })

            const levelIndex = servicesAtLevel.findIndex(c => c.name === catalog.name)
            const maxPerLevel = Math.ceil(servicesAtLevel.length / Math.max(1, Math.ceil(servicesAtLevel.length / 8)))

            const row = Math.floor(levelIndex / maxPerLevel)
            const col = levelIndex % maxPerLevel

            const noDepsRows = Math.ceil(servicesWithoutDeps.length / 10)
            const offsetY = 300 + (noDepsRows * 140)

            return {
              x: 100 + col * currentNodeSize.spacing,
              y: offsetY + (level * 180) + (row * 140)
            }
          }

        case 'grid':
          if (hasNoDeps) {
            const maxCols = 10
            const gridRow = Math.floor(groupIndex / maxCols)
            const gridCol = groupIndex % maxCols
            return {
              x: 100 + gridCol * currentNodeSize.spacing,
              y: 100 + gridRow * (currentNodeSize.height + 40)
            }
          } else {
            const maxCols = 10
            const gridRow = Math.floor(groupIndex / maxCols)
            const gridCol = groupIndex % maxCols

            const noDepsRows = Math.ceil(servicesWithoutDeps.length / 10)
            const offsetY = 300 + (noDepsRows * (currentNodeSize.height + 40))

            return {
              x: 100 + gridCol * currentNodeSize.spacing,
              y: offsetY + gridRow * (currentNodeSize.height + 40)
            }
          }

        case 'force':
          if (hasNoDeps) {
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
        type: 'dependencyNode',
        data: {
          name: catalog.name,
          slaLevel: catalog.sla?.level,
          platform: catalog.platform,
          platformLabel: catalog.platform ? getPlatformLabel(catalog.platform) : undefined,
          depsCount: (catalog.dependenciesIn?.length || 0) + (catalog.dependenciesOut?.length || 0)
        },
        position,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // Create edges for dependencies - avoid crossing through no-dependency zone
      catalog.dependenciesIn?.forEach(depName => {
        const edgeId = `${depName}-${catalog.name}`
        if (!edgeSet.has(edgeId) && filteredCatalogs.some(c => c.name === depName)) {
          const sourceCatalog = filteredCatalogs.find(c => c.name === depName)
          const targetCatalog = catalog

          const sourceHasDeps = sourceCatalog && ((sourceCatalog.dependenciesIn?.length || 0) + (sourceCatalog.dependenciesOut?.length || 0)) > 0
          const targetHasDeps = (targetCatalog.dependenciesIn?.length || 0) + (targetCatalog.dependenciesOut?.length || 0) > 0

          if (sourceHasDeps && targetHasDeps) {
            edgeSet.add(edgeId)

            let edgeType = 'smoothstep'
            let edgeStyle = { stroke: '#64748b', strokeWidth: 2 }

            if (layoutType === 'hierarchical' || layoutType === 'grid') {
              edgeType = 'step'
              edgeStyle = { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5,5' }
            } else if (layoutType === 'force') {
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

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    dependencyNode: DependencyNode
  }), [])

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
    return (
      <div style={{ background: 'rgb(var(--hud-bg))', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <GitBranch className="w-8 h-8 animate-pulse" style={{ color: 'rgb(var(--hud-primary))' }} />
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-auto p-6 space-y-6" style={{ background: T.bg, color: T.onSurface }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/catalog')}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: T.surfaceHigh, color: T.onSurface, border: `1px solid ${a('outline-var', 0.2)}` }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <GitBranch className="w-8 h-8" style={{ color: T.primary }} />
              <span>Global Dependencies</span>
            </h2>
            <p className="mt-1 text-sm" style={{ color: T.onSurfaceVar }}>
              Complete view of all service dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Services', value: stats.total, color: T.primary, icon: <GitBranch className="w-5 h-5" /> },
          { label: 'With Dependencies', value: stats.withDeps, color: T.success, icon: <Activity className="w-5 h-5" /> },
          { label: 'Total Dependencies', value: stats.totalDeps, color: T.tertiary, icon: <Package className="w-5 h-5" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="relative p-6 rounded-xl overflow-hidden"
            style={{ background: T.surfaceLow, borderLeft: `2px solid ${color}` }}>
            <div className="absolute top-3 right-3 opacity-10 pointer-events-none">
              <div className="w-16 h-16 blur-xl rounded-full" style={{ background: color }} />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>{label}</p>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}</span>
              <span style={{ color }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-6 rounded-xl space-y-4" style={{ background: T.surface }}>
        {/* Layout and View Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4" style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Layout:</span>
            <div className="flex gap-2">
              {(['hierarchical', 'grid', 'circular', 'force'] as LayoutType[]).map(lt => (
                <button
                  key={lt}
                  onClick={() => setLayoutType(lt)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 flex items-center gap-1"
                  style={layoutType === lt
                    ? { background: T.primary, color: 'white' }
                    : { background: T.surfaceHigh, color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}` }
                  }
                >
                  {lt === 'grid' && <Grid className="w-3 h-3" />}
                  {lt.charAt(0).toUpperCase() + lt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Node Size:</span>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setNodeSize(size)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 flex items-center gap-1"
                  style={nodeSize === size
                    ? { background: T.primary, color: 'white' }
                    : { background: T.surfaceHigh, color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}` }
                  }
                >
                  {size === 'small' && <ZoomOut className="w-3 h-3" />}
                  {size === 'large' && <ZoomIn className="w-3 h-3" />}
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {([
              { mode: 'graph' as ViewMode, icon: <Maximize2 className="w-3 h-3" />, label: 'Graph' },
              { mode: 'list' as ViewMode, icon: <List className="w-3 h-3" />, label: 'List' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 flex items-center gap-1"
                style={viewMode === mode
                  ? { background: T.primary, color: 'white' }
                  : { background: T.surfaceHigh, color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}` }
                }
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.onSurfaceVar }} />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg text-sm focus:outline-none transition-all"
            style={{
              background: T.surfaceHigh,
              border: `1px solid ${a('outline-var', 0.3)}`,
              color: T.onSurface,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: T.onSurfaceVar }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Type Filters */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Type:</span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueTypes.map((type: string) => (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                    className="px-3 py-1 text-xs font-medium rounded-full transition-all hover:opacity-90"
                    style={selectedTypes.includes(type)
                      ? { background: T.primary, color: 'white' }
                      : { background: T.surfaceHigh, color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.3)}` }
                    }
                  >
                    {getCatalogTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Filters */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Platform:</span>
              <div className="flex flex-wrap gap-1.5">
                {uniquePlatforms.map((platform: string) => {
                  const platformColors = getPlatformColor(platform as Platform)
                  return (
                    <button
                      key={platform}
                      onClick={() => toggleFilter(platform, selectedPlatforms, setSelectedPlatforms)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 hover:opacity-90 ${
                        selectedPlatforms.includes(platform)
                          ? `${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText} ring-2 ring-offset-1 ring-gray-400`
                          : `${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText}`
                      }`}
                    >
                      <span className="flex items-center">
                        {getPlatformIconComponentForFilter(platform as Platform)}
                      </span>
                      <span>{getPlatformLabel(platform as Platform)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SLA Filters */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>SLA:</span>
              <div className="flex flex-wrap gap-1.5">
                {[SLALevel.CRITICAL, SLALevel.HIGH, SLALevel.MEDIUM, SLALevel.LOW].map(level => (
                  <button
                    key={level}
                    onClick={() => toggleSLAFilter(level)}
                    className="px-3 py-1 text-xs font-medium rounded-full transition-all hover:opacity-90"
                    style={{
                      background: selectedSLA.includes(level) ? getSLAColor(level) : `${getSLAColor(level)}25`,
                      color: selectedSLA.includes(level) ? 'white' : getSLAColor(level),
                      border: `1px solid ${getSLAColor(level)}50`,
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ color: T.error, background: a('error', 0.1), border: `1px solid ${a('error', 0.2)}` }}
            >
              <X className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 rounded-xl" style={{ background: T.surface }}>
        <h3 className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            { label: 'Critical SLA', level: SLALevel.CRITICAL },
            { label: 'High SLA', level: SLALevel.HIGH },
            { label: 'Medium SLA', level: SLALevel.MEDIUM },
            { label: 'Low SLA', level: SLALevel.LOW },
          ].map(({ label, level }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: getSLAColor(level) }} />
              <span style={{ color: T.onSurfaceVar }}>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 rounded" style={{ background: T.onSurfaceVar, opacity: 0.4 }} />
            <span style={{ color: T.onSurfaceVar }}>Dependency</span>
          </div>
        </div>
      </div>

      {/* Graph or List View */}
      {viewMode === 'graph' ? (
        <div className="rounded-xl overflow-hidden" style={{ background: T.surface, height: '700px' }}>
          <div className="p-4" style={{ background: T.surfaceHigh, borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Dependency Graph
                </h3>
                <p className="text-xs mt-0.5" style={{ color: T.onSurfaceVar }}>
                  Showing {nodes.length} services with {edges.length} dependencies
                </p>
              </div>
              {nodes.length > 50 && (
                <div
                  className="text-xs px-3 py-1 rounded-lg"
                  style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  ⚠️ Large dataset — Consider using List view for better performance
                </div>
              )}
            </div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            onNodeClick={(_, node) => navigate(`/catalog/${node.id}`)}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background color={a('outline-var', 0.5)} gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const slaLevel = n.data?.slaLevel
                return getSLAColor(slaLevel) + '60'
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.surface }}>
          <div className="p-4" style={{ background: T.surfaceHigh, borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
            <h3 className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Dependencies List View
            </h3>
            <p className="text-xs mt-0.5" style={{ color: T.onSurfaceVar }}>
              Showing {nodes.length} services with their dependencies
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: T.surfaceHigh, borderBottom: `1px solid ${a('outline-var', 0.15)}` }}>
                  {['Service', 'Type', 'SLA', 'Platform', 'Dependencies In', 'Dependencies Out', 'Total Deps'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: T.onSurfaceVar }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCatalogs?.catalogs
                  .filter(catalog => {
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
                    return bDeps - aDeps
                  })
                  .map((catalog) => {
                    const depsIn = catalog.dependenciesIn?.length || 0
                    const depsOut = catalog.dependenciesOut?.length || 0
                    const totalDeps = depsIn + depsOut
                    const slaColor = catalog.sla ? getSLAColor(catalog.sla.level) : '#94a3b8'
                    const platformColors = catalog.platform ? getPlatformColor(catalog.platform) : { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-900/30', darkText: 'dark:text-gray-300' }
                    const totalDepsColor = totalDeps === 0 ? T.onSurfaceVar : totalDeps < 3 ? '#22c55e' : totalDeps < 6 ? '#eab308' : '#ef4444'

                    return (
                      <tr
                        key={catalog.name}
                        className="cursor-pointer transition-colors"
                        onMouseEnter={() => setHoveredRow(catalog.name)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => navigate(`/catalog/${catalog.name}`)}
                        style={{
                          borderBottom: `1px solid ${a('outline-var', 0.08)}`,
                          background: hoveredRow === catalog.name ? T.surfaceLow : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slaColor }} />
                            <div>
                              <div className="text-sm font-medium">{catalog.name}</div>
                              {catalog.description && (
                                <div className="text-xs truncate max-w-xs" style={{ color: T.onSurfaceVar }}>
                                  {catalog.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: a('outline-var', 0.1), color: T.onSurfaceVar }}>
                            {getCatalogTypeLabel(catalog.type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ background: slaColor }}
                          >
                            {getSLALabel(catalog.sla?.level)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {catalog.platform ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${platformColors.bg} ${platformColors.text} ${platformColors.darkBg} ${platformColors.darkText}`}>
                              <span>{getPlatformIcon(catalog.platform)}</span>
                              <span>{getPlatformLabel(catalog.platform)}</span>
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: T.onSurfaceVar }}>-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{depsIn}</span>
                            {depsIn > 0 && catalog.dependenciesIn && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {catalog.dependenciesIn.slice(0, 3).map((dep, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                                    style={{ background: a('primary', 0.1), color: T.primary }}
                                  >
                                    {dep}
                                  </span>
                                ))}
                                {catalog.dependenciesIn.length > 3 && (
                                  <span className="text-xs" style={{ color: T.onSurfaceVar }}>
                                    +{catalog.dependenciesIn.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{depsOut}</span>
                            {depsOut > 0 && catalog.dependenciesOut && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {catalog.dependenciesOut.slice(0, 3).map((dep, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                                    style={{ background: a('success', 0.1), color: T.success }}
                                  >
                                    {dep}
                                  </span>
                                ))}
                                {catalog.dependenciesOut.length > 3 && (
                                  <span className="text-xs" style={{ color: T.onSurfaceVar }}>
                                    +{catalog.dependenciesOut.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: totalDepsColor, fontFamily: "'JetBrains Mono', monospace" }}>
                              {totalDeps}
                            </span>
                            {totalDeps > 0 && (
                              <div className="w-16 rounded-full h-1.5" style={{ background: a('outline-var', 0.15) }}>
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.min((totalDeps / 10) * 100, 100)}%`,
                                    background: totalDepsColor,
                                  }}
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
            <div className="flex flex-col items-center justify-center py-16">
              <GitBranch className="w-12 h-12 mb-3 opacity-20" style={{ color: T.onSurfaceVar }} />
              <p className="text-sm font-medium">No services found</p>
              <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      )}

      {/* Decorative glow */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: a('primary', 0.04) }} />
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

function getPlatformColorHex(platform?: Platform): string {
  switch (platform) {
    case Platform.EC2:
      return '#f97316' // orange
    case Platform.LAMBDA:
      return '#eab308' // yellow
    case Platform.KUBERNETES:
      return '#3b82f6' // blue
    case Platform.ECS:
      return '#6366f1' // indigo
    case Platform.FARGATE:
      return '#a855f7' // purple
    case Platform.CLOUD_RUN:
      return '#10b981' // green
    case Platform.APP_SERVICE:
      return '#06b6d4' // cyan
    case Platform.STEP_FUNCTIONS:
      return '#f59e0b' // amber
    case Platform.EVENT_BRIDGE:
      return '#ec4899' // pink
    case Platform.RDS:
      return '#059669' // emerald
    case Platform.DYNAMODB:
      return '#0d9488' // teal
    case Platform.S3:
      return '#dc2626' // red
    case Platform.CLOUDFRONT:
      return '#7c3aed' // violet
    case Platform.API_GATEWAY:
      return '#65a30d' // lime
    case Platform.CLOUDWATCH:
      return '#0ea5e9' // sky
    case Platform.ON_PREMISE:
      return '#6b7280' // gray
    case Platform.HYBRID:
      return '#64748b' // slate
    case Platform.MULTI_CLOUD:
      return '#f43f5e' // rose
    default:
      return '#94a3b8' // gray-400
  }
}
