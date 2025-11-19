import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faWrench, faCodeBranch, faFire } from '@fortawesome/free-solid-svg-icons'
import { EventType } from '../types/api'

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

export const getEventTypeColor = (type: EventType) => {
  const typeNum = Number(type)
  
  switch (typeNum) {
    case 1: // DEPLOYMENT
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        bgSolid: 'bg-blue-600',
      }
    case 2: // OPERATION
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        bgSolid: 'bg-purple-600',
      }
    case 3: // DRIFT
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        bgSolid: 'bg-yellow-600',
      }
    case 4: // INCIDENT
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
  const typeNum = Number(type)
  
  switch (typeNum) {
    case 1: return 'Déploiement'
    case 2: return 'Opération'
    case 3: return 'Drift'
    case 4: return 'Incident'
    default: return 'Événement'
  }
}

export const getEventTypeLabelWithIcon = (type: EventType) => {
  const icon = getEventTypeIcon(type, 'w-4 h-4')
  const label = getEventTypeLabel(type)
  return { icon, label }
}
