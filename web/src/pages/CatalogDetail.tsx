import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { catalogApi } from '../lib/api'
import { SLALevel, CatalogType, Language, Platform, CommunicationType, DashboardType, type Catalog, type UsedDeliverable, type VulnerabilitySummary, type InfrastructureType } from '../types/api'
import { ArrowLeft, Package, GitBranch, Activity, ExternalLink, Github, Code, Server, Edit, Trash2, AlertTriangle, X, Mail, Zap, Plus, Database, HardDrive, Network, MessageSquare, Shield, Cloud, Check } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faJava, 
  faPython, 
  faPhp, 
  faJs, 
  faDocker, 
  faRust,
  faGolang,
  faSlack,
  faDiscord,
  faTelegram,
  faMicrosoft
} from '@fortawesome/free-brands-svg-icons'
import { 
  faCode, 
  faFileCode, 
  faCube,
  faComments
} from '@fortawesome/free-solid-svg-icons'
import { KubernetesIcon } from '../components/icons/KubernetesIcon'
import { KotlinIcon } from '../components/icons/KotlinIcon'
import { TerraformIcon } from '../components/icons/TerraformIcon'
import { SlackIcon } from '../components/icons/SlackIcon'
import { GrafanaIcon } from '../components/icons/GrafanaIcon'
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
import { useMemo, useState, useCallback, useRef, DragEvent } from 'react'
import { Button } from '../components/ui/button'
import DeliverableVersions from '../components/VersionManager'
import UsedDeliverablesManager from '../components/UsedDeliverablesManager'
import VulnerabilityManager from '../components/VulnerabilityManager'
import InfrastructureResourceManager from '../components/InfrastructureResourceManager'
import type { InfrastructureResource } from '../types/api'

// AWS Official Colors
// Database: #C925D1 (violet/rose)
// Storage: #7AA116 (vert)
// Network: #8C4FFF (violet)
// Compute: #ED7100 (orange)

