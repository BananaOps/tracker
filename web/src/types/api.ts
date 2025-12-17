// L'API retourne des strings, pas des nombres
export enum EventType {
  DEPLOYMENT = 'deployment',
  OPERATION = 'operation',
  DRIFT = 'drift',
  INCIDENT = 'incident',
  RPA_USAGE = 'rpa_usage',
}

// Mapping pour la conversion si nécessaire
export const EventTypeNumber = {
  deployment: 1,
  operation: 2,
  drift: 3,
  incident: 4,
  rpa_usage: 5,
} as const

// L'API retourne des strings pour Priority
export enum Priority {
  P1 = 'p1',
  P2 = 'p2',
  P3 = 'p3',
  P4 = 'p4',
  P5 = 'p5',
}

// Mapping pour la conversion Priority string -> number (pour POST)
export const PriorityToNumber: Record<Priority, number> = {
  [Priority.P1]: 1,
  [Priority.P2]: 2,
  [Priority.P3]: 3,
  [Priority.P4]: 4,
  [Priority.P5]: 5,
}

// L'API retourne des strings pour Status
export enum Status {
  START = 'start',
  FAILURE = 'failure',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SNAPSHOT = 'snapshot',
  USER_UPDATE = 'user_update',
  RECOMMENDATION = 'recommendation',
  OPEN = 'open',
  CLOSE = 'close',
  DONE = 'done',
}

// Mapping pour la conversion Status string -> number (pour POST)
export const StatusToNumber: Record<Status, number> = {
  [Status.START]: 1,
  [Status.FAILURE]: 2,
  [Status.SUCCESS]: 3,
  [Status.WARNING]: 4,
  [Status.ERROR]: 5,
  [Status.SNAPSHOT]: 6,
  [Status.USER_UPDATE]: 7,
  [Status.RECOMMENDATION]: 8,
  [Status.OPEN]: 9,
  [Status.CLOSE]: 10,
  [Status.DONE]: 11,
}

// L'API retourne des strings pour Environment
export enum Environment {
  DEVELOPMENT = 'development',
  INTEGRATION = 'integration',
  TNR = 'tnr',
  UAT = 'uat',
  RECETTE = 'recette',
  PREPRODUCTION = 'preproduction',
  PRODUCTION = 'production',
  MCO = 'mco',
}

// Mapping pour la conversion Environment string -> number (pour POST)
export const EnvironmentToNumber: Record<Environment, number> = {
  [Environment.DEVELOPMENT]: 1,
  [Environment.INTEGRATION]: 2,
  [Environment.TNR]: 3,
  [Environment.UAT]: 4,
  [Environment.RECETTE]: 5,
  [Environment.PREPRODUCTION]: 6,
  [Environment.PRODUCTION]: 7,
  [Environment.MCO]: 8,
}

// Changelog types
export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMMENTED = 'commented',
  LINKED = 'linked',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
}

export interface ChangelogEntry {
  timestamp: string
  user: string
  changeType: ChangeType | string
  field?: string
  oldValue?: string
  newValue?: string
  comment?: string
}

// L'API retourne des strings pour CatalogType
export enum CatalogType {
  MODULE = 'module',
  LIBRARY = 'library',
  WORKFLOW = 'workflow',
  PROJECT = 'project',
  CHART = 'chart',
  PACKAGE = 'package',
  CONTAINER = 'container',
  RPA_USAGE = 'rpa_usage',
}

// L'API retourne des strings pour Language
export enum Language {
  GOLANG = 'golang',
  KOTLIN = 'kotlin',
  JAVA = 'java',
  TERRAFORM = 'terraform',
  HELM = 'helm',
  JAVASCRIPT = 'javascript',
  YAML = 'yaml',
  DOCKER = 'docker',
  PYTHON = 'python',
  PHP = 'php',
  RUST = 'rust',
  TYPESCRIPT = 'typescript',
  GROOVY = 'groovy',
}

