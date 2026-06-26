import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { catalogApi, eventsApi } from '../lib/api'
import { SLALevel, CatalogType, Language, Platform, CommunicationType, DashboardType, type Catalog, type UsedDeliverable, type VulnerabilitySummary, type InfrastructureType, type Event, Status } from '../types/api'
import { ArrowLeft, Package, GitBranch, Activity, ExternalLink, Github, Code, Server, Edit, Trash2, AlertTriangle, X, Mail, Zap, Plus, Database, HardDrive, Network, MessageSquare, Shield, Cloud, Check, Clock, Calendar, Rocket, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
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
import { useMemo, useState, useCallback, useRef, useEffect, DragEvent } from 'react'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import DeliverableVersions from '../components/VersionManager'
import UsedDeliverablesManager from '../components/UsedDeliverablesManager'
import VulnerabilityManager from '../components/VulnerabilityManager'
import InfrastructureResourceManager from '../components/InfrastructureResourceManager'
import type { InfrastructureResource } from '../types/api'

// Provider Colors
// AWS: Database: #C925D1, Storage: #7AA116, Network: #8C4FFF, Compute: #ED7100, Messaging: #E7157B, Security: #DD344C
// GCP: #4285F4 (blue), #34A853 (green), #FBBC04 (yellow), #EA4335 (red)
// Azure: #0078D4 (blue), #50E6FF (cyan), #773ADC (purple)

// Provider-specific resource configurations
type ProviderResources = {
  type: string
  label: string
  icon: typeof Database
  color: string
  providerIcon: string | null
}

const AWS_RESOURCES: ProviderResources[] = [
  // Databases
  { type: 'database_rds', label: 'RDS', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-RDS_32.svg' },
  { type: 'database_dynamodb', label: 'DynamoDB', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-DynamoDB_32.svg' },
  { type: 'database_elasticache', label: 'ElastiCache', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-ElastiCache_32.svg' },
  { type: 'database_neptune', label: 'Neptune', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-Neptune_32.svg' },
  { type: 'database_keyspaces', label: 'Keyspaces', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-Keyspaces_32.svg' },
  { type: 'database_timestream', label: 'Timestream', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-Timestream_32.svg' },
  { type: 'database_memorydb', label: 'MemoryDB', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Amazon-MemoryDB_32.svg' },
  { type: 'database_oracle', label: 'Oracle DB', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_Oracle-Database-at-AWS_32.svg' },
  { type: 'database_dms', label: 'DMS', icon: Database, color: '#C925D1', providerIcon: '/aws_icons/Arch_AWS-Database-Migration-Service_32.svg' },
  // Storage
  { type: 'storage_s3', label: 'S3', icon: HardDrive, color: '#7AA116', providerIcon: '/aws_icons/Arch_Amazon-Simple-Storage-Service_32.svg' },
  { type: 'storage_efs', label: 'EFS', icon: HardDrive, color: '#7AA116', providerIcon: '/aws_icons/Arch_Amazon-EFS_32.svg' },
  { type: 'storage_ebs', label: 'EBS', icon: HardDrive, color: '#7AA116', providerIcon: '/aws_icons/Arch_Amazon-Elastic-Block-Store_32.svg' },
  { type: 'storage_file_cache', label: 'File Cache', icon: HardDrive, color: '#7AA116', providerIcon: '/aws_icons/Arch_Amazon-File-Cache_32.svg' },
  { type: 'storage_backup', label: 'Backup', icon: HardDrive, color: '#7AA116', providerIcon: '/aws_icons/Arch_AWS-Backup_32.svg' },
  // Network
  { type: 'network_load_balancer', label: 'Load Balancer', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_Elastic-Load-Balancing_32.svg' },
  { type: 'network_cloudfront', label: 'CloudFront', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_Amazon-CloudFront_32.svg' },
  { type: 'network_route53', label: 'Route 53', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_Amazon-Route-53_32.svg' },
  { type: 'network_transit_gateway', label: 'Transit Gateway', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_AWS-Transit-Gateway_32.svg' },
  { type: 'network_privatelink', label: 'PrivateLink', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_AWS-PrivateLink_32.svg' },
  { type: 'network_client_vpn', label: 'Client VPN', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_AWS-Client-VPN_32.svg' },
  { type: 'network_site_to_site_vpn', label: 'Site-to-Site VPN', icon: Network, color: '#8C4FFF', providerIcon: '/aws_icons/Arch_AWS-Site-to-Site-VPN_32.svg' },
  // Compute
  { type: 'compute_ecs', label: 'ECS', icon: Server, color: '#ED7100', providerIcon: '/aws_icons/Arch_Amazon-Elastic-Container-Service_32.svg' },
  { type: 'compute_eks', label: 'EKS', icon: Server, color: '#ED7100', providerIcon: '/aws_icons/Arch_Amazon-Elastic-Kubernetes-Service_32.svg' },
  { type: 'compute_fargate', label: 'Fargate', icon: Server, color: '#ED7100', providerIcon: '/aws_icons/Arch_AWS-Fargate_32.svg' },
  { type: 'compute_ecr', label: 'ECR', icon: Server, color: '#ED7100', providerIcon: '/aws_icons/Arch_Amazon-Elastic-Container-Registry_32.svg' },
  // Messaging
  { type: 'messaging_sqs', label: 'SQS', icon: MessageSquare, color: '#E7157B', providerIcon: '/aws_icons/Arch_Amazon-Simple-Queue-Service_32.svg' },
  { type: 'messaging_msk', label: 'MSK (Kafka)', icon: MessageSquare, color: '#E7157B', providerIcon: '/aws_icons/Arch_Amazon-Managed-Streaming-for-Apache-Kafka_32.svg' },
  // Security
  { type: 'security_secrets_manager', label: 'Secrets Manager', icon: Shield, color: '#DD344C', providerIcon: '/aws_icons/Arch_AWS-Secrets-Manager_32.svg' },
  { type: 'security_kms', label: 'KMS', icon: Shield, color: '#DD344C', providerIcon: '/aws_icons/Arch_AWS-Key-Management-Service_32.svg' },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', providerIcon: null },
]

const GCP_RESOURCES: ProviderResources[] = [
  // Databases
  { type: 'database_cloud_sql', label: 'Cloud SQL', icon: Database, color: '#4285F4', providerIcon: '/gcp_icons/cloud-sql.svg' },
  { type: 'database_cloud_spanner', label: 'Cloud Spanner', icon: Database, color: '#4285F4', providerIcon: '/gcp_icons/cloud-spanner.svg' },
  { type: 'database_bigquery', label: 'BigQuery', icon: Database, color: '#4285F4', providerIcon: '/gcp_icons/bigquery.svg' },
  { type: 'database_alloydb', label: 'AlloyDB', icon: Database, color: '#4285F4', providerIcon: '/gcp_icons/alloydb.svg' },
  // Storage
  { type: 'storage_cloud_storage', label: 'Cloud Storage', icon: HardDrive, color: '#34A853', providerIcon: '/gcp_icons/cloud-storage.svg' },
  // Compute
  { type: 'compute_gke', label: 'GKE', icon: Server, color: '#4285F4', providerIcon: '/gcp_icons/gke.svg' },
  { type: 'compute_cloud_run', label: 'Cloud Run', icon: Server, color: '#4285F4', providerIcon: '/gcp_icons/cloud-run.svg' },
  { type: 'compute_compute_engine', label: 'Compute Engine', icon: Server, color: '#4285F4', providerIcon: '/gcp_icons/compute-engine.svg' },
  // AI/ML
  { type: 'ai_vertex_ai', label: 'Vertex AI', icon: Cloud, color: '#FBBC04', providerIcon: '/gcp_icons/vertex-ai.svg' },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', providerIcon: null },
]

const AZURE_RESOURCES: ProviderResources[] = [
  // Databases
  { type: 'database_sql_database', label: 'SQL Database', icon: Database, color: '#0078D4', providerIcon: '/azure_icons/sql-database.svg' },
  { type: 'database_cosmos_db', label: 'Cosmos DB', icon: Database, color: '#0078D4', providerIcon: '/azure_icons/cosmos-db.svg' },
  { type: 'database_redis_cache', label: 'Redis Cache', icon: Database, color: '#0078D4', providerIcon: '/azure_icons/redis-cache.svg' },
  // Storage
  { type: 'storage_storage_account', label: 'Storage Account', icon: HardDrive, color: '#0078D4', providerIcon: '/azure_icons/storage-account.svg' },
  // Compute
  { type: 'compute_aks', label: 'AKS', icon: Server, color: '#0078D4', providerIcon: '/azure_icons/aks.svg' },
  { type: 'compute_app_service', label: 'App Service', icon: Server, color: '#0078D4', providerIcon: '/azure_icons/app-service.svg' },
  { type: 'compute_functions', label: 'Functions', icon: Server, color: '#0078D4', providerIcon: '/azure_icons/functions.svg' },
  { type: 'compute_virtual_machine', label: 'Virtual Machine', icon: Server, color: '#0078D4', providerIcon: '/azure_icons/virtual-machine.svg' },
  { type: 'compute_container_instances', label: 'Container Instances', icon: Server, color: '#0078D4', providerIcon: '/azure_icons/container-instances.svg' },
  // Network
  { type: 'network_load_balancer', label: 'Load Balancer', icon: Network, color: '#773ADC', providerIcon: '/azure_icons/load-balancer.svg' },
  { type: 'network_front_door', label: 'Front Door', icon: Network, color: '#773ADC', providerIcon: '/azure_icons/front-door.svg' },
  // Messaging
  { type: 'messaging_service_bus', label: 'Service Bus', icon: MessageSquare, color: '#50E6FF', providerIcon: '/azure_icons/service-bus.svg' },
  // Security
  { type: 'security_key_vault', label: 'Key Vault', icon: Shield, color: '#DD344C', providerIcon: '/azure_icons/key-vault.svg' },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', providerIcon: null },
]

// Scaleway - Generic cloud resources with Scaleway branding colors
const SCALEWAY_RESOURCES: ProviderResources[] = [
  // Databases
  { type: 'database_managed_db', label: 'Managed Database', icon: Database, color: '#4F0599', providerIcon: null },
  { type: 'database_redis', label: 'Redis', icon: Database, color: '#4F0599', providerIcon: null },
  { type: 'database_serverless_db', label: 'Serverless DB', icon: Database, color: '#4F0599', providerIcon: null },
  // Storage
  { type: 'storage_object_storage', label: 'Object Storage', icon: HardDrive, color: '#4F0599', providerIcon: null },
  { type: 'storage_block_storage', label: 'Block Storage', icon: HardDrive, color: '#4F0599', providerIcon: null },
  // Compute
  { type: 'compute_instance', label: 'Instance', icon: Server, color: '#4F0599', providerIcon: null },
  { type: 'compute_kapsule', label: 'Kapsule (K8s)', icon: Server, color: '#4F0599', providerIcon: null },
  { type: 'compute_serverless_container', label: 'Serverless Container', icon: Server, color: '#4F0599', providerIcon: null },
  { type: 'compute_serverless_function', label: 'Serverless Function', icon: Server, color: '#4F0599', providerIcon: null },
  // Network
  { type: 'network_load_balancer', label: 'Load Balancer', icon: Network, color: '#4F0599', providerIcon: null },
  { type: 'network_vpc', label: 'VPC', icon: Network, color: '#4F0599', providerIcon: null },
  // Messaging
  { type: 'messaging_queues', label: 'Messaging Queues', icon: MessageSquare, color: '#4F0599', providerIcon: null },
  // Security
  { type: 'security_secret_manager', label: 'Secret Manager', icon: Shield, color: '#4F0599', providerIcon: null },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', providerIcon: null },
]

// On-Premise - Generic infrastructure resources
const ONPREMISE_RESOURCES: ProviderResources[] = [
  // Databases
  { type: 'database_postgresql', label: 'PostgreSQL', icon: Database, color: '#336791', providerIcon: null },
  { type: 'database_mysql', label: 'MySQL', icon: Database, color: '#4479A1', providerIcon: null },
  { type: 'database_mongodb', label: 'MongoDB', icon: Database, color: '#47A248', providerIcon: null },
  { type: 'database_redis', label: 'Redis', icon: Database, color: '#DC382D', providerIcon: null },
  { type: 'database_elasticsearch', label: 'Elasticsearch', icon: Database, color: '#005571', providerIcon: null },
  // Storage
  { type: 'storage_nfs', label: 'NFS Storage', icon: HardDrive, color: '#6b7280', providerIcon: null },
  { type: 'storage_san', label: 'SAN Storage', icon: HardDrive, color: '#6b7280', providerIcon: null },
  { type: 'storage_minio', label: 'MinIO', icon: HardDrive, color: '#C72C48', providerIcon: null },
  // Compute
  { type: 'compute_vm', label: 'Virtual Machine', icon: Server, color: '#6b7280', providerIcon: null },
  { type: 'compute_kubernetes', label: 'Kubernetes', icon: Server, color: '#326CE5', providerIcon: null },
  { type: 'compute_docker', label: 'Docker', icon: Server, color: '#2496ED', providerIcon: null },
  { type: 'compute_bare_metal', label: 'Bare Metal', icon: Server, color: '#6b7280', providerIcon: null },
  // Network
  { type: 'network_load_balancer', label: 'Load Balancer', icon: Network, color: '#6b7280', providerIcon: null },
  { type: 'network_firewall', label: 'Firewall', icon: Network, color: '#6b7280', providerIcon: null },
  { type: 'network_vpn', label: 'VPN', icon: Network, color: '#6b7280', providerIcon: null },
  // Messaging
  { type: 'messaging_rabbitmq', label: 'RabbitMQ', icon: MessageSquare, color: '#FF6600', providerIcon: null },
  { type: 'messaging_kafka', label: 'Kafka', icon: MessageSquare, color: '#231F20', providerIcon: null },
  // Security
  { type: 'security_vault', label: 'Vault', icon: Shield, color: '#000000', providerIcon: null },
  { type: 'security_ldap', label: 'LDAP', icon: Shield, color: '#6b7280', providerIcon: null },
  // Other
  { type: 'other_custom', label: 'Custom', icon: Cloud, color: '#64748b', providerIcon: null },
]

// Get resources based on provider
function getResourcesForProvider(provider: string): ProviderResources[] {
  switch (provider) {
    case 'GCP':
      return GCP_RESOURCES
    case 'Azure':
      return AZURE_RESOURCES
    case 'Scaleway':
      return SCALEWAY_RESOURCES
    case 'On-Premise':
      return ONPREMISE_RESOURCES
    case 'AWS':
    default:
      return AWS_RESOURCES
  }
}

// Legacy QUICK_ADD_RESOURCES for backward compatibility
const QUICK_ADD_RESOURCES = AWS_RESOURCES

// Helper function to render resource icon based on provider
function renderResourceIcon(resource: ProviderResources, provider: string, className: string = 'w-4 h-4') {
  if (resource.providerIcon) {
    return <img src={resource.providerIcon} alt={resource.label} className={className} style={{ width: '20px', height: '20px' }} />
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

interface CatalogDetailProps {
  serviceNameProp?: string
  onClose?: () => void
}

export default function CatalogDetail({ serviceNameProp, onClose }: CatalogDetailProps = {}) {
  const params = useParams<{ serviceName: string }>()
  const serviceName = serviceNameProp ?? params.serviceName
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Panel (right-side drawer) state
  const [expanded, setExpanded] = useState(false)
  const handleClose = useCallback(() => {
    if (onClose) onClose()
    else navigate('/catalog')
  }, [onClose, navigate])

  // Active tab (internal state — no URL routing in panel mode)
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'deployments'>('overview')
  const handleTabChange = (value: string) => setActiveTab(value as 'overview' | 'graph' | 'deployments')

  // Close on Escape + lock body scroll while panel is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [handleClose])

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

  // HUD color helpers (shared visual language with EventDetailsModal / Streamline)
  const a = (v: string, o: number) => `rgb(var(--hud-${v}) / ${o})`
  const T = {
    bg: 'rgb(var(--hud-bg))',
    surface: 'rgb(var(--hud-surface))',
    surfaceLow: 'rgb(var(--hud-surface-low))',
    surfaceHigh: 'rgb(var(--hud-surface-high))',
    surfaceHighest: 'rgb(var(--hud-surface-highest))',
    primary: 'rgb(var(--hud-primary))',
    primaryDim: 'rgb(var(--hud-primary-dim))',
    tertiary: 'rgb(var(--hud-tertiary))',
    error: 'rgb(var(--hud-error))',
    success: 'rgb(var(--hud-success))',
    onSurface: 'rgb(var(--hud-on-surface))',
    onSurfaceVar: 'rgb(var(--hud-on-surface-var))',
    outline: 'rgb(var(--hud-outline))',
    outlineVar: 'rgb(var(--hud-outline-var))',
  }

  // Deployments: fixed 30-day window (last 30 days only)
  const getStartDate = useCallback((): string => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return startDate.toISOString()
  }, [])

  const { data: allCatalogs, isLoading: catalogsLoading } = useQuery({
    queryKey: ['catalog', 'list'],
    queryFn: () => catalogApi.list({ perPage: 1000 }),
  })

  // Fetch deployments for this service (last 30 days)
  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments', serviceName, '30d'],
    queryFn: () => eventsApi.search({
      service: serviceName,
      type: 1, // deployment
      startDate: getStartDate(),
      endDate: new Date().toISOString()
    }),
    enabled: !!serviceName,
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
    const resourceConfig = getResourcesForProvider(selectedProvider).find(r => r.type === resourceType)
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
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="animate-slide-in relative h-full w-full max-w-2xl shadow-2xl flex items-center justify-center" style={{ background: T.surface, borderLeft: `1px solid ${a('outline-var', 0.2)}` }}>
          <div className="text-center">
            {catalogsLoading ? (
              <p style={{ color: T.onSurfaceVar }}>Loading…</p>
            ) : (
              <>
                <p style={{ color: T.onSurfaceVar }}>Service not found</p>
                <button onClick={handleClose} className="mt-4 btn-primary">Back to Catalog</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Side Panel */}
      <div className={`animate-slide-in relative h-full shadow-2xl overflow-hidden flex flex-col transition-[max-width] duration-300 ease-out w-full ${expanded ? 'max-w-full' : 'max-w-5xl'}`}
        style={{ background: T.bg, borderLeft: `1px solid ${a('outline-var', 0.2)}` }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-5 shrink-0" style={{ borderBottom: `1px solid ${a('outline-var', 0.15)}`, background: T.surface }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight truncate" style={{ color: T.onSurface, fontFamily: "'Space Grotesk',sans-serif" }}>
                {service.name}
              </h2>
              <p className="mt-1 text-sm" style={{ color: T.onSurfaceVar }}>
                {service.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-bold shadow-lg"
                style={{ background: T.primary, color: '#ffffff', boxShadow: `0 4px 16px ${a('primary', 0.2)}` }}
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-2.5 rounded-lg transition-all"
                style={{ background: a('error', 0.1), color: T.error, border: `1px solid ${a('error', 0.2)}` }}
                title="Delete service"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse panel' : 'Expand to full width'}
                className="hidden md:flex p-2.5 rounded-lg transition-all" style={{ background: T.surfaceHigh, color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.2)}` }}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={handleClose} className="p-2.5 rounded-lg transition-all" style={{ color: T.onSurfaceVar }}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: `${a('outline-var', 0.4)} transparent` }}>
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={activeTab === 'overview'
              ? { background: a('primary', 0.16), color: T.primary, border: `1px solid ${a('primary', 0.3)}` }
              : { background: a('outline-var', 0.08), color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.14)}` }}
          >
            <Package className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('graph')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={activeTab === 'graph'
              ? { background: a('primary', 0.16), color: T.primary, border: `1px solid ${a('primary', 0.3)}` }
              : { background: a('outline-var', 0.08), color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.14)}` }}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Dependency Graph
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('deployments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={activeTab === 'deployments'
              ? { background: a('primary', 0.16), color: T.primary, border: `1px solid ${a('primary', 0.3)}` }
              : { background: a('outline-var', 0.08), color: T.onSurfaceVar, border: `1px solid ${a('outline-var', 0.14)}` }}
          >
            <Rocket className="w-3.5 h-3.5" />
            Deployments
            {deploymentsData?.events && deploymentsData.events.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: a('outline-var', 0.16), color: T.onSurfaceVar }}>
                {deploymentsData.events.length}
              </span>
            )}
          </button>
        </div>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-0">

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
          <span className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0" style={{ background: a('primary', 0.1), color: T.primary, borderColor: a('primary', 0.25) }}>
            <Package className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none" style={{ color: T.onSurface }}>{service.version || '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: T.onSurfaceVar }}>Version</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
          <span className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0" style={{ background: '#EFF4FF', color: '#1B3575', borderColor: '#C2D0EF' }}>
            <GitBranch className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none" style={{ color: T.onSurface }}>{service.dependenciesIn?.length || 0}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: T.onSurfaceVar }}>Upstream deps</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
          <span className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0" style={{ background: '#ECFDF3', color: '#166534', borderColor: '#BBF7D0' }}>
            <GitBranch className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none" style={{ color: T.onSurface }}>{service.dependenciesOut?.length || 0}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: T.onSurfaceVar }}>Downstream deps</p>
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: a('outline-var', 0.4) }}>
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2" style={{ color: T.onSurfaceVar }}>
            <Package className="w-4 h-4" />
            <span>Service Information</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {/* Type */}
          <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${a('outline-var', 0.3)}`, borderRight: `1px solid ${a('outline-var', 0.3)}` }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Type</span>
            <div className="flex items-center gap-1.5">
              <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: '#EFF4FF', color: '#1B3575', borderColor: '#C2D0EF' }}>
                <Code className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-semibold uppercase" style={{ color: '#1B3575' }}>{getCatalogTypeLabel(service.type)}</span>
            </div>
          </div>
          {/* Language */}
          <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${a('outline-var', 0.3)}`, borderRight: `1px solid ${a('outline-var', 0.3)}` }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Language</span>
            <div className="flex items-center gap-1.5">
              <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: T.surfaceHigh, color: T.onSurfaceVar, borderColor: a('outline-var', 0.35) }}>
                {getLanguageIcon(service.languages)}
              </span>
              <span className="text-[10px] font-semibold uppercase" style={{ color: T.onSurfaceVar }}>{getLanguageLabel(service.languages)}</span>
            </div>
          </div>
          {/* Platform */}
          <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${a('outline-var', 0.3)}`, borderRight: `1px solid ${a('outline-var', 0.3)}` }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Platform</span>
            {service.platform ? (
              <div className="flex items-center gap-1.5">
                <span className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: '#EFF4FF', color: '#1B3575', borderColor: '#C2D0EF' }}>
                  {service.platform === Platform.KUBERNETES ? <KubernetesIcon className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                </span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#1B3575' }}>{getPlatformLabel(service.platform)}</span>
              </div>
            ) : (
              <span className="text-xs" style={{ color: T.onSurfaceVar }}>—</span>
            )}
          </div>
          {/* Owner */}
          <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${a('outline-var', 0.3)}` }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.onSurfaceVar }}>Owner</span>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: T.primary }}>
                {(service.owner || '?').split(/[\s.@]/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('') || '?'}
              </span>
              <span className="text-sm font-semibold truncate" style={{ color: T.onSurface }}>{service.owner || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Links */}
        {(service.repository || service.link || (service.communicationChannels && service.communicationChannels.length > 0) || (service.dashboardLinks && service.dashboardLinks.length > 0)) && (
          <div className="px-5 py-4 border-t" style={{ borderColor: a('outline-var', 0.4) }}>
            <span className="block text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: T.onSurfaceVar }}>Links</span>
            <div className="flex flex-wrap gap-2">
              {service.repository && (
                <a href={service.repository} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                   style={{ background: T.surfaceHigh, color: T.onSurface, border: `1px solid ${a('outline-var', 0.3)}` }}>
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" style={{ color: T.onSurfaceVar }} />
                </a>
              )}
              {service.link && (
                <a href={service.link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                   style={{ background: a('primary', 0.1), color: T.primary, border: `1px solid ${a('primary', 0.25)}` }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Documentation</span>
                </a>
              )}
              {service.communicationChannels && service.communicationChannels.map((channel, index) => (
                <a key={`comm-${index}`} href={channel.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border"
                  style={getCommunicationChannelStyles(channel.type)}
                  title={channel.description || `${channel.name} (${getCommunicationChannelLabel(channel.type)})`}>
                  {getCommunicationChannelIcon(channel.type)}
                  <span>{channel.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ))}
              {service.dashboardLinks && service.dashboardLinks.map((dashboard, index) => (
                <a key={`dash-${index}`} href={dashboard.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border"
                  style={getDashboardLinkStyles(dashboard.type)}
                  title={dashboard.description || `${dashboard.name} (${getDashboardLabel(dashboard.type)})`}>
                  {getDashboardIcon(dashboard.type)}
                  <span>{dashboard.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Upstream Dependencies */}
        <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: a('outline-var', 0.4) }}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2" style={{ color: T.onSurfaceVar }}>
              <GitBranch className="w-4 h-4" style={{ color: '#1B3575' }} />
              <span>Upstream</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#EFF4FF', color: '#1B3575' }}>{service.dependenciesIn?.length || 0}</span>
          </div>
          {service.dependenciesIn && service.dependenciesIn.length > 0 ? (
            <ul className="p-3 space-y-2">
              {service.dependenciesIn.map(dep => (
                <li key={dep}>
                  <Link to={`/catalog/${dep}`} className="flex items-center gap-2 p-2.5 rounded-lg transition-all" style={{ background: '#EFF4FF', border: '1px solid #C2D0EF' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center border shrink-0" style={{ background: '#FFFFFF', color: '#1B3575', borderColor: '#C2D0EF' }}>
                      <Package className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#1B3575' }}>{dep}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-xs" style={{ color: T.onSurfaceVar }}>No upstream dependencies</p>
          )}
        </div>

        {/* Downstream Dependencies */}
        <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: a('outline-var', 0.4) }}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2" style={{ color: T.onSurfaceVar }}>
              <GitBranch className="w-4 h-4" style={{ color: '#166534' }} />
              <span>Downstream</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#ECFDF3', color: '#166534' }}>{service.dependenciesOut?.length || 0}</span>
          </div>
          {service.dependenciesOut && service.dependenciesOut.length > 0 ? (
            <ul className="p-3 space-y-2">
              {service.dependenciesOut.map(dep => (
                <li key={dep}>
                  <Link to={`/catalog/${dep}`} className="flex items-center gap-2 p-2.5 rounded-lg transition-all" style={{ background: '#ECFDF3', border: '1px solid #BBF7D0' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center border shrink-0" style={{ background: '#FFFFFF', color: '#166534', borderColor: '#BBF7D0' }}>
                      <Package className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#166534' }}>{dep}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-xs" style={{ color: T.onSurfaceVar }}>No downstream dependencies</p>
          )}
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

      {/* Infrastructure Resources Management */}
      <div className="grid grid-cols-1 gap-1.5">
        <InfrastructureResourceManager
          resources={service.infrastructureResources || []}
          onChange={handleUpdateInfrastructureResources}
        />
      </div>

        </TabsContent>

        {/* Dependency Graph Tab Content */}
        <TabsContent value="graph" className="mt-0">
      {/* Dependency Graph with Drag & Drop */}
      <div className="rounded-xl overflow-hidden relative" style={{ height: '650px', background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
        <div className="p-4 border-b" style={{ background: T.surfaceLow, borderColor: a('outline-var', 0.4) }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: T.onSurface }}>
                <GitBranch className="w-5 h-5" style={{ color: T.primary }} />
                <span>Dependency Graph</span>
                {isEditingGraph && (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md border" style={{ background: '#FFF8E8', color: '#8C5A00', borderColor: '#FFE0A0' }}>
                    Editing
                  </span>
                )}
              </h3>
              <p className="text-xs mt-1" style={{ color: T.onSurfaceVar }}>
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
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: T.onSurfaceVar }}>
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
          <div className="w-56 border-r p-3 overflow-y-auto" style={{ borderColor: a('outline-var', 0.4), background: T.surfaceLow }}>
            <div className="mb-3">
              <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>
                Cloud Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={!isEditingGraph}
                className="select text-xs disabled:opacity-50"
                style={{ height: '32px' }}
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('database_')).map((resource) => (
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('storage_')).map((resource) => (
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('network_')).map((resource) => (
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('compute_')).map((resource) => (
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('messaging_')).map((resource) => (
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
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('security_')).map((resource) => (
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
            
            {/* AI/ML (only show if provider has AI resources) */}
            {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('ai_')).length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">AI / ML</div>
              <div className="space-y-1">
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('ai_')).map((resource) => (
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
            )}

            {/* Other */}
            <div className="mb-3">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">Other</div>
              <div className="space-y-1">
                {getResourcesForProvider(selectedProvider).filter(r => r.type.startsWith('other_')).map((resource) => (
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
                    const resourceConfig = getResourcesForProvider(resource.provider || 'AWS').find(r => r.type === resource.type)
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
        </TabsContent>

        {/* Deployments Tab Content */}
        <TabsContent value="deployments" className="space-y-6 mt-0">
          {/* Deployments Stats */}
          {deploymentsData?.events && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: '#EFF4FF', color: '#1B3575', borderColor: '#C2D0EF' }}>
                  <Rocket className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: T.onSurface }}>{deploymentsData.events.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Total Deployments</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: '#ECFDF3', color: '#166534', borderColor: '#BBF7D0' }}>
                  <Check className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: T.onSurface }}>
                    {deploymentsData.events.filter(e => e.attributes.status === Status.SUCCESS).length}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Successful</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: '#FEECEC', color: '#B42318', borderColor: '#FBD4D4' }}>
                  <X className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: T.onSurface }}>
                    {deploymentsData.events.filter(e => e.attributes.status === Status.FAILURE || e.attributes.status === Status.ERROR).length}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>Failed</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: '#FFF8E8', color: '#8C5A00', borderColor: '#FFE0A0' }}>
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold" style={{ color: T.onSurface }}>
                    {deploymentsData.events.filter(e => e.attributes.status === Status.IN_PROGRESS || e.attributes.status === Status.START).length}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.onSurfaceVar }}>In Progress</p>
                </div>
              </div>
            </div>
          )}

          {/* Deployments Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.5)}` }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: a('outline-var', 0.4) }}>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2" style={{ color: T.onSurfaceVar }}>
                <Rocket className="w-4 h-4" />
                <span>Deployment History</span>
              </h3>
            </div>
            
            {deploymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: a('primary', 0.25), borderTopColor: T.primary }} />
              </div>
            ) : deploymentsData?.events && deploymentsData.events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead style={{ background: T.surfaceLow }}>
                    <tr style={{ borderBottom: `1px solid ${a('outline-var', 0.4)}` }}>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>Title</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>Status</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>Environment</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>Date</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: T.onSurfaceVar }}>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deploymentsData.events.map((deployment) => {
                      const sv = getStatusVisual(deployment.attributes.status)
                      return (
                      <tr 
                        key={deployment.metadata?.id} 
                        className="cursor-pointer transition-colors hover:brightness-[0.98]"
                        style={{ borderBottom: `1px solid ${a('outline-var', 0.25)}` }}
                        onClick={() => navigate(`/events/${deployment.metadata?.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-md flex items-center justify-center border shrink-0" style={{ background: '#EFF4FF', color: '#1B3575', borderColor: '#C2D0EF' }}>
                              <Rocket className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: T.onSurface }}>
                                {deployment.title}
                              </div>
                              {deployment.attributes.message && (
                                <div className="text-xs truncate max-w-xs" style={{ color: T.onSurfaceVar }}>
                                  {deployment.attributes.message}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ background: sv.bg, color: sv.text, borderColor: sv.border }}>
                              <i className={`fa-solid ${sv.icon} text-[10px]`} />
                            </span>
                            <span className="text-[10px] font-semibold uppercase" style={{ color: sv.text }}>{sv.label}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {deployment.attributes.environment ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase border" style={{ background: a('outline-var', 0.1), color: T.onSurfaceVar, borderColor: a('outline-var', 0.3) }}>
                              {deployment.attributes.environment}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: T.onSurfaceVar }}>-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: T.onSurfaceVar }}>
                          {deployment.metadata?.createdAt ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(deployment.metadata.createdAt)}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: T.onSurfaceVar }}>
                          {deployment.attributes.owner || '-'}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 mx-auto mb-4" style={{ color: a('outline-var', 0.6) }} />
                <p className="font-medium" style={{ color: T.onSurfaceVar }}>No deployments found</p>
                <p className="text-sm mt-1" style={{ color: T.onSurfaceVar }}>
                  No deployments recorded for this service in the last 30 days
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>

      {/* Add Resource Modal */}
      {showAddResourceModal && newResourceType && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: a('primary', 0.1), borderColor: a('primary', 0.2) }}>
                    {(() => {
                      const resourceConfig = getResourcesForProvider(selectedProvider).find(r => r.type === newResourceType)
                      const IconComponent = resourceConfig?.icon || Database
                      return <IconComponent className="w-5 h-5" style={{ color: resourceConfig?.color || '#6366f1' }} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: T.onSurface }}>
                      Add Infrastructure Resource
                    </h3>
                    <p className="text-sm" style={{ color: T.onSurfaceVar }}>
                      {getResourcesForProvider(selectedProvider).find(r => r.type === newResourceType)?.label} ({selectedProvider})
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelAddResource}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: T.onSurfaceVar }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
                  Resource Name
                </label>
                <input
                  type="text"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="e.g., users-database, cache-redis"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmAddResource()
                    if (e.key === 'Escape') cancelAddResource()
                  }}
                />
                <p className="mt-2 text-xs" style={{ color: T.onSurfaceVar }}>
                  Give a meaningful name to identify this resource in your architecture
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelAddResource}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{ background: T.surfaceHigh, color: T.onSurface, border: `1px solid ${a('outline-var', 0.2)}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddResource}
                  disabled={!newResourceName.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                  style={{ background: T.primary, color: '#ffffff' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Resource</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditResourceModal && editingResource && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: a('primary', 0.1), borderColor: a('primary', 0.2) }}>
                    {(() => {
                      const resourceConfig = getResourcesForProvider(editingResource.provider || 'AWS').find(r => r.type === editingResource.type)
                      const IconComponent = resourceConfig?.icon || Database
                      return <IconComponent className="w-5 h-5" style={{ color: resourceConfig?.color || '#3b82f6' }} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: T.onSurface }}>
                      Edit Infrastructure Resource
                    </h3>
                    <p className="text-sm" style={{ color: T.onSurfaceVar }}>
                      {getResourcesForProvider(editingResource.provider || 'AWS').find(r => r.type === editingResource.type)?.label || editingResource.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelEditResource}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: T.onSurfaceVar }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
                    Resource Name
                  </label>
                  <input
                    type="text"
                    value={editResourceName}
                    onChange={(e) => setEditResourceName(e.target.value)}
                    placeholder="e.g., users-database, cache-redis"
                    className="input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEditResource()
                      if (e.key === 'Escape') cancelEditResource()
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
                    Cloud Provider
                  </label>
                  <select
                    value={editResourceProvider}
                    onChange={(e) => setEditResourceProvider(e.target.value)}
                    className="select"
                  >
                    <option value="AWS">AWS</option>
                    <option value="Azure">Azure</option>
                    <option value="GCP">Google Cloud</option>
                    <option value="Scaleway">Scaleway</option>
                    <option value="On-Premise">On-Premise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.onSurfaceVar }}>
                    Description (optional)
                  </label>
                  <textarea
                    value={editResourceDescription}
                    onChange={(e) => setEditResourceDescription(e.target.value)}
                    placeholder="Brief description of this resource..."
                    rows={2}
                    className="input resize-none"
                    style={{ height: 'auto' }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelEditResource}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{ background: T.surfaceHigh, color: T.onSurface, border: `1px solid ${a('outline-var', 0.2)}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEditResource}
                  disabled={!editResourceName.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                  style={{ background: T.primary, color: '#ffffff' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" style={{ background: T.surface, border: `1px solid ${a('outline-var', 0.2)}` }}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border" style={{ background: a('error', 0.1), borderColor: a('error', 0.2) }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: T.error }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: T.onSurface }}>
                      Delete Service
                    </h3>
                    <p className="text-sm" style={{ color: T.onSurfaceVar }}>
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: T.onSurfaceVar }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="mb-3" style={{ color: T.onSurface }}>
                  Are you sure you want to delete the service <span className="font-bold">"{service.name}"</span>?
                </p>
                <div className="rounded-lg p-3" style={{ background: a('error', 0.08), border: `1px solid ${a('error', 0.2)}` }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.error }} />
                    <div className="text-sm" style={{ color: T.error }}>
                      <p className="font-semibold mb-1">This will permanently delete:</p>
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
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{ background: T.surfaceHigh, color: T.onSurface, border: `1px solid ${a('outline-var', 0.2)}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                  style={{ background: T.error }}
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
    </>
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

// Helper function to format date for deployments
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Helper function to get status color classes for deployments
function getStatusColor(status?: Status): string {
  switch (status) {
    case Status.SUCCESS:
    case Status.DONE:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case Status.FAILURE:
    case Status.ERROR:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case Status.WARNING:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case Status.IN_PROGRESS:
    case Status.START:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case Status.PLANNED:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

function getStatusVisual(status?: Status): { bg: string; text: string; border: string; label: string; icon: string } {
  switch (status) {
    case Status.SUCCESS:
    case Status.DONE:
      return { bg: '#ECFDF3', text: '#166534', border: '#BBF7D0', label: 'Success', icon: 'fa-circle-check' }
    case Status.FAILURE:
    case Status.ERROR:
      return { bg: '#FEECEC', text: '#B42318', border: '#FBD4D4', label: 'Failed', icon: 'fa-circle-xmark' }
    case Status.WARNING:
      return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0', label: 'Warning', icon: 'fa-triangle-exclamation' }
    case Status.IN_PROGRESS:
    case Status.START:
      return { bg: '#EFF4FF', text: '#1B3575', border: '#C2D0EF', label: 'In Progress', icon: 'fa-satellite-dish' }
    case Status.PLANNED:
      return { bg: '#F3EEFF', text: '#5B21B6', border: '#DDCFFA', label: 'Planned', icon: 'fa-clock' }
    case Status.WAITING_APPROVAL:
      return { bg: '#FFF8E8', text: '#8C5A00', border: '#FFE0A0', label: 'Awaiting', icon: 'fa-hourglass-half' }
    default:
      return { bg: '#EEF1F8', text: '#6E7891', border: '#D5DBE8', label: String(status || 'Unknown'), icon: 'fa-circle-info' }
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
  'database_elasticache': '/aws_icons/Arch_Amazon-ElastiCache_32.svg',
  'database_neptune': '/aws_icons/Arch_Amazon-Neptune_32.svg',
  'database_keyspaces': '/aws_icons/Arch_Amazon-Keyspaces_32.svg',
  'database_timestream': '/aws_icons/Arch_Amazon-Timestream_32.svg',
  'database_memorydb': '/aws_icons/Arch_Amazon-MemoryDB_32.svg',
  'database_oracle': '/aws_icons/Arch_Oracle-Database-at-AWS_32.svg',
  'database_dms': '/aws_icons/Arch_AWS-Database-Migration-Service_32.svg',
  // Legacy database mappings (for backward compatibility)
  'database_postgresql': '/aws_icons/Arch_Amazon-RDS_32.svg',
  'database_mysql': '/aws_icons/Arch_Amazon-RDS_32.svg',
  'database_redis': '/aws_icons/Arch_Amazon-ElastiCache_32.svg',
  'database_mongodb': '/aws_icons/Arch_Amazon-DynamoDB_32.svg',
  'database_elasticsearch': '/aws_icons/Arch_Amazon-Neptune_32.svg',
  // Storage
  'storage_s3': '/aws_icons/Arch_Amazon-Simple-Storage-Service_32.svg',
  'storage_efs': '/aws_icons/Arch_Amazon-EFS_32.svg',
  'storage_ebs': '/aws_icons/Arch_Amazon-Elastic-Block-Store_32.svg',
  'storage_file_cache': '/aws_icons/Arch_Amazon-File-Cache_32.svg',
  'storage_backup': '/aws_icons/Arch_AWS-Backup_32.svg',
  // Network
  'network_load_balancer': '/aws_icons/Arch_Elastic-Load-Balancing_32.svg',
  'network_cloudfront': '/aws_icons/Arch_Amazon-CloudFront_32.svg',
  'network_route53': '/aws_icons/Arch_Amazon-Route-53_32.svg',
  'network_transit_gateway': '/aws_icons/Arch_AWS-Transit-Gateway_32.svg',
  'network_privatelink': '/aws_icons/Arch_AWS-PrivateLink_32.svg',
  'network_client_vpn': '/aws_icons/Arch_AWS-Client-VPN_32.svg',
  'network_site_to_site_vpn': '/aws_icons/Arch_AWS-Site-to-Site-VPN_32.svg',
  // Legacy network mappings (for backward compatibility)
  'network_api_gateway': '/aws_icons/Arch_Amazon-Route-53_32.svg',
  'network_vpc': '/aws_icons/Arch_AWS-Transit-Gateway_32.svg',
  // Compute
  'compute_ecs': '/aws_icons/Arch_Amazon-Elastic-Container-Service_32.svg',
  'compute_eks': '/aws_icons/Arch_Amazon-Elastic-Kubernetes-Service_32.svg',
  'compute_fargate': '/aws_icons/Arch_AWS-Fargate_32.svg',
  'compute_ecr': '/aws_icons/Arch_Amazon-Elastic-Container-Registry_32.svg',
  // Messaging
  'messaging_sqs': '/aws_icons/Arch_Amazon-Simple-Queue-Service_32.svg',
  'messaging_msk': '/aws_icons/Arch_Amazon-Managed-Streaming-for-Apache-Kafka_32.svg',
  // Security
  'security_secrets_manager': '/aws_icons/Arch_AWS-Secrets-Manager_32.svg',
  'security_kms': '/aws_icons/Arch_AWS-Key-Management-Service_32.svg',
  // Cache (legacy)
  'cache_elasticache': '/aws_icons/Arch_Amazon-ElastiCache_32.svg',
  'cache_memorydb': '/aws_icons/Arch_Amazon-MemoryDB_32.svg',
  // Other (legacy)
  'other_backup': '/aws_icons/Arch_AWS-Backup_32.svg',
  'other_dms': '/aws_icons/Arch_AWS-Database-Migration-Service_32.svg',
}

// GCP Icon mapping for infrastructure types
const GCP_ICON_MAP: Record<string, string> = {
  // Databases
  'database_cloud_sql': '/gcp_icons/cloud-sql.svg',
  'database_cloud_spanner': '/gcp_icons/cloud-spanner.svg',
  'database_bigquery': '/gcp_icons/bigquery.svg',
  'database_alloydb': '/gcp_icons/alloydb.svg',
  // Storage
  'storage_cloud_storage': '/gcp_icons/cloud-storage.svg',
  // Compute
  'compute_gke': '/gcp_icons/gke.svg',
  'compute_cloud_run': '/gcp_icons/cloud-run.svg',
  'compute_compute_engine': '/gcp_icons/compute-engine.svg',
  // AI/ML
  'ai_vertex_ai': '/gcp_icons/vertex-ai.svg',
}

// Azure Icon mapping for infrastructure types
const AZURE_ICON_MAP: Record<string, string> = {
  // Databases
  'database_sql_database': '/azure_icons/sql-database.svg',
  'database_cosmos_db': '/azure_icons/cosmos-db.svg',
  'database_redis_cache': '/azure_icons/redis-cache.svg',
  // Storage
  'storage_storage_account': '/azure_icons/storage-account.svg',
  // Compute
  'compute_aks': '/azure_icons/aks.svg',
  'compute_app_service': '/azure_icons/app-service.svg',
  'compute_functions': '/azure_icons/functions.svg',
  'compute_virtual_machine': '/azure_icons/virtual-machine.svg',
  'compute_container_instances': '/azure_icons/container-instances.svg',
  // Network
  'network_load_balancer': '/azure_icons/load-balancer.svg',
  'network_front_door': '/azure_icons/front-door.svg',
  // Messaging
  'messaging_service_bus': '/azure_icons/service-bus.svg',
  // Security
  'security_key_vault': '/azure_icons/key-vault.svg',
}

// Get icon map based on provider
function getIconMapForProvider(provider?: string): Record<string, string> {
  switch (provider) {
    case 'GCP':
      return GCP_ICON_MAP
    case 'Azure':
      return AZURE_ICON_MAP
    case 'AWS':
    default:
      return AWS_ICON_MAP
  }
}

function getInfrastructureIconComponent(type: string, className: string, color: string, provider?: string) {
  const iconMap = getIconMapForProvider(provider)
  
  // Use provider-specific icons when available
  if (iconMap[type]) {
    return (
      <img 
        src={iconMap[type]} 
        alt={type} 
        className={className}
        style={{ width: '24px', height: '24px' }}
      />
    )
  }
  
  // Fallback to AWS icons for backward compatibility
  if (AWS_ICON_MAP[type]) {
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
  } else if (type.startsWith('ai_')) {
    return <Cloud className={className} style={{ color }} />
  }
  return <Server className={className} style={{ color }} />
}
