import type { IconName } from '@/components/ui/icons'
import { EventType, Status } from '@/types/api'

/** The five statuses of the design system, drawn by StatusMark. */
export type DsStatus = 'failed' | 'warning' | 'running' | 'done' | 'open'

/** Icons that stand for an event type in the custom icon set. */
export type TypeIconName = Extract<IconName, 'deployment' | 'operation' | 'drifts' | 'incident' | 'rpa'>

const STATUS_MAP: Record<string, DsStatus> = {
  [Status.FAILURE]: 'failed',
  [Status.ERROR]: 'failed',
  [Status.WARNING]: 'warning',
  [Status.START]: 'running',
  [Status.IN_PROGRESS]: 'running',
  [Status.SUCCESS]: 'done',
  [Status.DONE]: 'done',
  [Status.CLOSE]: 'done',
}

/**
 * Maps an API status to its design system status. Only failures and warnings
 * carry colour; everything not listed (open, planned, waiting_approval,
 * snapshot, user_update, recommendation, unspecified) reads as open.
 */
export function toDsStatus(apiStatus: Status | string | null | undefined): DsStatus {
  if (!apiStatus) return 'open'
  return STATUS_MAP[apiStatus.toLowerCase()] ?? 'open'
}

const TYPE_ICON_MAP: Record<string, TypeIconName> = {
  [EventType.DEPLOYMENT]: 'deployment',
  [EventType.OPERATION]: 'operation',
  [EventType.DRIFT]: 'drifts',
  [EventType.INCIDENT]: 'incident',
  [EventType.RPA_USAGE]: 'rpa',
}

/** Maps an event type to its icon; an unknown or unspecified type falls back to operation. */
export function toTypeIcon(type: EventType | string | null | undefined): TypeIconName {
  if (!type) return 'operation'
  return TYPE_ICON_MAP[type.toLowerCase()] ?? 'operation'
}