export interface EventAttributes {
  message: string
  source: string
  type: EventType
  priority: Priority
  relatedId?: string
  service: string
  status: Status
  environment?: Environment
  impact?: boolean
  startDate?: string
  endDate?: string
  owner?: string
  stakeHolders?: string[]
  notification?: boolean
  notifications?: string[]
}

export interface EventLinks {
  pullRequestLink?: string
  ticket?: string
}

export interface EventMetadata {
  id: string
  createdAt: string
  duration?: string
  slackId?: string
}

export interface Event {
  title: string
  attributes: EventAttributes
  links?: EventLinks
  metadata?: EventMetadata
  changelog?: ChangelogEntry[]
}

export interface CreateEventRequest {
  title: string
  attributes: EventAttributes
  links?: EventLinks
  slackId?: string
}

export enum SLALevel {
  UNSPECIFIED = 'unspecified',
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Platform {
  UNSPECIFIED = 'unspecified',
  // Compute platforms
  EC2 = 'ec2',                        // AWS EC2 / Azure VM / GCP Compute Engine / Scaleway Instance
  LAMBDA = 'lambda',                  // AWS Lambda / Azure Functions / GCP Cloud Functions / Scaleway Functions
  KUBERNETES = 'kubernetes',          // AWS EKS / Azure AKS / GCP GKE / Scaleway Kapsule
  ECS = 'ecs',                        // AWS ECS / Azure Container Instances / GCP Cloud Run / Scaleway Container Registry
  // Container platforms
  FARGATE = 'fargate',                // AWS Fargate / Azure Container Instances
  CLOUD_RUN = 'cloud_run',            // GCP Cloud Run
  APP_SERVICE = 'app_service',        // Azure App Service
  // Serverless platforms
  STEP_FUNCTIONS = 'step_functions',  // AWS Step Functions / Azure Logic Apps / GCP Workflows
  EVENT_BRIDGE = 'event_bridge',      // AWS EventBridge / Azure Event Grid / GCP Eventarc
  // Database platforms
  RDS = 'rds',                        // AWS RDS / Azure SQL Database / GCP Cloud SQL / Scaleway Database
  DYNAMODB = 'dynamodb',              // AWS DynamoDB / Azure Cosmos DB / GCP Firestore
  // Storage platforms
  S3 = 's3',                          // AWS S3 / Azure Blob Storage / GCP Cloud Storage / Scaleway Object Storage
  // CDN platforms
  CLOUDFRONT = 'cloudfront',          // AWS CloudFront / Azure CDN / GCP Cloud CDN
  // API platforms
  API_GATEWAY = 'api_gateway',        // AWS API Gateway / Azure API Management / GCP API Gateway
  // Monitoring platforms
  CLOUDWATCH = 'cloudwatch',          // AWS CloudWatch / Azure Monitor / GCP Cloud Monitoring
  // Other
  ON_PREMISE = 'on_premise',          // On-premise infrastructure
  HYBRID = 'hybrid',                  // Hybrid cloud
  MULTI_CLOUD = 'multi_cloud',        // Multi-cloud deployment
}

export interface SLA {
  level: SLALevel
  uptimePercentage?: number
  responseTimeMs?: number
  description?: string
}

// Backend SLA format (with protobuf wrappers)
export interface BackendSLA {
  level: SLALevel
  uptime_percentage?: { value: number } | null
  response_time_ms?: { value: number } | null
  description?: string
}

export interface Catalog {
  name: string
  type: CatalogType
  languages: Language
  owner: string
  version: string
  link?: string
  description?: string
  repository?: string
  createdAt?: string
  updatedAt?: string
  dependenciesIn?: string[]
  dependenciesOut?: string[]
  sla?: SLA
  platform?: Platform
}

export interface ListEventsResponse {
  events: Event[]
  totalCount: number
}

export interface ListCatalogsResponse {
  catalogs: Catalog[]
  totalCount: number
}
