import axios from 'axios'
import type { CreateEventRequest, Event, ListEventsResponse, Catalog, ChangelogEntry, EventType, Priority, Status, Environment } from '../types/api'
import { staticEventsApi, staticCatalogApi, staticLocksApi } from './staticApi'
import { catalogFromAPI, convertEventFromAPI, type ApiEventRequest } from './apiConverters'
// Détecter si on est en mode statique (GitHub Pages)
const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true'

// Configuration de l'URL de base de l'API
const getApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1alpha1'
  return apiUrl
}

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    // Ajouter un token d'authentification si nécessaire
    ...(import.meta.env.VITE_API_TOKEN && {
      'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN}`
    }),
  },
})

// Events leave the API layer with the web enums ('p1', 'tnr'): protojson
// writes the proto names ('P1', 'TNR'), which the pages compare against
// Priority and Environment values.
function eventsFromAPI(data: ListEventsResponse): ListEventsResponse {
  return { ...data, events: (data.events ?? []).map(convertEventFromAPI) }
}

const realEventsApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/list', { params })
    return eventsFromAPI(data)
  },

  today: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/today', { params })
    return eventsFromAPI(data)
  },

  // Enums are accepted by name ('drift', 'production') or by number
  search: async (params: {
    source?: string
    type?: EventType | number
    priority?: Priority | number
    status?: Status | number
    service?: string
    startDate?: string
    endDate?: string
    environment?: Environment | number
  }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/search', { params })
    return eventsFromAPI(data)
  },

  get: async (id: string) => {
    const { data } = await axiosInstance.get<{ event: Event }>(`/event/${id}`)
    return convertEventFromAPI(data.event)
  },

  // The enums may be sent by number (convertEventForAPI) or by name, which
  // grpc-gateway also accepts
  create: async (event: ApiEventRequest | CreateEventRequest) => {
    const { data } = await axiosInstance.post<{ event: Event }>('/event', event)
    return convertEventFromAPI(data.event)
  },

  update: async (id: string, event: ApiEventRequest | CreateEventRequest) => {
    const { data } = await axiosInstance.put<{ event: Event }>('/event', { ...event, id })
    return convertEventFromAPI(data.event)
  },

  delete: async (id: string) => {
    await axiosInstance.delete(`/event/${id}`)
  },

  // Fetch event changelog (supports pagination)
  getChangelog: async (
    id: string,
    params?: { perPage?: number; page?: number }
  ) => {
    // protojson writes camelCase fields and timestamps as RFC 3339 strings
    const { data } = await axiosInstance.get<{ changelog?: ChangelogEntry[]; totalCount?: number }>(`/event/${id}/changelog`, { params })
    const changelog = data.changelog ?? []
    return { changelog, totalCount: data.totalCount ?? changelog.length }
  },

  // Add Slack ID to an existing event
  addSlackId: async (id: string, slackId: string) => {
    const { data } = await axiosInstance.post<{ event: Event }>(`/event/${id}/slack`, { slack_id: slackId })
    return convertEventFromAPI(data.event)
  },
}

const realCatalogApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<{ catalogs: Catalog[]; totalCount: number }>('/catalogs/list', { params })
    return { catalogs: data.catalogs.map(catalogFromAPI), totalCount: data.totalCount }
  },

  get: async (name: string) => {
    const { data } = await axiosInstance.get<{ catalog: Catalog }>('/catalog', { params: { name } })
    return catalogFromAPI(data.catalog)
  },

  createOrUpdate: async (catalog: Catalog) => {
    // Convert to backend format (snake_case for dependencies, simple SLA)
    // IMPORTANT: Exclude version fields - they are managed separately via updateVersions endpoint
    const backendCatalog = {
      name: catalog.name,
      type: catalog.type,
      languages: catalog.languages,
      owner: catalog.owner,
      version: catalog.version,
      link: catalog.link,
      description: catalog.description,
      repository: catalog.repository,
      // Convert dependencies to snake_case
      dependencies_in: catalog.dependenciesIn,
      dependencies_out: catalog.dependenciesOut,
      // Convert SLA to simple format (no wrappers for now)
      sla: catalog.sla ? {
        level: catalog.sla.level,
        uptime_percentage: catalog.sla.uptimePercentage,
        response_time_ms: catalog.sla.responseTimeMs,
        description: catalog.sla.description
      } : undefined,
      platform: catalog.platform,
      // Convert used deliverables to snake_case
      used_deliverables: catalog.usedDeliverables?.map(ud => ({
        name: ud.name,
        type: ud.type,
        version_used: ud.versionUsed,
        description: ud.description
      })),
      // Convert communication channels to snake_case
      communication_channels: catalog.communicationChannels?.map(channel => ({
        type: channel.type,
        name: channel.name,
        url: channel.url,
        description: channel.description
      })) || [],
      // Convert dashboard links to snake_case
      dashboard_links: catalog.dashboardLinks?.map(link => ({
        type: link.type,
        name: link.name,
        url: link.url,
        description: link.description
      })) || [],
      // Convert vulnerability summary to snake_case
      vulnerability_summary: catalog.vulnerabilitySummary ? {
        critical_count: catalog.vulnerabilitySummary.criticalCount,
        high_count: catalog.vulnerabilitySummary.highCount,
        medium_count: catalog.vulnerabilitySummary.mediumCount,
        low_count: catalog.vulnerabilitySummary.lowCount,
        info_count: catalog.vulnerabilitySummary.infoCount,
        total_count: catalog.vulnerabilitySummary.totalCount,
        last_updated: catalog.vulnerabilitySummary.lastUpdated,
        sources: catalog.vulnerabilitySummary.sources?.map(source => ({
          name: source.name,
          type: source.type,
          url: source.url,
          critical_count: source.criticalCount,
          high_count: source.highCount,
          medium_count: source.mediumCount,
          low_count: source.lowCount,
          info_count: source.infoCount,
          total_count: source.totalCount,
          last_scan: source.lastScan,
          scan_version: source.scanVersion,
          description: source.description
        })) || []
      } : undefined,
      // Convert infrastructure resources to snake_case
      infrastructure_resources: catalog.infrastructureResources?.map(resource => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        provider: resource.provider,
        region: resource.region,
        endpoint: resource.endpoint,
        metadata: resource.metadata,
        connected_services: resource.connectedServices
      })) || []
      // Note: availableVersions, latestVersion, referenceVersion are NOT sent here
      // They are managed via separate updateVersions endpoint
    }
    
    const { data } = await axiosInstance.put<{ catalog: Catalog }>('/catalog', backendCatalog)
    return catalogFromAPI(data.catalog)
  },

  delete: async (name: string) => {
    const { data } = await axiosInstance.delete<{ message: string; name: string }>('/catalog', { params: { name } })
    return data
  },

  getVersionCompliance: async () => {
    const { data } = await axiosInstance.get<import('../types/api').GetVersionComplianceResponse>('/catalog/version-compliance')
    return data
  },

  updateVersions: async (name: string, versions: string[], latestVersion?: string, referenceVersion?: string) => {
    const requestData = {
      name,
      available_versions: versions,
      latest_version: latestVersion,
      reference_version: referenceVersion
    }
    
    const { data } = await axiosInstance.put<{ catalog: Catalog }>(`/catalog/${name}/versions`, requestData)
    return catalogFromAPI(data.catalog)
  },

  updateDependencies: async (name: string, dependenciesIn: string[], dependenciesOut: string[]) => {
    const requestData = {
      name,
      dependencies_in: dependenciesIn,
      dependencies_out: dependenciesOut
    }
    
    const { data } = await axiosInstance.put<{ catalog: Catalog }>(`/catalog/${name}/dependencies`, requestData)
    return catalogFromAPI(data.catalog)
  },
}

export interface Lock {
  id: string
  service: string
  who: string
  environment: string
  resource: string
  event_id?: string
  eventId?: string
  created_at?: string | { seconds: number; nanos?: number }
  createdAt?: string | { seconds: number; nanos?: number }
}

export interface ListLocksResponse {
  locks: Lock[]
  total_count: number
}

const realLocksApi = {
  list: async () => {
    const { data } = await axiosInstance.get<ListLocksResponse>('/locks/list')
    return data
  },

  create: async (lock: { service: string; who: string; environment: string; resource?: string; event_id?: string }) => {
    const { data } = await axiosInstance.post<{ lock: Lock }>('/lock', lock)
    return data.lock
  },

  unlock: async (id: string) => {
    const { data } = await axiosInstance.get(`/unlock/${id}`)
    return data
  },
}

// The static APIs implement the same interface, so that pages get the types
// of the real API in both modes.
export type EventsApi = typeof realEventsApi
export type CatalogApi = typeof realCatalogApi
export type LocksApi = typeof realLocksApi

// Exporter les APIs appropriées selon le mode
export const eventsApi: EventsApi = isStaticMode ? staticEventsApi : realEventsApi
export const catalogApi: CatalogApi = isStaticMode ? staticCatalogApi : realCatalogApi
export const locksApi: LocksApi = isStaticMode ? staticLocksApi : realLocksApi

export default axiosInstance
