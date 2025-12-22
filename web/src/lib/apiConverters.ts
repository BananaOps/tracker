import { 
  EventType, 
  Priority, 
  Status, 
  Environment,
  EventTypeNumber,
  PriorityToNumber,
  StatusToNumber,
  EnvironmentToNumber,
  CreateEventRequest,
  CommunicationType,
  type CommunicationChannel,
  type Catalog
} from '../types/api'

// Mapping inverse : nombre -> string enum
export const NumberToPriority: Record<number, Priority> = {
  1: Priority.P1,
  2: Priority.P2,
  3: Priority.P3,
  4: Priority.P4,
  5: Priority.P5,
}

export const NumberToStatus: Record<number, Status> = {
  1: Status.START,
  2: Status.FAILURE,
  3: Status.SUCCESS,
  4: Status.WARNING,
  5: Status.ERROR,
  6: Status.SNAPSHOT,
  7: Status.USER_UPDATE,
  8: Status.RECOMMENDATION,
  9: Status.OPEN,
  10: Status.CLOSE,
  11: Status.DONE,
}

export const NumberToEnvironment: Record<number, Environment> = {
  1: Environment.DEVELOPMENT,
  2: Environment.INTEGRATION,
  3: Environment.TNR,
  4: Environment.UAT,
  5: Environment.RECETTE,
  6: Environment.PREPRODUCTION,
  7: Environment.PRODUCTION,
  8: Environment.MCO,
}

/**
 * Convertit les enums string en nombres pour l'API
 * L'API attend des nombres pour les POST/PUT mais renvoie des nombres pour les GET
 */
export function convertEventForAPI(event: CreateEventRequest): any {
  return {
    ...event,
    attributes: {
      ...event.attributes,
      type: EventTypeNumber[event.attributes.type as keyof typeof EventTypeNumber],
      priority: PriorityToNumber[event.attributes.priority],
      status: StatusToNumber[event.attributes.status],
      environment: event.attributes.environment 
        ? EnvironmentToNumber[event.attributes.environment]
        : undefined,
    },
  }
}

/**
 * Convertit les nombres de l'API en enums string pour le frontend
 * Utilisé quand l'API renvoie des nombres au lieu de strings
 */
export function convertEventFromAPI(event: any): any {
  // Convertir la priorité (nombre ou string)
  let priority = event.attributes.priority
  if (typeof priority === 'number') {
    priority = NumberToPriority[priority]
  } else if (typeof priority === 'string') {
    // Normaliser en minuscules si c'est une string
    priority = priority.toLowerCase()
  }

  // Convertir le status (nombre ou string)
  let status = event.attributes.status
  if (typeof status === 'number') {
    status = NumberToStatus[status]
  } else if (typeof status === 'string') {
    status = status.toLowerCase()
  }

  // Convertir l'environnement (nombre ou string)
  let environment = event.attributes.environment
  if (environment && typeof environment === 'number') {
    environment = NumberToEnvironment[environment]
  } else if (environment && typeof environment === 'string') {
    environment = environment.toLowerCase()
  }

  console.log('🔧 convertEventFromAPI:', {
    priority_in: event.attributes.priority,
    priority_type: typeof event.attributes.priority,
    priority_out: priority,
    status_in: event.attributes.status,
    status_type: typeof event.attributes.status,
    status_out: status,
  })

  return {
    ...event,
    attributes: {
      ...event.attributes,
      priority,
      status,
      environment,
    },
  }
}

/**
 * Convertit un Event complet en CreateEventRequest pour les mises à jour
 */
export function convertEventToRequest(event: any): CreateEventRequest {
  return {
    title: event.title,
    attributes: {
      type: event.attributes.type,
      priority: event.attributes.priority,
      status: event.attributes.status,
      service: event.attributes.service,
      source: event.attributes.source,
      message: event.attributes.message,
      environment: event.attributes.environment,
      owner: event.attributes.owner,
      startDate: event.attributes.startDate,
      endDate: event.attributes.endDate,
    },
    links: event.links || {},
  }
}

/**
 * Convertit les canaux de communication pour l'API (camelCase -> snake_case)
 */
export function convertCommunicationChannelsForAPI(channels: CommunicationChannel[]): any[] {
  return channels.map(channel => ({
    type: channel.type,
    name: channel.name,
    url: channel.url,
    description: channel.description || ''
  }))
}

/**
 * Convertit les canaux de communication depuis l'API (snake_case -> camelCase)
 */
export function convertCommunicationChannelsFromAPI(channels: any[]): CommunicationChannel[] {
  if (!channels) return []
  
  return channels.map(channel => ({
    type: channel.type as CommunicationType,
    name: channel.name,
    url: channel.url,
    description: channel.description
  }))
}

/**
 * Convertit un catalog pour l'API
 */
export function convertCatalogForAPI(catalog: Catalog): any {
  const apiCatalog = {
    ...catalog,
    communication_channels: catalog.communicationChannels 
      ? convertCommunicationChannelsForAPI(catalog.communicationChannels)
      : []
  }
  
  // Remove camelCase version
  delete (apiCatalog as any).communicationChannels
  
  return apiCatalog
}

/**
 * Convertit un catalog depuis l'API
 */
export function convertCatalogFromAPI(catalog: any): Catalog {
  return {
    ...catalog,
    communicationChannels: convertCommunicationChannelsFromAPI(catalog.communication_channels || catalog.communicationChannels)
  }
}
