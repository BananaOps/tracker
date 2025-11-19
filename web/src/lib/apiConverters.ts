import { 
  EventType, 
  Priority, 
  Status, 
  Environment,
  EventTypeNumber,
  PriorityToNumber,
  StatusToNumber,
  EnvironmentToNumber,
  CreateEventRequest
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
  const priority = typeof event.attributes.priority === 'number' 
    ? NumberToPriority[event.attributes.priority] 
    : event.attributes.priority

  const status = typeof event.attributes.status === 'number'
    ? NumberToStatus[event.attributes.status]
    : event.attributes.status

  const environment = event.attributes.environment && typeof event.attributes.environment === 'number'
    ? NumberToEnvironment[event.attributes.environment]
    : event.attributes.environment

  console.log('🔧 convertEventFromAPI:', {
    priority_in: event.attributes.priority,
    priority_out: priority,
    status_in: event.attributes.status,
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
