import type { RiskFactorResult } from '../types'

interface RiskFactorsListProps {
  factors: RiskFactorResult[]
  /** Limit to the top N contributing factors. Default: all with contribution > 0. */
  maxItems?: number
  /** Accent color for the contribution bars (defaults to a neutral tint). */
  accentColor?: string
  /**
   * Also show factors that contributed 0 points, with their rationale. Useful
   * for a full "why" breakdown (e.g. "timing not significant for non-prod").
   */
  includeZeroContribution?: boolean
}

/**
 * Renders the most contributing factors, each with a proportional bar and a
 * short rationale — this is the "why" behind the score.
 */
export function RiskFactorsList({
  factors,
  maxItems,
  accentColor,
  includeZeroContribution = false,
}: RiskFactorsListProps) {
  const ranked = [...factors]
    .filter((f) => f.contribution > 0 || includeZeroContribution)
    .sort((a, b) => b.contribution - a.contribution)

  const visible = maxItems ? ranked.slice(0, maxItems) : ranked

  if (visible.length === 0) {
    return (
      <p className="text-xs italic" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
        No contributing risk factors.
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {visible.map((factor) => {
        const pct = factor.weight > 0 ? Math.round((factor.contribution / factor.weight) * 100) : 0
        return (
          <li key={factor.key}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--hud-on-surface))' }}>
                {factor.label}
              </span>
              <span
                className="text-[11px] tabular-nums font-semibold"
                style={{ color: 'rgb(var(--hud-on-surface-var))' }}
              >
                +{factor.contribution}
                <span className="opacity-60"> / {factor.weight}</span>
              </span>
            </div>
            <div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'rgb(var(--hud-outline-var) / 0.2)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: accentColor ?? 'rgb(var(--hud-primary))' }}
              />
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
              {factor.rationale}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

export default RiskFactorsList
