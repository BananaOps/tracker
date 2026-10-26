import { Priority, Status, Environment, EventTypeNumber, PriorityToNumber, StatusToNumber, EnvironmentToNumber, CreateEventRequest, CommunicationType, type CommunicationChannel, type Event } from '../types/api'
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
export function convertEventForAPI(event: CreateEventRequest): any {
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
export function convertEventFromAPI(event: any): Event {
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
/**
 * Convertit un catalog depuis l'API
 */
