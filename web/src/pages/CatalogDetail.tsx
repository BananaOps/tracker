import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, CatalogType, Language, Platform, type Catalog } from '../types/api'
import { ArrowLeft, Package, GitBranch, Activity, ExternalLink, Github, Code, Server, Edit, Trash2, AlertTriangle, X } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faJava, 
  faPython, 
  faPhp, 
  faJs, 
  faDocker, 
  faRust,
  faGolang
} from '@fortawesome/free-brands-svg-icons'
import { 
  faCode, 
  faFileCode, 
  faCube 
} from '@fortawesome/free-solid-svg-icons'
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

export default function CatalogDetail() {
  const { serviceName } = useParams<{ serviceName: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data: allCatalogs } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => catalogApi.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/catalog')
    },
  })

  const service = useMemo(() => {
    return allCatalogs?.catalogs.find(c => c.name === serviceName)
  }, [allCatalogs, serviceName])

  const handleEdit = () => {
    navigate(`/catalog/edit/${serviceName}`)
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(serviceName!)
    setShowDeleteModal(false)
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
  }

  // Build dependency graph
  const { nodes, edges } = useMemo(() => {
    if (!service || !allCatalogs) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []
    const catalogMap = new Map(allCatalogs.catalogs.map(c => [c.name, c]))

    // Center node (current service)
    const currentPlatformColor = service.platform ? getPlatformColor(service.platform) : '#667eea'
    const currentPlatformIcon = service.platform ? getPlatformIcon(service.platform) : '📦'
    
    nodes.push({
      id: service.name,
      data: { 
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{currentPlatformIcon}</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{service.name}</div>
            {service.platform && (
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                {getPlatformLabel(service.platform)}
              </div>
            )}
          </div>
        ),
        sla: service.sla?.level,
        isCurrent: true
      },
      position: { x: 400, y: 300 },
      type: 'default',
      style: {
        background: `linear-gradient(135deg, ${currentPlatformColor} 0%, ${currentPlatformColor}dd 100%)`,
        color: 'white',
        border: '3px solid #fff',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: `0 0 30px ${currentPlatformColor}60, 0 0 60px ${currentPlatformColor}40`,
        minWidth: '120px',
        minHeight: '80px',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    // Dependencies In (upstream - services we depend on)
    service.dependenciesIn?.forEach((depName, index) => {
      const dep = catalogMap.get(depName)
      const slaColor = dep?.sla ? getSLABorderColor(dep.sla.level) : '#94a3b8'
      const platformColor = dep?.platform ? getPlatformColor(dep.platform) : '#3b82f6'
      const platformIcon = dep?.platform ? getPlatformIcon(dep.platform) : '📦'
      
      nodes.push({
        id: depName,
        data: { 
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{platformIcon}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{depName}</div>
              {dep?.platform && (
                <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '1px' }}>
                  {getPlatformLabel(dep.platform)}
                </div>
              )}
            </div>
          ),
          sla: dep?.sla?.level,
          type: 'upstream'
        },
        position: { x: 50, y: 100 + index * 120 },
        type: 'default',
        style: {
          background: `linear-gradient(135deg, ${platformColor} 0%, ${platformColor}dd 100%)`,
          color: 'white',
          border: `2px solid ${slaColor}`,
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          boxShadow: `0 0 20px ${platformColor}40`,
          minWidth: '100px',
          minHeight: '70px',
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
      const platformColor = dep?.platform ? getPlatformColor(dep.platform) : '#10b981'
      const platformIcon = dep?.platform ? getPlatformIcon(dep.platform) : '📦'
      
      nodes.push({
        id: depName,
        data: { 
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{platformIcon}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{depName}</div>
              {dep?.platform && (
                <div style={{ fontSize: '8px', opacity: 0.8, marginTop: '1px' }}>
                  {getPlatformLabel(dep.platform)}
                </div>
              )}
            </div>
          ),
          sla: dep?.sla?.level,
          type: 'downstream'
        },
        position: { x: 750, y: 100 + index * 120 },
        type: 'default',
        style: {
          background: `linear-gradient(135deg, ${platformColor} 0%, ${platformColor}dd 100%)`,
          color: 'white',
          border: `2px solid ${slaColor}`,
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          boxShadow: `0 0 20px ${platformColor}40`,
          minWidth: '100px',
          minHeight: '70px',
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
        <div className="flex items-center space-x-3">
          <Link to="/catalog/dependencies" className="btn-secondary flex items-center space-x-2">
            <GitBranch className="w-4 h-4" />
            <span>View All Dependencies</span>
          </Link>
          <button
            onClick={handleEdit}
            className="btn-primary flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete service"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
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
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
              Upstream (we depend on)
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
              Downstream (depends on us)
            </div>
            <div className="flex items-center">
              <span className="text-base mr-1">🖥️⚡☸️</span>
              Platform icons show deployment type
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 border-2 border-red-500 rounded mr-2"></span>
              Border color indicates SLA level
            </div>
          </div>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Service Information</span>
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Type</dt>
              <dd>
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Code className="w-4 h-4 mr-2" />
                  {getCatalogTypeLabel(service.type)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Primary Language</dt>
              <dd>
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 space-x-2">
                  {getLanguageIcon(service.languages)}
                  <span>{getLanguageLabel(service.languages)}</span>
                </span>
              </dd>
            </div>
            {service.platform && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Deployment Platform</dt>
                <dd>
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Server className="w-4 h-4 mr-2" />
                    {getPlatformLabel(service.platform)}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Owner</dt>
              <dd>
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {service.owner}
                </span>
              </dd>
            </div>
            {service.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {service.description}
                </dd>
              </div>
            )}
            {service.repository && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Repository</dt>
                <dd>
                  <a href={service.repository} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 transition-colors space-x-2 border border-gray-300 dark:border-gray-600">
                    <Github className="w-4 h-4" />
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            )}
            {service.link && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Documentation</dt>
                <dd>
                  <a href={service.link} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 transition-colors space-x-2 border border-blue-300 dark:border-blue-400">
                    <ExternalLink className="w-4 h-4" />
                    <span>View Documentation</span>
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* SLA Details */}
        {service.sla ? (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>SLA Details</span>
            </h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Level</dt>
                <dd>
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full"
                        style={{
                          backgroundColor: `${getSLAColor(service.sla.level)}20`,
                          color: getSLAColor(service.sla.level)
                        }}>
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getSLAColor(service.sla.level) }} />
                    {getSLALabel(service.sla.level)}
                  </span>
                </dd>
              </div>
              
              {/* SLA Metrics Grid - Only show if there are metrics */}
              {(service.sla.uptimePercentage || service.sla.responseTimeMs) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {service.sla.uptimePercentage && (
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: getSLAColor(service.sla.level) }}>
                        {service.sla.uptimePercentage}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Uptime Target
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {calculateDowntime(service.sla.uptimePercentage)} downtime/month
                      </div>
                    </div>
                  )}
                  {service.sla.responseTimeMs && (
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: getSLAColor(service.sla.level) }}>
                        {service.sla.responseTimeMs}ms
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Response Time Target
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {service.sla.responseTimeMs < 100 ? 'Excellent' : 
                         service.sla.responseTimeMs < 500 ? 'Good' : 
                         service.sla.responseTimeMs < 1000 ? 'Acceptable' : 'Needs Improvement'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {service.sla.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    {service.sla.description}
                  </dd>
                </div>
              )}

              {/* SLA Level Information */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                  SLA Level Information
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  {getSLADescription(service.sla.level)}
                </div>
              </div>
            </dl>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>SLA Details</span>
            </h3>
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No SLA defined for this service
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Consider defining SLA targets for better service monitoring
              </p>
            </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Delete Service
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete the service <span className="font-semibold text-gray-900 dark:text-gray-100">"{service.name}"</span>?
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium mb-1">This will permanently delete:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Service configuration and metadata</li>
                        <li>SLA settings and targets</li>
                        <li>Dependency relationships</li>
                        <li>All associated data</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Service</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
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

function getLanguageLabel(lang: Language | string) {
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
  return labels[langStr] || 'Unknown'
}

function getLanguageIcon(lang: Language | string) {
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

function getSLADescription(level?: SLALevel): string {
  switch (level) {
    case SLALevel.CRITICAL:
      return 'Mission-critical service requiring maximum availability (99.99% uptime). Immediate response to incidents required.'
    case SLALevel.HIGH:
      return 'High-priority service with strict availability requirements (99.9% uptime). Fast incident response expected.'
    case SLALevel.MEDIUM:
      return 'Standard service with good availability targets (99.5% uptime). Regular monitoring and maintenance.'
    case SLALevel.LOW:
      return 'Basic service with minimal availability requirements (99% uptime). Best-effort support.'
    default:
      return 'No SLA level defined for this service.'
  }
}

function calculateDowntime(uptimePercentage: number): string {
  const downtimePercentage = 100 - uptimePercentage
  const monthlyMinutes = 30 * 24 * 60 // 30 days * 24 hours * 60 minutes
  const downtimeMinutes = (downtimePercentage / 100) * monthlyMinutes
  
  if (downtimeMinutes < 1) {
    return `${Math.round(downtimeMinutes * 60)}s`
  } else if (downtimeMinutes < 60) {
    return `${Math.round(downtimeMinutes)}min`
  } else {
    const hours = Math.floor(downtimeMinutes / 60)
    const minutes = Math.round(downtimeMinutes % 60)
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }
}

function getPlatformColor(platform?: Platform): string {
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

function getPlatformIcon(platform?: Platform): string {
  switch (platform) {
    case Platform.EC2:
      return '🖥️'
    case Platform.LAMBDA:
      return '⚡'
    case Platform.KUBERNETES:
      return '☸️'
    case Platform.ECS:
      return '📦'
    case Platform.FARGATE:
      return '☁️'
    case Platform.CLOUD_RUN:
      return '🏃'
    case Platform.APP_SERVICE:
      return '🌐'
    case Platform.STEP_FUNCTIONS:
      return '🔄'
    case Platform.EVENT_BRIDGE:
      return '🌉'
    case Platform.RDS:
      return '🗃️'
    case Platform.DYNAMODB:
      return '📊'
    case Platform.S3:
      return '🪣'
    case Platform.CLOUDFRONT:
      return '🚀'
    case Platform.API_GATEWAY:
      return '🚪'
    case Platform.CLOUDWATCH:
      return '👁️'
    case Platform.ON_PREMISE:
      return '🏢'
    case Platform.HYBRID:
      return '🔗'
    case Platform.MULTI_CLOUD:
      return '☁️'
    default:
      return '❓'
  }
}



