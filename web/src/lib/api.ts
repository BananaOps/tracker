import axios from 'axios'
import type { CreateEventRequest, Event, ListEventsResponse, Catalog, ListCatalogsResponse } from '../types/api'
import { staticEventsApi, staticCatalogApi, staticLocksApi } from './staticApi'
import { convertCatalogForAPI, convertCatalogFromAPI, convertCommunicationChannelsFromAPI } from './apiConverters'

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

const realEventsApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/list', { params })
    return data
  },

  today: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/today', { params })
    return data
  },

  search: async (params: {
    source?: string
    type?: number
    priority?: number
    status?: number
    service?: string
    startDate?: string
    endDate?: string
    environment?: number
  }) => {
    const { data } = await axiosInstance.get<ListEventsResponse>('/events/search', { params })
    return data
  },

  get: async (id: string) => {
    const { data } = await axiosInstance.get<{ event: Event }>(`/event/${id}`)
    return data.event
  },

  create: async (event: CreateEventRequest) => {
    const { data } = await axiosInstance.post<{ event: Event }>('/event', event)
    return data.event
  },

  update: async (id: string, event: CreateEventRequest) => {
    const { data } = await axiosInstance.put<{ event: Event }>('/event', { ...event, id })
    return data.event
  },

  delete: async (id: string) => {
    await axiosInstance.delete(`/event/${id}`)
  },

  // Fetch event changelog (supports pagination)
  getChangelog: async (
    id: string,
    params?: { perPage?: number; page?: number }
  ) => {
    const { data } = await axiosInstance.get<{ changelog?: import('../types/api').ChangelogEntry[]; totalCount?: number; Changelog?: import('../types/api').ChangelogEntry[]; TotalCount?: number }>(`/event/${id}/changelog`, { params })
    // Normalize potential casing differences from backend
    let changelog = (data.changelog || (data as any).Changelog || []) as import('../types/api').ChangelogEntry[]
    // Normalize timestamp wrapper if present
    changelog = changelog.map((entry: any) => {
      const ts = entry.timestamp
      if (ts && typeof ts === 'object' && typeof ts.seconds === 'number') {
        return { ...entry, timestamp: new Date(ts.seconds * 1000).toISOString() }
      }
      return entry
    })
    const totalCount = (data.totalCount ?? (data as any).TotalCount ?? changelog.length) as number
    return { changelog, totalCount }
  },

  // Add Slack ID to an existing event
  addSlackId: async (id: string, slackId: string) => {
    const { data } = await axiosInstance.post<{ event: Event }>(`/event/${id}/slack`, { slack_id: slackId })
    return data.event
  },
}

const realCatalogApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await axiosInstance.get<{ catalogs: any[]; totalCount: number }>('/catalogs/list', { params })
    
    // Convert all catalogs from protobuf wrapper format
    const frontendCatalogs: Catalog[] = data.catalogs.map(catalog => ({
      ...catalog,
      availableVersions: catalog.available_versions || catalog.availableVersions,
      latestVersion: catalog.latest_version || catalog.latestVersion,
      referenceVersion: catalog.reference_version || catalog.referenceVersion,
      usedDeliverables: catalog.used_deliverables?.map((ud: any) => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.version_used || ud.versionUsed,
        description: ud.description
      })) || catalog.usedDeliverables,
      communicationChannels: convertCommunicationChannelsFromAPI(catalog.communication_channels || catalog.communicationChannels || []),
      dashboardLinks: catalog.dashboard_links?.map((link: any) => ({
        type: link.type,
        name: link.name,
        url: link.url,
        description: link.description
      })) || catalog.dashboardLinks || [],
      vulnerabilitySummary: catalog.vulnerability_summary ? {
        criticalCount: catalog.vulnerability_summary.critical_count || catalog.vulnerability_summary.criticalCount || 0,
        highCount: catalog.vulnerability_summary.high_count || catalog.vulnerability_summary.highCount || 0,
        mediumCount: catalog.vulnerability_summary.medium_count || catalog.vulnerability_summary.mediumCount || 0,
        lowCount: catalog.vulnerability_summary.low_count || catalog.vulnerability_summary.lowCount || 0,
        infoCount: catalog.vulnerability_summary.info_count || catalog.vulnerability_summary.infoCount || 0,
        totalCount: catalog.vulnerability_summary.total_count || catalog.vulnerability_summary.totalCount || 0,
        lastUpdated: catalog.vulnerability_summary.last_updated || catalog.vulnerability_summary.lastUpdated,
        sources: catalog.vulnerability_summary.sources?.map((source: any) => ({
          name: source.name,
          type: source.type,
          url: source.url,
          criticalCount: source.critical_count || source.criticalCount || 0,
          highCount: source.high_count || source.highCount || 0,
          mediumCount: source.medium_count || source.mediumCount || 0,
          lowCount: source.low_count || source.lowCount || 0,
          infoCount: source.info_count || source.infoCount || 0,
          totalCount: source.total_count || source.totalCount || 0,
          lastScan: source.last_scan || source.lastScan,
          scanVersion: source.scan_version || source.scanVersion,
          description: source.description
        })) || catalog.vulnerability_summary.sources || []
      } : catalog.vulnerabilitySummary,
      sla: catalog.sla ? {
        level: catalog.sla.level,
        uptimePercentage: catalog.sla.uptimePercentage?.value,
        responseTimeMs: catalog.sla.responseTimeMs?.value,
        description: catalog.sla.description
      } : undefined,
      infrastructureResources: (catalog.infrastructure_resources || catalog.infrastructureResources)?.map((resource: any) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        provider: resource.provider,
        region: resource.region,
        endpoint: resource.endpoint,
        metadata: resource.metadata,
        connectedServices: resource.connected_services || resource.connectedServices
      })) || []
    }))
    
    return {
      catalogs: frontendCatalogs,
      totalCount: data.totalCount
    }
  },

  get: async (name: string) => {
    const { data } = await axiosInstance.get<{ catalog: any }>('/catalog', { params: { name } })
    
    // Convert response from protobuf wrapper format
    const frontendCatalog: Catalog = {
      ...data.catalog,
      availableVersions: data.catalog.available_versions || data.catalog.availableVersions,
      latestVersion: data.catalog.latest_version || data.catalog.latestVersion,
      referenceVersion: data.catalog.reference_version || data.catalog.referenceVersion,
      usedDeliverables: data.catalog.used_deliverables?.map((ud: any) => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.version_used || ud.versionUsed,
        description: ud.description
      })) || data.catalog.usedDeliverables,
      communicationChannels: convertCommunicationChannelsFromAPI(data.catalog.communication_channels || data.catalog.communicationChannels || []),
      dashboardLinks: data.catalog.dashboard_links?.map((link: any) => ({
        type: link.type,
        name: link.name,
        url: link.url,
        description: link.description
      })) || data.catalog.dashboardLinks || [],
      vulnerabilitySummary: data.catalog.vulnerability_summary ? {
        criticalCount: data.catalog.vulnerability_summary.critical_count || data.catalog.vulnerability_summary.criticalCount || 0,
        highCount: data.catalog.vulnerability_summary.high_count || data.catalog.vulnerability_summary.highCount || 0,
        mediumCount: data.catalog.vulnerability_summary.medium_count || data.catalog.vulnerability_summary.mediumCount || 0,
        lowCount: data.catalog.vulnerability_summary.low_count || data.catalog.vulnerability_summary.lowCount || 0,
        infoCount: data.catalog.vulnerability_summary.info_count || data.catalog.vulnerability_summary.infoCount || 0,
        totalCount: data.catalog.vulnerability_summary.total_count || data.catalog.vulnerability_summary.totalCount || 0,
        lastScan: data.catalog.vulnerability_summary.last_scan || data.catalog.vulnerability_summary.lastScan,
        scannerName: data.catalog.vulnerability_summary.scanner_name || data.catalog.vulnerability_summary.scannerName,
        scanVersion: data.catalog.vulnerability_summary.scan_version || data.catalog.vulnerability_summary.scanVersion
      } : data.catalog.vulnerabilitySummary,
      sla: data.catalog.sla ? {
        level: data.catalog.sla.level,
        uptimePercentage: data.catalog.sla.uptimePercentage?.value,
        responseTimeMs: data.catalog.sla.responseTimeMs?.value,
        description: data.catalog.sla.description
      } : undefined,
      infrastructureResources: (data.catalog.infrastructure_resources || data.catalog.infrastructureResources)?.map((resource: any) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        provider: resource.provider,
        region: resource.region,
        endpoint: resource.endpoint,
        metadata: resource.metadata,
        connectedServices: resource.connected_services || resource.connectedServices
      })) || []
    }
    
    return frontendCatalog
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
    
    const { data } = await axiosInstance.put<{ catalog: any }>('/catalog', backendCatalog)
    
    // Convert response back to frontend format
    const frontendCatalog: Catalog = {
      ...data.catalog,
      dependenciesIn: data.catalog.dependencies_in || data.catalog.dependenciesIn,
      dependenciesOut: data.catalog.dependencies_out || data.catalog.dependenciesOut,
      availableVersions: data.catalog.available_versions || data.catalog.availableVersions,
      latestVersion: data.catalog.latest_version || data.catalog.latestVersion,
      referenceVersion: data.catalog.reference_version || data.catalog.referenceVersion,
      usedDeliverables: data.catalog.used_deliverables?.map((ud: any) => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.version_used || ud.versionUsed,
        description: ud.description
      })) || data.catalog.usedDeliverables,
      sla: data.catalog.sla ? {
        level: data.catalog.sla.level,
        uptimePercentage: data.catalog.sla.uptime_percentage || data.catalog.sla.uptimePercentage?.value,
        responseTimeMs: data.catalog.sla.response_time_ms || data.catalog.sla.responseTimeMs?.value,
        description: data.catalog.sla.description
      } : undefined,
      infrastructureResources: (data.catalog.infrastructure_resources || data.catalog.infrastructureResources)?.map((resource: any) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        provider: resource.provider,
        region: resource.region,
        endpoint: resource.endpoint,
        metadata: resource.metadata,
        connectedServices: resource.connected_services || resource.connectedServices
      })) || []
    }
    
    return frontendCatalog
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
    
    const { data } = await axiosInstance.put<{ catalog: any }>(`/catalog/${name}/versions`, requestData)
    
    // Convert response back to frontend format
    const frontendCatalog: Catalog = {
      ...data.catalog,
      dependenciesIn: data.catalog.dependencies_in || data.catalog.dependenciesIn,
      dependenciesOut: data.catalog.dependencies_out || data.catalog.dependenciesOut,
      availableVersions: data.catalog.available_versions || data.catalog.availableVersions,
      latestVersion: data.catalog.latest_version || data.catalog.latestVersion,
      referenceVersion: data.catalog.reference_version || data.catalog.referenceVersion,
      usedDeliverables: data.catalog.used_deliverables?.map((ud: any) => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.version_used || ud.versionUsed,
        description: ud.description
      })) || data.catalog.usedDeliverables,
      sla: data.catalog.sla ? {
        level: data.catalog.sla.level,
        uptimePercentage: data.catalog.sla.uptime_percentage || data.catalog.sla.uptimePercentage?.value,
        responseTimeMs: data.catalog.sla.response_time_ms || data.catalog.sla.responseTimeMs?.value,
        description: data.catalog.sla.description
      } : undefined
    }
    
    return frontendCatalog
  },

  updateDependencies: async (name: string, dependenciesIn: string[], dependenciesOut: string[]) => {
    const requestData = {
      name,
      dependencies_in: dependenciesIn,
      dependencies_out: dependenciesOut
    }
    
    const { data } = await axiosInstance.put<{ catalog: any }>(`/catalog/${name}/dependencies`, requestData)
    
    // Convert response back to frontend format
    const frontendCatalog: Catalog = {
      ...data.catalog,
      dependenciesIn: data.catalog.dependencies_in || data.catalog.dependenciesIn,
      dependenciesOut: data.catalog.dependencies_out || data.catalog.dependenciesOut,
      availableVersions: data.catalog.available_versions || data.catalog.availableVersions,
      latestVersion: data.catalog.latest_version || data.catalog.latestVersion,
      referenceVersion: data.catalog.reference_version || data.catalog.referenceVersion,
      usedDeliverables: data.catalog.used_deliverables?.map((ud: any) => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.version_used || ud.versionUsed,
        description: ud.description
      })) || data.catalog.usedDeliverables,
      sla: data.catalog.sla ? {
        level: data.catalog.sla.level,
        uptimePercentage: data.catalog.sla.uptime_percentage || data.catalog.sla.uptimePercentage?.value,
        responseTimeMs: data.catalog.sla.response_time_ms || data.catalog.sla.responseTimeMs?.value,
        description: data.catalog.sla.description
      } : undefined
    }
    
    return frontendCatalog
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

  create: async (lock: { service: string; who: string; environment: string; resource: string; event_id?: string }) => {
    const { data } = await axiosInstance.post<{ lock: Lock }>('/lock', lock)
    return data.lock
  },

  unlock: async (id: string) => {
    const { data } = await axiosInstance.get(`/unlock/${id}`)
    return data
  },
}

// Exporter les APIs appropriées selon le mode
export const eventsApi = isStaticMode ? staticEventsApi : realEventsApi
export const catalogApi = isStaticMode ? staticCatalogApi : realCatalogApi
export const locksApi = isStaticMode ? staticLocksApi : realLocksApi

export default axiosInstance
