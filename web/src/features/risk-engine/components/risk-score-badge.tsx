import type { RiskLevel } from '../types'
import { getRiskLevelVisual } from '../theme'

interface RiskScoreBadgeProps {
  level: RiskLevel
  score: number
  /** Show the numeric score next to the level. Default: true. */
  showScore?: boolean
  className?: string
}

/**
 * Compact risk pill for dense contexts (lists, calendar cells, tables).
 * Colored dot + level, optionally with the numeric score.
 */
export function RiskScoreBadge({ level, score, showScore = true, className }: RiskScoreBadgeProps) {
  const visual = getRiskLevelVisual(level)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none ${className ?? ''}`}
      style={{ background: visual.softBg, color: visual.color, border: `1px solid ${visual.border}` }}
      title={`Risk: ${visual.label} (${score}/100)`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: visual.color }} aria-hidden />
      <span>{visual.label}</span>
      {showScore && <span className="tabular-nums opacity-90">{score}</span>}
    </span>
  )
}

export default RiskScoreBadge
