import axios from 'axios'
import type { CreateEventRequest, Event, ListEventsResponse, Catalog, ListCatalogsResponse } from '../types/api'
import { staticEventsApi, staticCatalogApi, staticLocksApi } from './staticApi'

// Détecter si on est en mode statique (GitHub Pages)
const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true'

// Configuration de l'URL de base de l'API
const getApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1alpha1'
  console.log('🔗 API Base URL:', apiUrl) // Debug temporaire
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
      sla: catalog.sla ? {
        level: catalog.sla.level,
        uptimePercentage: catalog.sla.uptimePercentage?.value,
        responseTimeMs: catalog.sla.responseTimeMs?.value,
        description: catalog.sla.description
      } : undefined
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
      sla: data.catalog.sla ? {
        level: data.catalog.sla.level,
        uptimePercentage: data.catalog.sla.uptimePercentage?.value,
        responseTimeMs: data.catalog.sla.responseTimeMs?.value,
        description: data.catalog.sla.description
      } : undefined
    }
    
    return frontendCatalog
  },

  createOrUpdate: async (catalog: Catalog) => {
    console.log('🌐 API: Sending catalog to backend:', JSON.stringify(catalog, null, 2))
    
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
      }))
      // Note: availableVersions, latestVersion, referenceVersion are NOT sent here
      // They are managed via separate updateVersions endpoint
    }
    
    console.log('🔄 API: Converted for backend (no version fields):', JSON.stringify(backendCatalog, null, 2))
    
    const { data } = await axiosInstance.put<{ catalog: any }>('/catalog', backendCatalog)
    console.log('✅ API: Received response:', JSON.stringify(data, null, 2))
    
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

  delete: async (name: string) => {
    const { data } = await axiosInstance.delete<{ message: string; name: string }>('/catalog', { params: { name } })
    return data
  },

  getVersionCompliance: async () => {
    const { data } = await axiosInstance.get<import('../types/api').GetVersionComplianceResponse>('/catalog/version-compliance')
    return data
  },

  updateVersions: async (name: string, versions: string[], latestVersion?: string, referenceVersion?: string) => {
    console.log('🔧 API: Updating versions for service:', name, { versions, latestVersion, referenceVersion })
    
    const requestData = {
      name,
      available_versions: versions,
      latest_version: latestVersion,
      reference_version: referenceVersion
    }
    
    console.log('📤 API: Sending version update:', JSON.stringify(requestData, null, 2))
    
    const { data } = await axiosInstance.put<{ catalog: any }>(`/catalog/${name}/versions`, requestData)
    console.log('✅ API: Version update response:', JSON.stringify(data, null, 2))
    
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
