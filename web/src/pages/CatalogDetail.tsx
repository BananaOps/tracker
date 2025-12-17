import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, type Catalog } from '../types/api'
import { ArrowLeft, Package, GitBranch, Activity, ExternalLink, Github } from 'lucide-react'
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
import { useMemo } from 'react'

export default function CatalogDetail() {
  const { serviceName } = useParams<{ serviceName: string }>()
  const navigate = useNavigate()

  const { data: allCatalogs } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const service = useMemo(() => {
    return allCatalogs?.catalogs.find(c => c.name === serviceName)
  }, [allCatalogs, serviceName])

  // Build dependency graph
  const { nodes, edges } = useMemo(() => {
    if (!service || !allCatalogs) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []
    const catalogMap = new Map(allCatalogs.catalogs.map(c => [c.name, c]))

    // Center node (current service)
    nodes.push({
      id: service.name,
      data: { 
        label: service.name,
        sla: service.sla?.level,
        isCurrent: true
      },
      position: { x: 400, y: 300 },
      type: 'default',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '3px solid #fff',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 0 30px rgba(102, 126, 234, 0.6), 0 0 60px rgba(118, 75, 162, 0.4)',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    // Dependencies In (upstream - services we depend on)
    service.dependenciesIn?.forEach((depName, index) => {
      const dep = catalogMap.get(depName)
      const slaColor = dep?.sla ? getSLABorderColor(dep.sla.level) : '#94a3b8'
      
      nodes.push({
        id: depName,
        data: { 
          label: depName,
          sla: dep?.sla?.level,
          type: 'uam'
        },
        position: { x: 50, y: 100 + index * 120 },
        type: 'default',
        style: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          border: `2px solid ${slaColor}`,
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      edges.push({
        id: `${depName}-${service.name}`,
        source: depName,
        target: service.name,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#64748b',
        },
      })
    })

    // Dependencies Out (downstream - services that depend on us)
    service.dependenciesOut?.forEach((depName, index) => {
      const dep = catalogMap.get(depName)
      const slaColor = dep?.sla ? getSLABorderColor(dep.sla.level) : '#94a3b8'
      
      nodes.push({
        id: depName,
        data: { 
          label: depName,
          sla: dep?.sla?.level,
          type: 'downstream'
        },
        position: { x: 750, y: 100 + index * 120 },
        type: 'default',
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: `2px solid ${slaColor}`,
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      edges.push({
        id: `${service.name}-${depName}`,
        source: service.name,
        target: depName,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#64748b',
        },
      })
    })

    return { nodes, edges }
  }, [service, allCatalogs])

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Service not found</p>
        <button onClick={() => navigate('/catalog')} className="mt-4 btn-primary">
          Back to Catalog
        </button>
      </div>
    )
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
              <Package className="w-8 h-8" />
              <span>{service.name}</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {service.description || 'No description'}
            </p>
          </div>
        </div>
        <Link to="/catalog/dependencies" className="btn-primary flex items-center space-x-2">
          <GitBranch className="w-4 h-4" />
          <span>View All Dependencies</span>
        </Link>
      </div>

      {/* Service Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* SLA Card */}
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
               borderTop: `4px solid ${getSLAColor(service.sla?.level)}`,
               boxShadow: `0 0 20px ${getSLAColor(service.sla?.level)}40`
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
               style={{ backgroundColor: getSLAColor(service.sla?.level) }} />
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: getSLAColor(service.sla?.level) }}>
            {getSLALabel(service.sla?.level)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            SLA Level
          </div>
          {service.sla?.uptimePercentage && (
            <div className="text-xs text-gray-400 mt-2">
              Target: {service.sla.uptimePercentage}% uptime
            </div>
          )}
        </div>

        {/* Dependencies In */}
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%)',
               borderTop: '4px solid #3b82f6',
               boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <div className="flex items-center justify-between mb-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {service.dependenciesIn?.length || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Upstream Dependencies
          </div>
        </div>

        {/* Dependencies Out */}
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
               borderTop: '4px solid #10b981',
               boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="flex items-center justify-between mb-2">
            <GitBranch className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {service.dependenciesOut?.length || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Downstream Dependencies
          </div>
        </div>

        {/* Version */}
        <div className="card min-h-[120px] relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
             style={{
               background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
               borderTop: '4px solid #a855f7',
               boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
             }}>
          <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {service.version}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Version
          </div>
        </div>
      </div>

      {/* Dependency Graph */}
      <div className="card p-0 overflow-hidden" style={{ height: '600px' }}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Dependency Graph
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
            Upstream (we depend on)
            <span className="inline-block w-3 h-3 bg-green-500 rounded ml-4 mr-2"></span>
            Downstream (depends on us)
          </p>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Service Information
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.languages}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.owner}</dd>
            </div>
            {service.repository && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Repository</dt>
                <dd className="mt-1">
                  <a href={service.repository} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1">
                    <Github className="w-4 h-4" />
                    <span>View on GitHub</span>
                  </a>
                </dd>
              </div>
            )}
            {service.link && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Documentation</dt>
                <dd className="mt-1">
                  <a href={service.link} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>View Documentation</span>
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* SLA Details */}
        {service.sla && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              SLA Details
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Level</dt>
                <dd className="mt-1">
                  <span className="px-3 py-1 text-sm font-medium rounded-full"
                        style={{
                          backgroundColor: `${getSLAColor(service.sla.level)}20`,
                          color: getSLAColor(service.sla.level)
                        }}>
                    {getSLALabel(service.sla.level)}
                  </span>
                </dd>
              </div>
              {service.sla.uptimePercentage && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Uptime Target</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.sla.uptimePercentage}%</dd>
                </div>
              )}
              {service.sla.responseTimeMs && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Response Time Target</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.sla.responseTimeMs}ms</dd>
                </div>
              )}
              {service.sla.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{service.sla.description}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Dependencies Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upstream Dependencies */}
        {service.dependenciesIn && service.dependenciesIn.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-blue-500" />
              <span>Upstream Dependencies</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Services that {service.name} depends on
            </p>
            <ul className="space-y-2">
              {service.dependenciesIn.map(dep => (
                <li key={dep}>
                  <Link
                    to={`/catalog/${dep}`}
                    className="block p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{dep}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Downstream Dependencies */}
        {service.dependenciesOut && service.dependenciesOut.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-green-500" />
              <span>Downstream Dependencies</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Services that depend on {service.name}
            </p>
            <ul className="space-y-2">
              {service.dependenciesOut.map(dep => (
                <li key={dep}>
                  <Link
                    to={`/catalog/${dep}`}
                    className="block p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">{dep}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
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

function getSLABorderColor(level?: SLALevel): string {
  return getSLAColor(level)
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

