import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faWrench, faCodeBranch, faFire, faRobot } from '@fortawesome/free-solid-svg-icons'
import { EventType, Environment, Priority, Status } from '../types/api'

export const getEventTypeIcon = (type: EventType | string, className: string = 'w-5 h-5') => {
  const sizeClass = className.includes('w-') ? '' : 'w-5 h-5'
  const finalClass = `${sizeClass} ${className}`.trim()

  const typeStr = String(type).toLowerCase()

  switch (typeStr) {
    case 'deployment':
    case '1':
      return <FontAwesomeIcon icon={faRocket} className={`${finalClass} icon-gradient-blue`} />

    case 'operation':
    case '2':
      return <FontAwesomeIcon icon={faWrench} className={`${finalClass} icon-gradient-purple`} />

    case 'drift':
    case '3':
      return <FontAwesomeIcon icon={faCodeBranch} className={`${finalClass} icon-gradient-yellow`} />

    case 'incident':
    case '4':
      return <FontAwesomeIcon icon={faFire} className={`${finalClass} icon-gradient-red`} />

    case 'rpa_usage':
    case '5':
      return <FontAwesomeIcon icon={faRobot} className={`${finalClass} icon-gradient`} />

    default:
      return <FontAwesomeIcon icon={faFire} className={`${finalClass} text-hud-on-surface-var`} />
  }
}

export const getEventTypeColor = (type: EventType | string) => {
  const typeStr = String(type).toLowerCase()

  switch (typeStr) {
    case 'deployment':
    case '1':
      return {
        bg:      'bg-blue-50 dark:bg-blue-900/20',
        text:    'text-blue-700 dark:text-blue-300',
        border:  'border-blue-200 dark:border-blue-700/40',
        bgSolid: 'bg-blue-600',
      }
    case 'operation':
    case '2':
      return {
        bg:      'bg-violet-50 dark:bg-violet-900/20',
        text:    'text-violet-700 dark:text-violet-300',
        border:  'border-violet-200 dark:border-violet-700/40',
        bgSolid: 'bg-violet-600',
      }
    case 'drift':
    case '3':
      return {
        bg:      'bg-amber-50 dark:bg-amber-900/20',
        text:    'text-amber-700 dark:text-amber-300',
        border:  'border-amber-200 dark:border-amber-700/40',
        bgSolid: 'bg-amber-600',
      }
    case 'incident':
    case '4':
      return {
        bg:      'bg-red-50 dark:bg-red-900/20',
        text:    'text-red-700 dark:text-red-300',
        border:  'border-red-200 dark:border-red-700/40',
        bgSolid: 'bg-red-600',
      }
    case 'rpa_usage':
    case '5':
      return {
        bg:      'bg-teal-50 dark:bg-teal-900/20',
        text:    'text-teal-700 dark:text-teal-300',
        border:  'border-teal-200 dark:border-teal-700/40',
        bgSolid: 'bg-teal-600',
      }
    default:
      return {
        bg:      'bg-hud-surface-high',
        text:    'text-hud-on-surface-var',
        border:  'border-hud-outline-var',
        bgSolid: 'bg-hud-outline',
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
    case 'rpa_usage':
    case '5':
      return 'RPA Usage'
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
      return 'Environment'
  }
}

export const getEnvironmentColor = (env?: Environment | string) => {
  if (!env) return {
    bg:   'bg-hud-surface-high',
    text: 'text-hud-on-surface-var',
  }

  const envStr = String(env).toLowerCase()

  switch (envStr) {
    case 'development':
    case '1':
      return {
        bg:   'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-300',
      }
    case 'integration':
    case '2':
      return {
        bg:   'bg-teal-50 dark:bg-teal-900/20',
        text: 'text-teal-700 dark:text-teal-300',
      }
    case 'tnr':
    case '3':
    case 'uat':
    case '4':
    case 'recette':
    case '5':
      return {
        bg:   'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
      }
    case 'preproduction':
    case '6':
      return {
        bg:   'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
      }
    case 'production':
    case '7':
      return {
        bg:   'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
      }
    case 'mco':
    case '8':
      return {
        bg:   'bg-violet-50 dark:bg-violet-900/20',
        text: 'text-violet-700 dark:text-violet-300',
      }
    default:
      return {
        bg:   'bg-hud-surface-high',
        text: 'text-hud-on-surface-var',
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
    bg:   'bg-hud-surface-high',
    text: 'text-hud-on-surface-var',
  }

  const priorityStr = String(priority).toLowerCase()

  switch (priorityStr) {
    case 'p1':
    case '1':
      return {
        bg:   'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
      }
    case 'p2':
    case '2':
      return {
        bg:   'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
      }
    case 'p3':
    case '3':
      return {
        bg:   'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-300',
      }
    case 'p4':
    case '4':
    case 'p5':
    case '5':
      return {
        bg:   'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
      }
    default:
      return {
        bg:   'bg-hud-surface-high',
        text: 'text-hud-on-surface-var',
      }
  }
}

export const getStatusLabel = (status?: Status | string) => {
  if (!status) return 'Unknown'

  const statusStr = String(status).toLowerCase()

  switch (statusStr) {
    case 'start':
    case '1':
    case 'in_progress':
    case '12':
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
    case 'planned':
    case '13':
      return 'Planned'
    default:
      return 'Unknown'
  }
}

export const getStatusColor = (status?: Status | string) => {
  if (!status) return {
    bg:   'bg-hud-surface-high',
    text: 'text-hud-on-surface-var',
  }

  const statusStr = String(status).toLowerCase()

  switch (statusStr) {
    case 'success':
    case '3':
    case 'done':
    case '11':
      return {
        bg:   'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-300',
      }
    case 'failure':
    case '2':
    case 'error':
    case '5':
      return {
        bg:   'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
      }
    case 'start':
    case '1':
    case 'in_progress':
    case '12':
      return {
        bg:   'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
      }
    case 'warning':
    case '4':
      return {
        bg:   'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-300',
      }
    case 'open':
    case '9':
      return {
        bg:   'bg-sky-50 dark:bg-sky-900/20',
        text: 'text-sky-700 dark:text-sky-300',
      }
    case 'planned':
    case '13':
      return {
        bg:   'bg-violet-50 dark:bg-violet-900/20',
        text: 'text-violet-700 dark:text-violet-300',
      }
    case 'close':
    case '10':
      return {
        bg:   'bg-hud-surface-high',
        text: 'text-hud-on-surface-var',
      }
    default:
      return {
        bg:   'bg-hud-surface-high',
        text: 'text-hud-on-surface-var',
      }
  }
}

// Vérifier si un événement a été approuvé
export const isEventApproved = (event: any): boolean => {
  return event.changelog?.some((entry: any) =>
    String(entry.changeType).toLowerCase() === 'approved'
  ) || false
}
