// API statique pour le mode démo GitHub Pages
// Charge les données depuis des fichiers JSON pré-générés

import type { CatalogApi, EventsApi, LocksApi } from './api'
import { CatalogType, Language } from '../types/api'
import { convertEventFromAPI } from './apiConverters'

const STATIC_DATA_PATH = '/static-data'

export const staticEventsApi: EventsApi = {
  list: async () => {
    const response = await fetch(`${STATIC_DATA_PATH}/events.json`)
    const data: Awaited<ReturnType<EventsApi['list']>> = await response.json()
    // same normalization as the real API
    return { ...data, events: (data.events ?? []).map(convertEventFromAPI) }
  },

  today: async () => {
    const data = await staticEventsApi.list()
    const today = new Date().toISOString().split('T')[0]
    // An event without a creation date is not today's (new Date(undefined)
    // is an invalid date, whose toISOString throws)
    const todayEvents = data.events.filter((event) =>
      !!event.metadata?.createdAt && new Date(event.metadata.createdAt).toISOString().split('T')[0] === today
    )
    return { events: todayEvents, totalCount: todayEvents.length }
  },

  search: async (params: Parameters<EventsApi['search']>[0]) => {
    const data = await staticEventsApi.list()
    // Filtrage basique côté client
    let filtered = data.events
    
    if (params.service) {
      filtered = filtered.filter((e) => e.attributes?.service === params.service)
    }
    if (params.environment) {
      filtered = filtered.filter((e) => e.attributes?.environment === params.environment)
    }
    if (params.status) {
      filtered = filtered.filter((e) => e.attributes?.status === params.status)
    }
    
    // Filtrage par date pour les insights
    if (params.startDate || params.endDate) {
      filtered = filtered.filter((e) => {
        if (!e.metadata?.createdAt) return false
        const eventDate = new Date(e.metadata.createdAt)
        const start = params.startDate ? new Date(params.startDate) : new Date(0)
        const end = params.endDate ? new Date(params.endDate) : new Date()
        return eventDate >= start && eventDate <= end
      })
    }
    
    return { events: filtered, totalCount: filtered.length }
  },

  get: async (id: string) => {
    const data = await staticEventsApi.list()
    const event = data.events.find((e) => e.metadata?.id === id || e.metadata?.slackId === id)
    // The real API answers 404 for an unknown event
    if (!event) throw new Error(`Event ${id} not found`)
    return event
  },

  // L'historique est celui embarqué dans les données de démo
  getChangelog: async (id: string, _params?: { perPage?: number; page?: number }) => {
    const event = await staticEventsApi.get(id)
    const changelog = event?.changelog ?? []
    return { changelog, totalCount: changelog.length }
  },

  // Méthodes en lecture seule pour le mode statique
  create: async () => {
    throw new Error('Create operation not available in static demo mode')
  },

  update: async () => {
    throw new Error('Update operation not available in static demo mode')
  },

  delete: async () => {
    throw new Error('Delete operation not available in static demo mode')
  },

  addSlackId: async () => {
    throw new Error('Update operation not available in static demo mode')
  },
}

export const staticCatalogApi: CatalogApi = {
  list: async () => {
    const response = await fetch(`${STATIC_DATA_PATH}/catalogs.json`)
    return response.json()
  },

  get: async (name: string) => {
    const data = await staticCatalogApi.list()
    const catalog = data.catalogs.find((c) => c.name === name)
    if (!catalog) throw new Error(`Catalog ${name} not found`)
    return catalog
  },

  createOrUpdate: async () => {
    throw new Error('Create/Update operation not available in static demo mode')
  },

  delete: async () => {
    throw new Error('Delete operation not available in static demo mode')
  },

  getVersionCompliance: async () => {
    // Mock version compliance data for static mode
    return {
      projects: [
        {
          projectName: 'auth-service',
          deliverables: [
            {
              name: 'base-docker-image',
              type: CatalogType.CONTAINER,
              currentVersion: '1.2.0',
              latestVersion: '1.4.0',
              referenceVersion: '1.3.0',
              isOutdated: true,
              isLatest: false
            },
            {
              name: 'logging-module',
              type: CatalogType.MODULE,
              currentVersion: '2.1.0',
              latestVersion: '2.1.0',
              referenceVersion: '2.1.0',
              isOutdated: false,
              isLatest: true
            }
          ],
          outdatedCount: 1,
          totalCount: 2,
          compliancePercentage: 50
        },
        {
          projectName: 'payment-service',
          deliverables: [
            {
              name: 'base-docker-image',
              type: CatalogType.CONTAINER,
              currentVersion: '1.3.0',
              latestVersion: '1.4.0',
              referenceVersion: '1.3.0',
              isOutdated: false,
              isLatest: false
            },
            {
              name: 'validation-package',
              type: CatalogType.PACKAGE,
              currentVersion: '3.0.0',
              latestVersion: '3.2.0',
              referenceVersion: '3.1.0',
              isOutdated: true,
              isLatest: false
            }
          ],
          outdatedCount: 1,
          totalCount: 2,
          compliancePercentage: 50
        }
      ],
      summary: {
        totalProjects: 2,
        compliantProjects: 0,
        nonCompliantProjects: 2,
        overallCompliancePercentage: 50,
        deliverableStats: [
          {
            name: 'base-docker-image',
            type: CatalogType.CONTAINER,
            projectsUsing: 2,
            projectsOutdated: 1,
            latestVersion: '1.4.0',
            referenceVersion: '1.3.0'
          },
          {
            name: 'logging-module',
            type: CatalogType.MODULE,
            projectsUsing: 1,
            projectsOutdated: 0,
            latestVersion: '2.1.0',
            referenceVersion: '2.1.0'
          },
          {
            name: 'validation-package',
            type: CatalogType.PACKAGE,
            projectsUsing: 1,
            projectsOutdated: 1,
            latestVersion: '3.2.0',
            referenceVersion: '3.1.0'
          }
        ]
      }
    }
  },

  updateDependencies: async () => {
    throw new Error('Update operation not available in static demo mode')
  },

  updateVersions: async (name: string, versions: string[], latestVersion?: string, referenceVersion?: string) => {
    // Mock version update for static mode
    // In static mode, we just return a mock response
    return {
      name,
      type: CatalogType.PACKAGE,
      languages: Language.JAVASCRIPT,
      owner: 'mock-owner',
      version: '1.0.0',
      availableVersions: versions,
      latestVersion,
      referenceVersion,
    }
  },
}

export const staticLocksApi: LocksApi = {
  list: async () => {
    const response = await fetch(`${STATIC_DATA_PATH}/locks.json`)
    return response.json()
  },

  create: async () => {
    throw new Error('Create operation not available in static demo mode')
  },

  unlock: async () => {
    throw new Error('Unlock operation not available in static demo mode')
  },
}

export const getMetadata = async () => {
  const response = await fetch(`${STATIC_DATA_PATH}/metadata.json`)
  return response.json()
}
