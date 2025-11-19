import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faWrench, faCodeBranch, faFire } from '@fortawesome/free-solid-svg-icons'
import { EventType, Environment, Priority, Status } from '../types/api'

export const getEventTypeIcon = (type: EventType | string, className: string = 'w-5 h-5') => {
  const sizeClass = className.includes('w-') ? '' : 'w-5 h-5'
  const finalClass = `${sizeClass} ${className}`.trim()
  
  // Normaliser le type en string lowercase
  const typeStr = String(type).toLowerCase()
  
  console.log('🔍 getEventTypeIcon:', type, '→', typeStr)
  
  switch (typeStr) {
    case 'deployment':
    case '1':
      console.log('✅ → ROCKET (Déploiement)')
      return <FontAwesomeIcon icon={faRocket} className={`${finalClass} text-blue-600`} />
    
    case 'operation':
    case '2':
      console.log('✅ → WRENCH (Opération)')
      return <FontAwesomeIcon icon={faWrench} className={`${finalClass} text-purple-600`} />
    
    case 'drift':
    case '3':
      console.log('✅ → CODE_BRANCH (Drift)')
      return <FontAwesomeIcon icon={faCodeBranch} className={`${finalClass} text-yellow-600`} />
    
    case 'incident':
    case '4':
      console.log('✅ → FIRE (Incident)')
      return <FontAwesomeIcon icon={faFire} className={`${finalClass} text-red-600`} />
    
    default:
      console.warn('⚠️ Type inconnu:', type, typeStr)
      return <FontAwesomeIcon icon={faFire} className={`${finalClass} text-gray-600`} />
  }
}

export const getEventTypeColor = (type: EventType | string) => {
  const typeStr = String(type).toLowerCase()
  
  switch (typeStr) {
    case 'deployment':
    case '1':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        bgSolid: 'bg-blue-600',
      }
    case 'operation':
    case '2':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        bgSolid: 'bg-purple-600',
      }
    case 'drift':
    case '3':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        bgSolid: 'bg-yellow-600',
      }
    case 'incident':
    case '4':
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

export const getEventTypeLabel = (type: EventType | string) => {
  const typeStr = String(type).toLowerCase()
  
  switch (typeStr) {
    case 'deployment':
    case '1':
      return 'Deployment'
    case 'operation':
    case '2':
      return 'Operation'
    case 'drift':
    case '3':
      return 'Drift'
    case 'incident':
    case '4':
      return 'Incident'
    default:
      return 'Event'
  }
}

export const getEventTypeLabelWithIcon = (type: EventType) => {
  const icon = getEventTypeIcon(type, 'w-4 h-4')
  const label = getEventTypeLabel(type)
  return { icon, label }
}

export const getEnvironmentLabel = (env?: Environment | string) => {
  if (!env) return null
  
  const envStr = String(env).toLowerCase()
  
  switch (envStr) {
    case 'development':
    case '1':
      return 'Development'
    case 'integration':
    case '2':
      return 'Integration'
    case 'tnr':
    case '3':
      return 'TNR'
    case 'uat':
    case '4':
      return 'UAT'
    case 'recette':
    case '5':
      return 'Recette'
    case 'preproduction':
    case '6':
      return 'Pré-production'
    case 'production':
    case '7':
      return 'Production'
    case 'mco':
    case '8':
      return 'MCO'
    default:
      return 'Environnement'
  }
}

export const getEnvironmentColor = (env?: Environment | string) => {
  if (!env) return {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  }
  
  const envStr = String(env).toLowerCase()
  
  switch (envStr) {
    case 'development':
    case '1':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
      }
    case 'integration':
    case '2':
      return {
        bg: 'bg-teal-100',
        text: 'text-teal-800',
      }
    case 'tnr':
    case '3':
    case 'uat':
    case '4':
    case 'recette':
    case '5':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
      }
    case 'preproduction':
    case '6':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
      }
    case 'production':
    case '7':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
      }
    case 'mco':
    case '8':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
      }
  }
}

export const getPriorityLabel = (priority?: Priority | string) => {
  if (!priority) return 'P?'
  
  const priorityStr = String(priority).toLowerCase()
  
  switch (priorityStr) {
    case 'p1':
    case '1':
      return 'P1'
    case 'p2':
    case '2':
      return 'P2'
    case 'p3':
    case '3':
      return 'P3'
    case 'p4':
    case '4':
      return 'P4'
    case 'p5':
    case '5':
      return 'P5'
    default:
      return 'P?'
  }
}

export const getPriorityColor = (priority?: Priority | string) => {
  if (!priority) return {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  }
  
  const priorityStr = String(priority).toLowerCase()
  
  switch (priorityStr) {
    case 'p1':
    case '1':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
      }
    case 'p2':
    case '2':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
      }
    case 'p3':
    case '3':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
      }
    case 'p4':
    case '4':
    case 'p5':
    case '5':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
      }
  }
}

export const getStatusLabel = (status?: Status | string) => {
  if (!status) return 'Unknown'
  
  const statusStr = String(status).toLowerCase()
  
  switch (statusStr) {
    case 'start':
    case '1':
      return 'In Progress'
    case 'failure':
    case '2':
      return 'Failed'
    case 'success':
    case '3':
      return 'Success'
    case 'warning':
    case '4':
      return 'Warning'
    case 'error':
    case '5':
      return 'Error'
    case 'snapshot':
    case '6':
      return 'Snapshot'
    case 'user_update':
    case '7':
      return 'Update'
    case 'recommendation':
    case '8':
      return 'Recommendation'
    case 'open':
    case '9':
      return 'Open'
    case 'close':
    case '10':
      return 'Closed'
    case 'done':
    case '11':
      return 'Done'
    default:
      return 'Unknown'
  }
}

export const getStatusColor = (status?: Status | string) => {
  if (!status) return {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  }
  
  const statusStr = String(status).toLowerCase()
  
  switch (statusStr) {
    case 'success':
    case '3':
    case 'done':
    case '11':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
      }
    case 'failure':
    case '2':
    case 'error':
    case '5':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
      }
    case 'start':
    case '1':
    case 'warning':
    case '4':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
      }
    case 'open':
    case '9':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
      }
  }
}
