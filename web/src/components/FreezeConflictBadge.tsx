import type { CSSProperties } from 'react'
import type { FreezeImpactResult } from '../types/freezeWindow'

interface FreezeConflictBadgeProps {
  impact: FreezeImpactResult
  /** compact: icon only; default: icon + label */
  variant?: 'compact' | 'default'
}

/**
 * Badge shown on an event when it conflicts with one or more freeze windows.
 * severity === 'none' renders nothing.
 */
export function FreezeConflictBadge({
  impact,
  variant = 'default',
}: FreezeConflictBadgeProps) {
  if (!impact.impacted || impact.severity === 'none') return null

  const isBlocked = impact.severity === 'blocked'

  const style: CSSProperties = isBlocked
    ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }
    : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }

  const icon = isBlocked ? '🔒' : '⚠️'
  const label = isBlocked ? 'Blocked' : 'Warning'

  return (
    <span
      className="inline-flex items-center gap-1 rounded text-[9px] font-bold px-1.5 py-0.5 shrink-0"
      style={style}
      title={impact.reason}
    >
      <span>{icon}</span>
      {variant === 'default' && <span className="uppercase tracking-wider">{label}</span>}
    </span>
  )
}

// ─── Inline reason tooltip ────────────────────────────────────────────────────

interface FreezeReasonBannerProps {
  impact: FreezeImpactResult
}

/**
 * Full-width banner shown in event detail panels.
 */
export function FreezeReasonBanner({ impact }: FreezeReasonBannerProps) {
  if (!impact.impacted) return null

  const isBlocked = impact.severity === 'blocked'
  const style: CSSProperties = isBlocked
    ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }
    : { background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
      style={style}
    >
      <span className="shrink-0 mt-px">{isBlocked ? '🔒' : '⚠️'}</span>
      <div>
        <p className="font-semibold">{isBlocked ? 'Deployment blocked' : 'Deployment warning'}</p>
        <p className="mt-0.5 opacity-80">{impact.reason}</p>
        {impact.matchedFreezeWindows.length > 1 && (
          <p className="mt-1 opacity-70">
            +{impact.matchedFreezeWindows.length - 1} other freeze window{impact.matchedFreezeWindows.length > 2 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
