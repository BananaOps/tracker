// API statique pour le mode démo GitHub Pages
// Charge les données depuis des fichiers JSON pré-générés

const STATIC_DATA_PATH = '/static-data'

export const staticEventsApi = {
  list: async () => {
    const response = await fetch(`${STATIC_DATA_PATH}/events.json`)
    return response.json()
  },

  today: async () => {
    const data = await staticEventsApi.list()
    const today = new Date().toISOString().split('T')[0]
    const todayEvents = data.events.filter((event: any) => {
      const eventDate = new Date(event.metadata?.createdAt).toISOString().split('T')[0]
      return eventDate === today
    })
    return { events: todayEvents, totalCount: todayEvents.length }
  },

  search: async (params: any) => {
    const data = await staticEventsApi.list()
    // Filtrage basique côté client
    let filtered = data.events
    
    if (params.service) {
      filtered = filtered.filter((e: any) => e.attributes?.service === params.service)
    }
    if (params.environment) {
      filtered = filtered.filter((e: any) => e.attributes?.environment === params.environment)
    }
    if (params.status) {
      filtered = filtered.filter((e: any) => e.attributes?.status === params.status)
    }
    
    // Filtrage par date pour les insights
    if (params.startDate || params.endDate) {
      filtered = filtered.filter((e: any) => {
        const eventDate = new Date(e.metadata?.createdAt)
        const start = params.startDate ? new Date(params.startDate) : new Date(0)
        const end = params.endDate ? new Date(params.endDate) : new Date()
        return eventDate >= start && eventDate <= end
      })
    }
    
    return { events: filtered, totalCount: filtered.length }
  },

  get: async (id: string) => {
    const data = await staticEventsApi.list()
    const event = data.events.find((e: any) => e.metadata?.id === id || e.metadata?.slackId === id)
    return event
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
}

export const staticCatalogApi = {
  list: async () => {
    const response = await fetch(`${STATIC_DATA_PATH}/catalogs.json`)
    return response.json()
  },

  get: async (name: string) => {
    const data = await staticCatalogApi.list()
    const catalog = data.catalogs.find((c: any) => c.name === name)
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
              type: 'container' as any,
              currentVersion: '1.2.0',
              latestVersion: '1.4.0',
              referenceVersion: '1.3.0',
              isOutdated: true,
              isLatest: false
            },
            {
              name: 'logging-module',
              type: 'module' as any,
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
              type: 'container' as any,
              currentVersion: '1.3.0',
              latestVersion: '1.4.0',
              referenceVersion: '1.3.0',
              isOutdated: false,
              isLatest: false
            },
            {
              name: 'validation-package',
              type: 'package' as any,
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
            type: 'container' as any,
            projectsUsing: 2,
            projectsOutdated: 1,
            latestVersion: '1.4.0',
            referenceVersion: '1.3.0'
          },
          {
            name: 'logging-module',
            type: 'module' as any,
            projectsUsing: 1,
            projectsOutdated: 0,
            latestVersion: '2.1.0',
            referenceVersion: '2.1.0'
          },
          {
            name: 'validation-package',
            type: 'package' as any,
            projectsUsing: 1,
            projectsOutdated: 1,
            latestVersion: '3.2.0',
            referenceVersion: '3.1.0'
          }
        ]
      }
    }
  },

  updateVersions: async (name: string, versions: string[], latestVersion?: string, referenceVersion?: string) => {
    // Mock version update for static mode
    // In static mode, we just return a mock response
    return {
      name,
      type: 'package' as any,
      languages: 'javascript' as any,
      owner: 'mock-owner',
      version: '1.0.0',
      availableVersions: versions,
      latestVersion,
      referenceVersion,
    }
  },
}

export const staticLocksApi = {
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
