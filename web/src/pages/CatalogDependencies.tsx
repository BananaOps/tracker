import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, CatalogType, Platform, type Catalog } from '../types/api'
import { ArrowLeft, GitBranch, Search, X } from 'lucide-react'
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  MarkerType,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useMemo, useState } from 'react'

export default function CatalogDependencies() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSLA, setSelectedSLA] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const { data: allCatalogs, isLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  // Build complete dependency graph
  const { nodes, edges } = useMemo(() => {
    if (!allCatalogs) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []
    const edgeSet = new Set<string>()

    // Filter catalogs
    const filteredCatalogs = allCatalogs.catalogs.filter(catalog => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!catalog.name.toLowerCase().includes(query)) return false
      }

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

    // Create nodes in a circular layout
    const centerX = 500
    const centerY = 400
    const radius = 300
    const angleStep = (2 * Math.PI) / filteredCatalogs.length

    filteredCatalogs.forEach((catalog, index) => {
      const angle = index * angleStep
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      const slaColor = catalog.sla ? getSLAColor(catalog.sla.level) : '#94a3b8'

      nodes.push({
        id: catalog.name,
        data: { 
          label: catalog.name,
          sla: catalog.sla?.level,
        },
        position: { x, y },
        type: 'default',
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: `3px solid ${slaColor}`,
          borderRadius: '10px',
          padding: '12px',
          fontSize: '11px',
          fontWeight: '600',
          boxShadow: `0 0 20px ${slaColor}40`,
          minWidth: '100px',
          textAlign: 'center',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // Create edges for dependencies
      catalog.dependenciesIn?.forEach(depName => {
        const edgeId = `${depName}-${catalog.name}`
        if (!edgeSet.has(edgeId) && filteredCatalogs.some(c => c.name === depName)) {
          edgeSet.add(edgeId)
          edges.push({
            id: edgeId,
            source: depName,
            target: catalog.name,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
            },
          })
        }
      })
    })

    return { nodes, edges }
  }, [allCatalogs, searchQuery, selectedSLA, selectedTypes, selectedPlatforms])

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

      {/* Graph */}
      <div className="card p-0 overflow-hidden" style={{ height: '700px' }}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Dependency Graph
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing {nodes.length} services with {edges.length} dependencies
          </p>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
          onNodeClick={(_, node) => navigate(`/catalog/${node.id}`)}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
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

