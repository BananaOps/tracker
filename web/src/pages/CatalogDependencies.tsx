import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel } from '../types/api'
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
  }, [allCatalogs, searchQuery, selectedSLA])

  const toggleSLAFilter = (level: string) => {
    if (selectedSLA.includes(level)) {
      setSelectedSLA(selectedSLA.filter(l => l !== level))
    } else {
      setSelectedSLA([...selectedSLA, level])
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSLA([])
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

          {/* SLA Filters */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SLA Level:</span>
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

            {(searchQuery || selectedSLA.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1 font-medium"
              >
                <X className="w-4 h-4" />
                <span>Clear Filters</span>
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

