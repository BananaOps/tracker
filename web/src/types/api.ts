// L'API retourne des strings, pas des nombres
export enum EventType {
  DEPLOYMENT = 'deployment',
  OPERATION = 'operation',
  DRIFT = 'drift',
  INCIDENT = 'incident',
}

// Mapping pour la conversion si nécessaire
export const EventTypeNumber = {
  deployment: 1,
  operation: 2,
  drift: 3,
  incident: 4,
} as const

// L'API retourne des strings pour Priority
export enum Priority {
  P1 = 'p1',
  P2 = 'p2',
  P3 = 'p3',
  P4 = 'p4',
  P5 = 'p5',
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

export enum CatalogType {
  MODULE = 1,
  LIBRARY = 2,
  WORKFLOW = 3,
  PROJECT = 4,
  CHART = 5,
  PACKAGE = 6,
  CONTAINER = 7,
}

export enum Language {
  GOLANG = 1,
  KOTLIN = 2,
  JAVA = 3,
  TERRAFORM = 4,
  HELM = 5,
  JAVASCRIPT = 6,
  YAML = 7,
  DOCKER = 8,
  PYTHON = 9,
  PHP = 10,
  RUST = 11,
  TYPESCRIPT = 12,
  GROOVY = 15,
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
}

export interface CreateEventRequest {
  title: string
  attributes: EventAttributes
  links?: EventLinks
  slackId?: string
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
}

export interface ListEventsResponse {
  events: Event[]
  totalCount: number
}

export interface ListCatalogsResponse {
  catalogs: Catalog[]
  totalCount: number
}
