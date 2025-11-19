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

/**
 * Convertit les enums string en nombres pour l'API
 * L'API attend des nombres pour les POST mais renvoie des strings pour les GET
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