// Quick add infrastructure resource types with AWS icon paths
const QUICK_ADD_RESOURCES = [
  // Databases - AWS Color: #C925D1 (violet/rose)
  { type: 'database_postgresql', label: 'PostgreSQL', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-RDS_32.svg' },
  { type: 'database_mysql', label: 'MySQL', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-RDS_32.svg' },
  { type: 'database_mongodb', label: 'MongoDB', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-DynamoDB_32.svg' },
  { type: 'database_redis', label: 'Redis', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-ElastiCache_32.svg' },
  { type: 'database_rds', label: 'RDS', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-RDS_32.svg' },
  { type: 'database_dynamodb', label: 'DynamoDB', icon: Database, color: '#C925D1', awsIcon: '/aws_icons/Arch_Amazon-DynamoDB_32.svg' },
  // Storage - AWS Color: #7AA116 (vert)
  { type: 'storage_s3', label: 'S3', icon: HardDrive, color: '#7AA116', awsIcon: '/aws_icons/Arch_Amazon-Simple-Storage-Service_32.svg' },
  { type: 'storage_efs', label: 'EFS', icon: HardDrive, color: '#7AA116', awsIcon: '/aws_icons/Arch_Amazon-EFS_32.svg' },
  { type: 'storage_ebs', label: 'EBS', icon: HardDrive, color: '#7AA116', awsIcon: '/aws_icons/Arch_Amazon-Elastic-Block-Store_32.svg' },
  // Network - AWS Color: #8C4FFF (violet)
  { type: 'network_load_balancer', label: 'Load Balancer', icon: Network, color: '#8C4FFF', awsIcon: '/aws_icons/Arch_Elastic-Load-Balancing_32.svg' },
  { type: 'network_api_gateway', label: 'API Gateway', icon: Network, color: '#8C4FFF', awsIcon: '/aws_icons/Arch_Amazon-Route-53_32.svg' },
  { type: 'network_cloudfront', label: 'CloudFront', icon: Network, color: '#8C4FFF', awsIcon: '/aws_icons/Arch_Amazon-CloudFront_32.svg' },
  { type: 'network_route53', label: 'Route 53', icon: Network, color: '#8C4FFF', awsIcon: '/aws_icons/Arch_Amazon-Route-53_32.svg' },
  // Compute - AWS Color: #ED7100 (orange)
  { type: 'compute_ecs', label: 'ECS', icon: Server, color: '#ED7100', awsIcon: '/aws_icons/Arch_Amazon-Elastic-Container-Service_32.svg' },
  { type: 'compute_eks', label: 'EKS', icon: Server, color: '#ED7100', awsIcon: '/aws_icons/Arch_Amazon-Elastic-Kubernetes-Service_32.svg' },
  { type: 'compute_fargate', label: 'Fargate', icon: Server, color: '#ED7100', awsIcon: '/aws_icons/Arch_AWS-Fargate_32.svg' },
  { type: 'compute_ecr', label: 'ECR', icon: Server, color: '#ED7100', awsIcon: '/aws_icons/Arch_Amazon-Elastic-Container-Registry_32.svg' },
  // Messaging - AWS Color: #E7157B (rose)
  { type: 'messaging_sqs', label: 'SQS', icon: MessageSquare, color: '#E7157B', awsIcon: null },
  { type: 'messaging_kafka', label: 'Kafka', icon: MessageSquare, color: '#E7157B', awsIcon: null },
  // Security - AWS Color: #DD344C (rouge)
  { type: 'security_secrets_manager', label: 'Secrets Manager', icon: Shield, color: '#DD344C', awsIcon: null },
  { type: 'security_kms', label: 'KMS', icon: Shield, color: '#DD344C', awsIcon: null },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', awsIcon: null },
] as const

// Helper function to render resource icon (AWS or fallback)
function renderResourceIcon(resource: typeof QUICK_ADD_RESOURCES[number], provider: string, className: string = 'w-4 h-4') {
  if (provider === 'AWS' && resource.awsIcon) {
    return <img src={resource.awsIcon} alt={resource.label} className={className} style={{ width: '20px', height: '20px' }} />
  }
  const IconComponent = resource.icon
  return <IconComponent className={className} style={{ color: resource.color }} />
}

// Custom Node Component for Infrastructure Resources
function InfrastructureNode({ data }: NodeProps) {
  const { name, type, provider, description } = data
  const color = getInfrastructureColor(type)
  
  return (
    <div 
      className="min-w-[140px] min-h-[85px] bg-white dark:bg-gray-800 border-2 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
      style={{ 
        borderColor: color,
        borderTopWidth: '4px',
        borderTopColor: color
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: color,
          width: 8,
          height: 8,
          border: '2px solid white'
        }}
      />
      
      <div className="p-3 flex flex-col items-center justify-center h-full">
        <div className="mb-2 flex items-center justify-center w-10 h-10 rounded-full" 
             style={{ backgroundColor: `${color}20` }}>
          {getInfrastructureIconComponent(type, 'w-5 h-5', color, provider)}
        </div>
        
        <div className="text-xs font-bold text-gray-900 dark:text-gray-100 text-center mb-1 truncate max-w-full px-1">
          {name}
        </div>
        
        {provider && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center truncate max-w-full px-1">
            {provider}
          </div>
        )}
        
        <div className="mt-1 px-2 py-0.5 text-[9px] font-medium rounded-full"
             style={{ 
               backgroundColor: `${color}20`,
               color: color
             }}>
          Infrastructure
        </div>
      </div>
    </div>
  )
}

// Custom Node Component for Dependency Graph
function DependencyNode({ data }: NodeProps) {
  const { name, platform, platformLabel, slaLevel, isCurrent, type } = data
  const slaColor = getSLAColor(slaLevel)
  const platformColor = getPlatformColor(platform)
  
  return (
    <div 
      className={`
        ${isCurrent ? 'min-w-[160px] min-h-[100px]' : 'min-w-[140px] min-h-[85px]'}
        bg-white dark:bg-gray-800 
        border-2 rounded-lg shadow-lg
        transition-all duration-200 hover:shadow-xl
        ${isCurrent ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}
      `}
      style={{ 
        borderColor: slaColor,
        borderTopWidth: '4px',
        borderTopColor: platformColor
      }}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          background: '#6366f1',
          width: 8,
          height: 8,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          background: '#10b981',
          width: 8,
          height: 8,
          border: '2px solid white'
        }}
      />
      
      <div className="p-3 flex flex-col items-center justify-center h-full">
        {/* Platform Icon */}
        <div className="mb-2 flex items-center justify-center w-10 h-10 rounded-full" 
             style={{ backgroundColor: `${platformColor}20` }}>
          {getPlatformIconComponent(platform, isCurrent ? 'w-6 h-6' : 'w-5 h-5')}
        </div>
        
        {/* Service Name */}
        <div className={`${isCurrent ? 'text-sm' : 'text-xs'} font-bold text-gray-900 dark:text-gray-100 text-center mb-1 truncate max-w-full px-1`}>
          {name}
        </div>
        
        {/* Platform Label */}
        {platformLabel && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center truncate max-w-full px-1">
            {platformLabel}
          </div>
        )}
        
        {/* SLA Badge */}
        {slaLevel && (
          <div className="mt-2 flex items-center">
            <div 
              className="w-2 h-2 rounded-full mr-1" 
              style={{ backgroundColor: slaColor }}
            />
            <span className="text-[9px] font-medium" style={{ color: slaColor }}>
              {getSLALabel(slaLevel)}
            </span>
          </div>
        )}
        
        {/* Type Badge for Current Service */}
        {isCurrent && (
          <div className="mt-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[9px] font-medium rounded-full">
            Current
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get platform icon as React component
function getPlatformIconComponent(platform?: Platform, className: string = 'w-5 h-5') {
  const iconColor = getPlatformColor(platform)
  
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
    default:
      return <Server className={className} style={{ color: iconColor }} />
  }
}

export default function CatalogDetail() {
  const { serviceName } = useParams<{ serviceName: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Edit mode for infrastructure resources
  const [isEditingGraph, setIsEditingGraph] = useState(false)
  const [pendingResources, setPendingResources] = useState<InfrastructureResource[]>([])
  
  // Add resource modal state
  const [showAddResourceModal, setShowAddResourceModal] = useState(false)
  const [newResourceType, setNewResourceType] = useState<string | null>(null)
  const [newResourceName, setNewResourceName] = useState('')
  
  // Edit resource modal state
  const [showEditResourceModal, setShowEditResourceModal] = useState(false)
  const [editingResource, setEditingResource] = useState<InfrastructureResource | null>(null)
  const [editResourceName, setEditResourceName] = useState('')
  const [editResourceProvider, setEditResourceProvider] = useState('')
  const [editResourceDescription, setEditResourceDescription] = useState('')
  
  // Drag & drop infrastructure resource states
  const [selectedProvider, setSelectedProvider] = useState('AWS')
  const [draggingResource, setDraggingResource] = useState<string | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

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

  const updateVersionsMutation = useMutation({
    mutationFn: ({ name, versions, latest, reference }: { 
      name: string, 
      versions: string[], 
      latest?: string, 
      reference?: string 
    }) => catalogApi.updateVersions(name, versions, latest, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })

  const updateServiceMutation = useMutation({
    mutationFn: (updatedService: Catalog) => catalogApi.createOrUpdate(updatedService),
    onSuccess: () => {
      // Invalidate both catalog queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
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

  const handleUpdateVersions = (versions: string[], latest?: string, reference?: string) => {
    if (!service) return
    
    console.log('🔧 Updating versions:', { versions, latest, reference })
    
    updateVersionsMutation.mutate({
      name: service.name,
      versions,
      latest,
      reference
    })
  }

  const handleUpdateUsedDeliverables = (usedDeliverables: UsedDeliverable[]) => {
    if (!service) return
    
    console.log('🔧 Updating used deliverables:', usedDeliverables)
    
    const updatedService = {
      ...service,
      usedDeliverables
    }
    
    updateServiceMutation.mutate(updatedService)
  }

  const handleUpdateVulnerabilitySummary = (vulnerabilitySummary?: VulnerabilitySummary) => {
    if (!service) return
    
    console.log('🔧 Updating vulnerability summary:', vulnerabilitySummary)
    
    const updatedService = {
      ...service,
      vulnerabilitySummary
    }
    
    updateServiceMutation.mutate(updatedService)
  }

  const handleUpdateInfrastructureResources = (infrastructureResources: InfrastructureResource[]) => {
    if (!service) return
    
    console.log('🔧 Updating infrastructure resources:', infrastructureResources)
    
    const updatedService = {
      ...service,
      infrastructureResources
    }
    
    updateServiceMutation.mutate(updatedService)
  }

  // Start editing graph - copy current resources to pending
  const startEditingGraph = useCallback(() => {
    setPendingResources(service?.infrastructureResources || [])
    setIsEditingGraph(true)
  }, [service?.infrastructureResources])

  // Cancel editing - discard changes
  const cancelEditingGraph = useCallback(() => {
    setPendingResources([])
    setIsEditingGraph(false)
  }, [])

  // Save pending resources to backend
  const saveGraphChanges = useCallback(() => {
    if (!service) return
    
    const updatedService = {
      ...service,
      infrastructureResources: pendingResources
    }
    
    console.log('🔧 Saving infrastructure resources:', pendingResources)
    updateServiceMutation.mutate(updatedService, {
      onSuccess: () => {
        setIsEditingGraph(false)
        setPendingResources([])
      }
    })
  }, [service, pendingResources, updateServiceMutation])

  // Remove a pending resource
  const removePendingResource = useCallback((resourceId: string) => {
    setPendingResources(prev => prev.filter(r => r.id !== resourceId))
  }, [])

  // Drag & Drop handlers
  const onDragStart = useCallback((event: DragEvent<HTMLDivElement>, resourceType: string) => {
    if (!isEditingGraph) return
    event.dataTransfer.setData('application/reactflow', resourceType)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingResource(resourceType)
  }, [isEditingGraph])

  const onDragEnd = useCallback(() => {
    setDraggingResource(null)
  }, [])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isEditingGraph) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [isEditingGraph])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    
    if (!isEditingGraph) return
    
    const resourceType = event.dataTransfer.getData('application/reactflow')
    if (!resourceType) return
    
    // Open modal to enter custom name
    const resourceConfig = QUICK_ADD_RESOURCES.find(r => r.type === resourceType)
    setNewResourceType(resourceType)
    setNewResourceName(resourceConfig?.label || resourceType)
    setShowAddResourceModal(true)
    setDraggingResource(null)
  }, [isEditingGraph])

  // Confirm adding the new resource with custom name
  const confirmAddResource = useCallback(() => {
    if (!newResourceType || !newResourceName.trim()) return
    
    const newResource: InfrastructureResource = {
      id: `infra-${Date.now()}`,
      name: newResourceName.trim(),
      type: newResourceType as InfrastructureType,
      description: '',
      provider: selectedProvider,
      region: '',
      endpoint: '',
      metadata: {},
      connectedServices: []
    }
    
    // Add to pending resources (not saved yet)
    setPendingResources(prev => [...prev, newResource])
    console.log('🔧 Added pending infrastructure resource:', newResource)
    
    // Reset modal state
    setShowAddResourceModal(false)
    setNewResourceType(null)
    setNewResourceName('')
  }, [newResourceType, newResourceName, selectedProvider])

  // Cancel adding resource
  const cancelAddResource = useCallback(() => {
    setShowAddResourceModal(false)
    setNewResourceType(null)
    setNewResourceName('')
  }, [])

  // Open edit modal for a resource
  const openEditResourceModal = useCallback((resource: InfrastructureResource) => {
    setEditingResource(resource)
    setEditResourceName(resource.name)
    setEditResourceProvider(resource.provider || selectedProvider)
    setEditResourceDescription(resource.description || '')
    setShowEditResourceModal(true)
  }, [selectedProvider])

  // Confirm editing the resource
  const confirmEditResource = useCallback(() => {
    if (!editingResource || !editResourceName.trim()) return
    
    setPendingResources(prev => prev.map(r => 
      r.id === editingResource.id 
        ? { 
            ...r, 
            name: editResourceName.trim(),
            provider: editResourceProvider,
            description: editResourceDescription
          }
        : r
    ))
    
    // Reset modal state
    setShowEditResourceModal(false)
    setEditingResource(null)
    setEditResourceName('')
    setEditResourceProvider('')
    setEditResourceDescription('')
  }, [editingResource, editResourceName, editResourceProvider, editResourceDescription])

  // Cancel editing resource
  const cancelEditResource = useCallback(() => {
    setShowEditResourceModal(false)
    setEditingResource(null)
    setEditResourceName('')
    setEditResourceProvider('')
    setEditResourceDescription('')
  }, [])

  // Delete a pending resource
  const deletePendingResource = useCallback((resourceId: string) => {
    setPendingResources(prev => prev.filter(r => r.id !== resourceId))
  }, [])

  // Get resources to display (pending if editing, otherwise from service)
  const displayedResources = isEditingGraph ? pendingResources : (service?.infrastructureResources || [])

  // Build dependency graph
  const { nodes, edges } = useMemo(() => {
    if (!service || !allCatalogs) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []
    const catalogMap = new Map(allCatalogs.catalogs.map(c => [c.name, c]))

    // Center node (current service)
    nodes.push({
      id: service.name,
      type: 'dependencyNode',
      data: { 
        name: service.name,
        platform: service.platform,
        platformLabel: service.platform ? getPlatformLabel(service.platform) : undefined,
        slaLevel: service.sla?.level,
        isCurrent: true,
        type: 'current'
      },
      position: { x: 400, y: 300 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    // Dependencies In (upstream - services we depend on)
    service.dependenciesIn?.forEach((depName, index) => {
      const dep = catalogMap.get(depName)
      
      nodes.push({
        id: depName,
        type: 'dependencyNode',
        data: { 
          name: depName,
          platform: dep?.platform,
          platformLabel: dep?.platform ? getPlatformLabel(dep.platform) : undefined,
          slaLevel: dep?.sla?.level,
          isCurrent: false,
          type: 'upstream'
        },
        position: { x: 50, y: 100 + index * 120 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      edges.push({
        id: `${depName}-${service.name}`,
        source: depName,
        target: service.name,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366f1',
        },
        label: 'depends on',
        labelStyle: { fontSize: 10, fill: '#6b7280' },
        labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.9 },
      })
    })

    // Dependencies Out (downstream - services that depend on us)
    service.dependenciesOut?.forEach((depName, index) => {
      const dep = catalogMap.get(depName)
      
      nodes.push({
        id: depName,
        type: 'dependencyNode',
        data: { 
          name: depName,
          platform: dep?.platform,
          platformLabel: dep?.platform ? getPlatformLabel(dep.platform) : undefined,
          slaLevel: dep?.sla?.level,
          isCurrent: false,
          type: 'downstream'
        },
        position: { x: 750, y: 100 + index * 120 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      edges.push({
        id: `${service.name}-${depName}`,
        source: service.name,
        target: depName,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#10b981',
        },
        label: 'used by',
        labelStyle: { fontSize: 10, fill: '#6b7280' },
        labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.9 },
      })
    })

    // Infrastructure Resources (below the service) - use displayedResources for edit mode
    displayedResources.forEach((resource, index) => {
      const infraId = `infra-${resource.id}`
      const color = getInfrastructureColor(resource.type)
      
      nodes.push({
        id: infraId,
        type: 'infrastructureNode',
        data: {
          name: resource.name,
          type: resource.type,
          provider: resource.provider,
          description: resource.description
        },
        position: { x: 300 + (index * 180), y: 500 },
        sourcePosition: Position.Top,
        targetPosition: Position.Top,
      })

      edges.push({
        id: `${service.name}-${infraId}`,
        source: service.name,
        target: infraId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: color, strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
        },
        label: 'uses',
        labelStyle: { fontSize: 10, fill: '#6b7280' },
        labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.9 },
      })
    })

    return { nodes, edges }
  }, [service, allCatalogs, displayedResources])

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    dependencyNode: DependencyNode,
    infrastructureNode: InfrastructureNode
  }), [])

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
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
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

      {/* Dependency Graph with Drag & Drop */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative" style={{ height: '650px' }}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <GitBranch className="w-5 h-5" />
                <span>Dependency Graph</span>
                {isEditingGraph && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                    Editing
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isEditingGraph 
                  ? 'Drag & drop resources from the palette, then click Save to apply changes'
                  : 'Click Edit to add infrastructure resources to the graph'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isEditingGraph ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditingGraph}
                    className="flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveGraphChanges}
                    disabled={updateServiceMutation.isPending}
                    className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
                  >
                    {updateServiceMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Save</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditingGraph}
                  className="flex items-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6366f1' }}></div>
              <span>Upstream (we depend on)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span>Downstream (depends on us)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#ef4444' }}></div>
              <span>Critical SLA</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#f97316' }}></div>
              <span>High SLA</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#eab308' }}></div>
              <span>Medium SLA</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#22c55e' }}></div>
              <span>Low SLA</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b', opacity: 0.8 }}></div>
              <span>Infrastructure</span>
            </div>
          </div>
        </div>
        
        <div className="flex h-[calc(100%-130px)]">
          {/* Left Sidebar - Resource Palette (only visible in edit mode) */}
          {isEditingGraph && (
          <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 overflow-y-auto">
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Cloud Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={!isEditingGraph}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="AWS">AWS</option>
                <option value="Azure">Azure</option>
                <option value="GCP">Google Cloud</option>
                <option value="Scaleway">Scaleway</option>
                <option value="On-Premise">On-Premise</option>
              </select>
            </div>
            
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Drag to add
              </span>
            </div>
            
            {/* Databases */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Databases</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('database_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>
            
            {/* Storage */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Storage</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('storage_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>
            
            {/* Network */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Network</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('network_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>

            {/* Compute */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Compute</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('compute_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>
            
            {/* Messaging */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Messaging</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('messaging_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>
            
            {/* Security */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Security</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('security_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>
            
            {/* Other */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Other</div>
              <div className="space-y-1">
                {QUICK_ADD_RESOURCES.filter(r => r.type.startsWith('other_')).map((resource) => (
                    <div
                      key={resource.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, resource.type)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center space-x-2 p-2 text-xs font-medium rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        draggingResource === resource.type 
                          ? 'opacity-50 scale-95' 
                          : 'hover:shadow-md'
                      }`}
                      style={{ 
                        borderColor: resource.color, 
                        backgroundColor: `${resource.color}15`,
                      }}
                    >
                      {renderResourceIcon(resource, selectedProvider, 'w-5 h-5 flex-shrink-0')}
                      <span className="text-gray-800 dark:text-gray-200 truncate font-semibold">{resource.label}</span>
                    </div>
                ))}
              </div>
            </div>

            {/* Added Resources - Editable List */}
            {pendingResources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Added Resources ({pendingResources.length})
                </div>
                <div className="space-y-1.5">
                  {pendingResources.map((resource) => {
                    const resourceConfig = QUICK_ADD_RESOURCES.find(r => r.type === resource.type)
                    const color = resourceConfig?.color || '#64748b'
                    return (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-2 text-xs rounded-lg border-2 group"
                        style={{ 
                          borderColor: color, 
                          backgroundColor: `${color}15`,
                        }}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {resourceConfig ? renderResourceIcon(resourceConfig, resource.provider || 'AWS', 'w-5 h-5 flex-shrink-0') : <Cloud className="w-5 h-5 flex-shrink-0" style={{ color: '#64748b' }} />}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {resource.name}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {resource.provider}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditResourceModal(resource)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            title="Edit resource"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePendingResource(resource.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                            title="Delete resource"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          )}
          
          {/* ReactFlow Graph - Drop Zone */}
          <div 
            ref={reactFlowWrapper}
            className={`flex-1 relative transition-all duration-200 ${
              draggingResource 
                ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-2 ring-inset ring-indigo-300 dark:ring-indigo-700' 
                : ''
            }`}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {/* Drop indicator */}
            {draggingResource && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Drop here to add resource</span>
                </div>
              </div>
            )}
            
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              minZoom={0.5}
              maxZoom={1.5}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
              }}
            >
              <Background color="#e5e7eb" gap={16} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  if (node.data.isCurrent) return '#6366f1'
                  if (node.data.type === 'upstream') return '#3b82f6'
                  if (node.data.type === 'downstream') return '#10b981'
                  if (node.id.startsWith('infra-')) return '#f59e0b'
                  return '#94a3b8'
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            </ReactFlow>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5">
        {/* Service Information - Left Column (2/3 width) */}
        <div className="lg:col-span-2">
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
                      {service.platform === Platform.KUBERNETES ? (
                        <KubernetesIcon className="w-4 h-4 mr-2" />
                      ) : (
                        <Server className="w-4 h-4 mr-2" />
                      )}
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
              {service.communicationChannels && service.communicationChannels.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Communication Channels</dt>
                  <dd className="space-y-2">
                    {service.communicationChannels.map((channel, index) => (
                      <a
                        key={index}
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors space-x-2 border mr-2 mb-2 dark:bg-opacity-20 dark:border-opacity-60"
                        style={getCommunicationChannelStyles(channel.type)}
                        title={channel.description || `${channel.name} (${getCommunicationChannelLabel(channel.type)})`}
                      >
                        {getCommunicationChannelIcon(channel.type)}
                        <span>{channel.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </dd>
                </div>
              )}
              {service.dashboardLinks && service.dashboardLinks.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Dashboard Links</dt>
                  <dd className="space-y-2">
                    {service.dashboardLinks.map((dashboard, index) => (
                      <a
                        key={index}
                        href={dashboard.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors space-x-2 border mr-2 mb-2 dark:bg-opacity-20 dark:border-opacity-60"
                        style={getDashboardLinkStyles(dashboard.type)}
                        title={dashboard.description || `${dashboard.name} (${getDashboardLabel(dashboard.type)})`}
                      >
                        {getDashboardIcon(dashboard.type)}
                        <span>{dashboard.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* SLA & Vulnerability - Right Column (1/3 width) */}
        <div className="space-y-1.5">
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
                  <div className="grid grid-cols-1 gap-1.5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    {service.sla.uptimePercentage && (
                      <div className="text-center">
                        <div className="text-xl font-bold" style={{ color: getSLAColor(service.sla.level) }}>
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
                        <div className="text-xl font-bold" style={{ color: getSLAColor(service.sla.level) }}>
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
              <div className="text-center py-6">
                <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No SLA defined
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Consider defining SLA targets
                </p>
              </div>
            </div>
          )}

          {/* Vulnerability Summary */}
          <VulnerabilityManager
            vulnerabilitySummary={service.vulnerabilitySummary}
            onChange={handleUpdateVulnerabilitySummary}
          />
        </div>
      </div>

      {/* Version Management for Deliverables */}
      {(service.type === CatalogType.PACKAGE || 
        service.type === CatalogType.CHART || 
        service.type === CatalogType.CONTAINER || 
        service.type === CatalogType.MODULE) && (
        <div className="grid grid-cols-1 gap-1.5">
          <DeliverableVersions
            serviceName={service.name}
            serviceType={service.type as 'package' | 'chart' | 'container' | 'module'}
            availableVersions={service.availableVersions || []}
            latestVersion={service.latestVersion}
            referenceVersion={service.referenceVersion}
            onUpdateVersions={handleUpdateVersions}
          />
        </div>
      )}

      {/* Used Deliverables Management for Projects */}
      {service.type === CatalogType.PROJECT && (
        <div className="grid grid-cols-1 gap-1.5">
          <UsedDeliverablesManager
            usedDeliverables={service.usedDeliverables || []}
            onUpdate={handleUpdateUsedDeliverables}
            availableDeliverables={allCatalogs?.catalogs
              .filter(c => [CatalogType.PACKAGE, CatalogType.CHART, CatalogType.CONTAINER, CatalogType.MODULE, CatalogType.LIBRARY].includes(c.type))
              .map(c => ({ 
                name: c.name, 
                type: c.type, 
                availableVersions: c.availableVersions || [],
                latestVersion: c.latestVersion,
                referenceVersion: c.referenceVersion
              }))
            }
          />
        </div>
      )}

      {/* Infrastructure Resources Management */}
      <div className="grid grid-cols-1 gap-1.5">
        <InfrastructureResourceManager
          resources={service.infrastructureResources || []}
          onChange={handleUpdateInfrastructureResources}
        />
      </div>

      {/* Dependencies Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
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

      {/* Add Resource Modal */}
      {showAddResourceModal && newResourceType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    {(() => {
                      const resourceConfig = QUICK_ADD_RESOURCES.find(r => r.type === newResourceType)
                      const IconComponent = resourceConfig?.icon || Database
                      return <IconComponent className="w-5 h-5" style={{ color: resourceConfig?.color || '#6366f1' }} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Add Infrastructure Resource
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {QUICK_ADD_RESOURCES.find(r => r.type === newResourceType)?.label} ({selectedProvider})
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelAddResource}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resource Name
                </label>
                <input
                  type="text"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="e.g., users-database, cache-redis"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmAddResource()
                    if (e.key === 'Escape') cancelAddResource()
                  }}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Give a meaningful name to identify this resource in your architecture
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelAddResource}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={confirmAddResource}
                  disabled={!newResourceName.trim()}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Resource</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditResourceModal && editingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    {(() => {
                      const resourceConfig = QUICK_ADD_RESOURCES.find(r => r.type === editingResource.type)
                      const IconComponent = resourceConfig?.icon || Database
                      return <IconComponent className="w-5 h-5" style={{ color: resourceConfig?.color || '#3b82f6' }} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Edit Infrastructure Resource
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {QUICK_ADD_RESOURCES.find(r => r.type === editingResource.type)?.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelEditResource}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resource Name
                  </label>
                  <input
                    type="text"
                    value={editResourceName}
                    onChange={(e) => setEditResourceName(e.target.value)}
                    placeholder="e.g., users-database, cache-redis"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEditResource()
                      if (e.key === 'Escape') cancelEditResource()
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cloud Provider
                  </label>
                  <select
                    value={editResourceProvider}
                    onChange={(e) => setEditResourceProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="AWS">AWS</option>
                    <option value="Azure">Azure</option>
                    <option value="GCP">Google Cloud</option>
                    <option value="Scaleway">Scaleway</option>
                    <option value="On-Premise">On-Premise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={editResourceDescription}
                    onChange={(e) => setEditResourceDescription(e.target.value)}
                    placeholder="Brief description of this resource..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelEditResource}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={confirmEditResource}
                  disabled={!editResourceName.trim()}
                  className="flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      return '⬛' // Serveur/VM
    case Platform.LAMBDA:
      return '⚡' // Fonction (garde l'éclair, très tech)
    case Platform.KUBERNETES:
      return '⚙️' // Orchestration/Engine
    case Platform.ECS:
      return '📋' // Container orchestration
    case Platform.FARGATE:
      return '▫️' // Serverless container
    case Platform.CLOUD_RUN:
      return '▶️' // Run/Execute
    case Platform.APP_SERVICE:
      return '🔲' // Application platform
    case Platform.STEP_FUNCTIONS:
      return '🔄' // Workflow (garde la rotation)
    case Platform.EVENT_BRIDGE:
      return '⚡' // Event processing
    case Platform.RDS:
      return '💾' // Database storage
    case Platform.DYNAMODB:
      return '🔶' // NoSQL/Document DB
    case Platform.S3:
      return '📁' // File storage
    case Platform.CLOUDFRONT:
      return '🌐' // CDN/Global network
    case Platform.API_GATEWAY:
      return '🔌' // API endpoint
    case Platform.CLOUDWATCH:
      return '📊' // Monitoring/Metrics
    case Platform.ON_PREMISE:
      return '🏭' // Data center/Infrastructure
    case Platform.HYBRID:
      return '🔗' // Connection/Link (garde le lien)
    case Platform.MULTI_CLOUD:
      return '☁️' // Cloud (garde le nuage)
    default:
      return '⚫' // Unknown/Default
  }
}

// Helper functions for Communication Channels
function getCommunicationChannelIcon(type?: CommunicationType) {
  switch (type) {
    case CommunicationType.SLACK:
      return <SlackIcon className="w-4 h-4" />
    case CommunicationType.TEAMS:
      return <FontAwesomeIcon icon={faMicrosoft} className="w-4 h-4" />
    case CommunicationType.EMAIL:
      return <Mail className="w-4 h-4" />
    case CommunicationType.DISCORD:
      return <FontAwesomeIcon icon={faDiscord} className="w-4 h-4" />
    case CommunicationType.MATTERMOST:
      return <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
    case CommunicationType.TELEGRAM:
      return <FontAwesomeIcon icon={faTelegram} className="w-4 h-4" />
    default:
      return <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
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

function getCommunicationChannelStyles(type?: CommunicationType): { backgroundColor: string; borderColor: string; color: string } {
  switch (type) {
    case CommunicationType.SLACK:
      return {
        backgroundColor: 'rgb(147 51 234 / 0.1)', // purple-600 with opacity
        borderColor: 'rgb(147 51 234)', // purple-600
        color: 'rgb(147 51 234)' // purple-600
      }
    case CommunicationType.TEAMS:
      return {
        backgroundColor: 'rgb(37 99 235 / 0.1)', // blue-600 with opacity
        borderColor: 'rgb(37 99 235)', // blue-600
        color: 'rgb(37 99 235)' // blue-600
      }
    case CommunicationType.EMAIL:
      return {
        backgroundColor: 'rgb(220 38 38 / 0.1)', // red-600 with opacity
        borderColor: 'rgb(220 38 38)', // red-600
        color: 'rgb(220 38 38)' // red-600
      }
    case CommunicationType.DISCORD:
      return {
        backgroundColor: 'rgb(79 70 229 / 0.1)', // indigo-600 with opacity
        borderColor: 'rgb(79 70 229)', // indigo-600
        color: 'rgb(79 70 229)' // indigo-600
      }
    case CommunicationType.MATTERMOST:
      return {
        backgroundColor: 'rgb(8 145 178 / 0.1)', // cyan-600 with opacity
        borderColor: 'rgb(8 145 178)', // cyan-600
        color: 'rgb(8 145 178)' // cyan-600
      }
    case CommunicationType.TELEGRAM:
      return {
        backgroundColor: 'rgb(2 132 199 / 0.1)', // sky-600 with opacity
        borderColor: 'rgb(2 132 199)', // sky-600
        color: 'rgb(2 132 199)' // sky-600
      }
    default:
      return {
        backgroundColor: 'rgb(107 114 128 / 0.1)', // gray-500 with opacity
        borderColor: 'rgb(107 114 128)', // gray-500
        color: 'rgb(107 114 128)' // gray-500
      }
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

// Helper functions for Dashboard Links
function getDashboardIcon(type?: import('../types/api').DashboardType) {
  switch (type) {
    case 'grafana':
      return <GrafanaIcon className="w-4 h-4" />
    case 'prometheus':
    case 'kibana':
      return <Activity className="w-4 h-4" />
    case 'datadog':
    case 'newrelic':
    case 'dynatrace':
    case 'appdynamics':
      return <Activity className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

function getDashboardLabel(type?: import('../types/api').DashboardType): string {
  switch (type) {
    case 'grafana':
      return 'Grafana'
    case 'datadog':
      return 'Datadog'
    case 'newrelic':
      return 'New Relic'
    case 'prometheus':
      return 'Prometheus'
    case 'kibana':
      return 'Kibana'
    case 'splunk':
      return 'Splunk'
    case 'dynatrace':
      return 'Dynatrace'
    case 'appdynamics':
      return 'AppDynamics'
    case 'custom':
      return 'Custom'
    default:
      return 'Dashboard'
  }
}

function getDashboardLinkStyles(type?: import('../types/api').DashboardType): { backgroundColor: string; borderColor: string; color: string } {
  switch (type) {
    case 'grafana':
      return {
        backgroundColor: 'rgb(251 146 60 / 0.1)', // orange-400 with opacity
        borderColor: 'rgb(251 146 60)', // orange-400
        color: 'rgb(251 146 60)' // orange-400
      }
    case 'datadog':
      return {
        backgroundColor: 'rgb(147 51 234 / 0.1)', // purple-600 with opacity
        borderColor: 'rgb(147 51 234)', // purple-600
        color: 'rgb(147 51 234)' // purple-600
      }
    case 'newrelic':
      return {
        backgroundColor: 'rgb(34 197 94 / 0.1)', // green-500 with opacity
        borderColor: 'rgb(34 197 94)', // green-500
        color: 'rgb(34 197 94)' // green-500
      }
    case 'prometheus':
      return {
        backgroundColor: 'rgb(239 68 68 / 0.1)', // red-500 with opacity
        borderColor: 'rgb(239 68 68)', // red-500
        color: 'rgb(239 68 68)' // red-500
      }
    case 'kibana':
      return {
        backgroundColor: 'rgb(245 158 11 / 0.1)', // amber-500 with opacity
        borderColor: 'rgb(245 158 11)', // amber-500
        color: 'rgb(245 158 11)' // amber-500
      }
    case 'splunk':
      return {
        backgroundColor: 'rgb(107 114 128 / 0.1)', // gray-500 with opacity
        borderColor: 'rgb(107 114 128)', // gray-500
        color: 'rgb(107 114 128)' // gray-500
      }
    case 'dynatrace':
      return {
        backgroundColor: 'rgb(59 130 246 / 0.1)', // blue-500 with opacity
        borderColor: 'rgb(59 130 246)', // blue-500
        color: 'rgb(59 130 246)' // blue-500
      }
    case 'appdynamics':
      return {
        backgroundColor: 'rgb(99 102 241 / 0.1)', // indigo-500 with opacity
        borderColor: 'rgb(99 102 241)', // indigo-500
        color: 'rgb(99 102 241)' // indigo-500
      }
    case 'custom':
      return {
        backgroundColor: 'rgb(20 184 166 / 0.1)', // teal-500 with opacity
        borderColor: 'rgb(20 184 166)', // teal-500
        color: 'rgb(20 184 166)' // teal-500
      }
    default:
      return {
        backgroundColor: 'rgb(107 114 128 / 0.1)', // gray-500 with opacity
        borderColor: 'rgb(107 114 128)', // gray-500
        color: 'rgb(107 114 128)' // gray-500
      }
  }
}




// Helper functions for Infrastructure Resources
// AWS Official Colors
function getInfrastructureColor(type: string): string {
  if (type.startsWith('database_')) {
    return '#C925D1' // AWS Database - violet/rose
  } else if (type.startsWith('storage_')) {
    return '#7AA116' // AWS Storage - vert
  } else if (type.startsWith('network_')) {
    return '#8C4FFF' // AWS Network - violet
  } else if (type.startsWith('compute_')) {
    return '#ED7100' // AWS Compute - orange
  } else if (type.startsWith('messaging_') || type.startsWith('cache_')) {
    return '#E7157B' // AWS Messaging - rose
  } else if (type.startsWith('security_')) {
    return '#DD344C' // AWS Security - rouge
  } else if (type.startsWith('monitoring_')) {
    return '#6366f1' // indigo
  }
  return '#6b7280' // gray
}

// AWS Icon mapping for infrastructure types
const AWS_ICON_MAP: Record<string, string> = {
  // Databases
  'database_rds': '/aws_icons/Arch_Amazon-RDS_32.svg',
  'database_dynamodb': '/aws_icons/Arch_Amazon-DynamoDB_32.svg',
  'database_postgresql': '/aws_icons/Arch_Amazon-RDS_32.svg',
  'database_mysql': '/aws_icons/Arch_Amazon-RDS_32.svg',
  'database_redis': '/aws_icons/Arch_Amazon-ElastiCache_32.svg',
  'database_mongodb': '/aws_icons/Arch_Amazon-DynamoDB_32.svg',
  'database_elasticsearch': '/aws_icons/Arch_Amazon-Neptune_32.svg',
  // Storage
  'storage_s3': '/aws_icons/Arch_Amazon-Simple-Storage-Service_32.svg',
  'storage_efs': '/aws_icons/Arch_Amazon-EFS_32.svg',
  'storage_ebs': '/aws_icons/Arch_Amazon-Elastic-Block-Store_32.svg',
  // Network
  'network_load_balancer': '/aws_icons/Arch_Elastic-Load-Balancing_32.svg',
  'network_api_gateway': '/aws_icons/Arch_Amazon-Route-53_32.svg',
  'network_cloudfront': '/aws_icons/Arch_Amazon-CloudFront_32.svg',
  'network_route53': '/aws_icons/Arch_Amazon-Route-53_32.svg',
  'network_vpc': '/aws_icons/Arch_AWS-Transit-Gateway_32.svg',
  // Compute
  'compute_ecs': '/aws_icons/Arch_Amazon-Elastic-Container-Service_32.svg',
  'compute_eks': '/aws_icons/Arch_Amazon-Elastic-Kubernetes-Service_32.svg',
  'compute_fargate': '/aws_icons/Arch_AWS-Fargate_32.svg',
  'compute_ecr': '/aws_icons/Arch_Amazon-Elastic-Container-Registry_32.svg',
  // Cache
  'cache_elasticache': '/aws_icons/Arch_Amazon-ElastiCache_32.svg',
  'cache_memorydb': '/aws_icons/Arch_Amazon-MemoryDB_32.svg',
  // Other
  'other_backup': '/aws_icons/Arch_AWS-Backup_32.svg',
  'other_dms': '/aws_icons/Arch_AWS-Database-Migration-Service_32.svg',
}

function getInfrastructureIconComponent(type: string, className: string, color: string, provider?: string) {
  // Use AWS icons when provider is AWS
  if (provider === 'AWS' && AWS_ICON_MAP[type]) {
    return (
      <img 
        src={AWS_ICON_MAP[type]} 
        alt={type} 
        className={className}
        style={{ width: '24px', height: '24px' }}
      />
    )
  }
  
  // Fallback to Lucide icons
  if (type.startsWith('database_')) {
    return <Activity className={className} style={{ color }} />
  } else if (type.startsWith('storage_')) {
    return <Package className={className} style={{ color }} />
  } else if (type.startsWith('network_')) {
    return <GitBranch className={className} style={{ color }} />
  } else if (type.startsWith('messaging_')) {
    return <Mail className={className} style={{ color }} />
  } else if (type.startsWith('cache_')) {
    return <Zap className={className} style={{ color }} />
  } else if (type.startsWith('security_')) {
    return <AlertTriangle className={className} style={{ color }} />
  } else if (type.startsWith('monitoring_')) {
    return <Activity className={className} style={{ color }} />
  }
  return <Server className={className} style={{ color }} />
}
