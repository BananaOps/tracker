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
