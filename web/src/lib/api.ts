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
    const { data } = await axiosInstance.get<ListCatalogsResponse>('/catalogs/list', { params })
    return data
  },

  get: async (name: string) => {
    const { data } = await axiosInstance.get<{ catalog: Catalog }>('/catalog', { params: { name } })
    return data.catalog
  },

  createOrUpdate: async (catalog: Catalog) => {
    const { data } = await axiosInstance.put<{ catalog: Catalog }>('/catalog', catalog)
    return data.catalog
  },

  delete: async (name: string) => {
    const { data } = await axiosInstance.delete<{ message: string; name: string }>('/catalog', { params: { name } })
    return data
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
