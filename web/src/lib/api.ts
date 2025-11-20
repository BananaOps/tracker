import axios from 'axios'
import type { CreateEventRequest, Event, ListEventsResponse, Catalog, ListCatalogsResponse } from '../types/api'

const api = axios.create({
  baseURL: '/api/v1alpha1',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const eventsApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await api.get<ListEventsResponse>('/events/list', { params })
    return data
  },

  today: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await api.get<ListEventsResponse>('/events/today', { params })
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
    const { data } = await api.get<ListEventsResponse>('/events/search', { params })
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<{ event: Event }>(`/event/${id}`)
    return data.event
  },

  create: async (event: CreateEventRequest) => {
    const { data } = await api.post<{ event: Event }>('/event', event)
    return data.event
  },

  update: async (id: string, event: CreateEventRequest) => {
    const { data } = await api.put<{ event: Event }>('/event', { ...event, id })
    return data.event
  },

  delete: async (id: string) => {
    await api.delete(`/event/${id}`)
  },
}

export const catalogApi = {
  list: async (params?: { perPage?: number; page?: number }) => {
    const { data } = await api.get<ListCatalogsResponse>('/catalogs/list', { params })
    return data
  },

  get: async (name: string) => {
    const { data } = await api.get<{ catalog: Catalog }>('/catalog', { params: { name } })
    return data.catalog
  },

  createOrUpdate: async (catalog: Catalog) => {
    const { data } = await api.put<{ catalog: Catalog }>('/catalog', catalog)
    return data.catalog
  },

  delete: async (name: string) => {
    await api.delete('/catalog', { params: { name } })
  },
}

export default api
