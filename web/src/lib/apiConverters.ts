import { Priority, Status, Environment, EventTypeNumber, PriorityToNumber, StatusToNumber, EnvironmentToNumber, CreateEventRequest, CommunicationType, type CommunicationChannel, type Event, type Catalog } from '../types/api'
// Mapping inverse : nombre -> string enum
const NumberToPriority: Record<number, Priority> = {
  1: Priority.P1,
  2: Priority.P2,
  3: Priority.P3,
  4: Priority.P4,
  5: Priority.P5,
}

const NumberToStatus: Record<number, Status> = {
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
  12: Status.IN_PROGRESS,
  13: Status.PLANNED,
  14: Status.WAITING_APPROVAL,
}

const NumberToEnvironment: Record<number, Environment> = {
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
// The body the gateway expects for a create or an update: the event fields,
// with the enums as their numbers.
export type ApiEventRequest = Omit<CreateEventRequest, 'attributes'> & {
  attributes: Omit<CreateEventRequest['attributes'], 'type' | 'priority' | 'status' | 'environment'> & {
    type?: number
    priority?: number
    status?: number
    environment?: number
  }
}

export function convertEventForAPI(event: CreateEventRequest): ApiEventRequest {
  // Convertir les dates en format protobuf Timestamp si elles existent
  const convertDate = (dateStr: string | undefined) => {
    if (!dateStr) return undefined
    
    // Si c'est déjà au format ISO complet, le garder
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
      return dateStr
    }
    
    // Sinon, convertir en ISO complet
    try {
      return new Date(dateStr).toISOString()
    } catch (e) {
      console.error('Error converting date:', dateStr, e)
      return undefined
    }
  }

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
      startDate: convertDate(event.attributes.startDate),
      endDate: convertDate(event.attributes.endDate),
    },
  }
}

/**
 * Convertit les nombres de l'API en enums string pour le frontend
 * Utilisé quand l'API renvoie des nombres au lieu de strings
 */
// An event as received: the enums by number, or by name in any case ("P1").
type ApiEnum = string | number | undefined
export type ApiEvent = Omit<Event, 'attributes'> & {
  attributes: Omit<Event['attributes'], 'priority' | 'status' | 'environment'> & {
    priority?: ApiEnum
    status?: ApiEnum
    environment?: ApiEnum
  }
}

function enumFromAPI<T>(value: ApiEnum, byNumber: Record<number, T>): T | undefined {
  if (typeof value === 'number') return byNumber[value]
  // the web enums are the lower case of the proto names
  if (typeof value === 'string' && value) return value.toLowerCase() as T
  return undefined
}

export function convertEventFromAPI(event: ApiEvent): Event {
  const priority = enumFromAPI(event.attributes.priority, NumberToPriority) as Priority
  const status = enumFromAPI(event.attributes.status, NumberToStatus) as Status
  const environment = enumFromAPI(event.attributes.environment, NumberToEnvironment)

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
/**
 * Convertit les canaux de communication pour l'API (camelCase -> snake_case)
 */
/**
 * Convertit les canaux de communication depuis l'API (snake_case -> camelCase)
 */
export function convertCommunicationChannelsFromAPI(channels: CommunicationChannel[]): CommunicationChannel[] {
  if (!channels) return []
  
  return channels.map(channel => ({
    type: channel.type as CommunicationType,
    name: channel.name,
    url: channel.url,
    description: channel.description
  }))
}

/**
 * A catalog entry as the gateway returns it: protojson already uses the
 * camelCase field names of Catalog and writes the wrapper types of the SLA
 * (DoubleValue, UInt32Value) as plain numbers. Only the lists are defaulted.
 */
export function catalogFromAPI(raw: Catalog): Catalog {
  return {
    ...raw,
    communicationChannels: convertCommunicationChannelsFromAPI(raw.communicationChannels ?? []),
    dashboardLinks: raw.dashboardLinks ?? [],
    infrastructureResources: raw.infrastructureResources ?? [],
  }
}
