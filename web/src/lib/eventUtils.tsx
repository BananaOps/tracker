import { Rocket, Wrench, TrendingDown, AlertTriangle } from 'lucide-react'
import { EventType } from '../types/api'

export const getEventTypeIcon = (type: EventType, className: string = 'w-5 h-5') => {
  switch (type) {
    case EventType.DEPLOYMENT:
      return <Rocket className={`${className} text-blue-600`} />
    case EventType.OPERATION:
      return <Wrench className={`${className} text-purple-600`} />
    case EventType.DRIFT:
      return <TrendingDown className={`${className} text-yellow-600`} />
    case EventType.INCIDENT:
      return <AlertTriangle className={`${className} text-red-600`} />
    default:
      return <AlertTriangle className={`${className} text-gray-600`} />
  }
}

export const getEventTypeColor = (type: EventType) => {
  switch (type) {
    case EventType.DEPLOYMENT:
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        bgSolid: 'bg-blue-600',
      }
    case EventType.OPERATION:
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        bgSolid: 'bg-purple-600',
      }
    case EventType.DRIFT:
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        bgSolid: 'bg-yellow-600',
      }
    case EventType.INCIDENT:
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        bgSolid: 'bg-red-600',
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        bgSolid: 'bg-gray-600',
      }
  }
}

export const getEventTypeLabel = (type: EventType) => {
  switch (type) {
    case EventType.DEPLOYMENT: return 'Déploiement'
    case EventType.OPERATION: return 'Opération'
    case EventType.DRIFT: return 'Drift'
    case EventType.INCIDENT: return 'Incident'
    default: return 'Événement'
  }
}
