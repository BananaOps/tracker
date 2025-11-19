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

export enum Priority {
  P1 = 1,
  P2 = 2,
  P3 = 3,
  P4 = 4,
  P5 = 5,
}

export enum Status {
  START = 1,
  FAILURE = 2,
  SUCCESS = 3,
  WARNING = 4,
  ERROR = 5,
  SNAPSHOT = 6,
  USER_UPDATE = 7,
  RECOMMENDATION = 8,
  OPEN = 9,
  CLOSE = 10,
  DONE = 11,
}

export enum Environment {
  DEVELOPMENT = 1,
  INTEGRATION = 2,
  TNR = 3,
  UAT = 4,
  RECETTE = 5,
  PREPRODUCTION = 6,
  PRODUCTION = 7,
  MCO = 8,
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
