import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import type { RiskAssessment } from '../types'
import { getRiskLevelVisual, getRiskLevelScale } from '../theme'
import { DEFAULT_RISK_CONFIG } from '../constants'
import { RiskFactorsList } from './risk-factors-list'

interface RiskScoreCardProps {
  assessment: RiskAssessment
  /** How many top factors to display before "show all". Default: 4. */
  maxFactors?: number
  className?: string
}

/**
 * Detailed, self-explaining risk card for the event-detail page:
 * big score + level, a gauge, the one-line summary, the contributing factors
 * (expandable to the full breakdown), recommendations, and a "how is this
 * calculated" panel with the methodology and the level scale.
 */
export function RiskScoreCard({ assessment, maxFactors = 4, className }: RiskScoreCardProps) {
  const { score, level, summary, factors, recommendations } = assessment
  const visual = getRiskLevelVisual(level)

  const [showAllFactors, setShowAllFactors] = useState(false)
  const [showMethodology, setShowMethodology] = useState(false)

  const contributingCount = factors.filter((f) => f.contribution > 0).length
  const canExpandFactors = showAllFactors || contributingCount > maxFactors
  const scale = getRiskLevelScale(DEFAULT_RISK_CONFIG.thresholds)

  return (
    <section
      className={`rounded-xl p-4 ${className ?? ''}`}
      style={{
        background: 'rgb(var(--hud-surface))',
        border: '1px solid rgb(var(--hud-outline-var) / 0.2)',
      }}
    >
      {/* Header: score + level */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl"
          style={{ background: visual.softBg, border: `1px solid ${visual.border}` }}
        >
          <span className="text-2xl font-bold leading-none tabular-nums" style={{ color: visual.color }}>
            {score}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: visual.color }}>
            / 100
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold"
              style={{ background: visual.softBg, color: visual.color, border: `1px solid ${visual.border}` }}
            >
              {visual.label} risk
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
            {summary}
          </p>
        </div>
      </div>

      {/* Gauge with level bands */}
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'rgb(var(--hud-outline-var) / 0.2)' }}
      >
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: visual.color }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {scale.map((band) => (
          <div key={band.level} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: band.color }} />
            <span
              className="text-[9px] font-medium uppercase tracking-wide"
              style={{ color: level === band.level ? band.color : 'rgb(var(--hud-on-surface-var))' }}
            >
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* Factors */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgb(var(--hud-on-surface-var))' }}
          >
            {showAllFactors ? 'All risk factors' : 'Top risk factors'}
          </h4>
          {canExpandFactors && (
            <button
              type="button"
              onClick={() => setShowAllFactors((v) => !v)}
              className="text-[10px] font-semibold uppercase tracking-wider transition-colors hover:underline"
              style={{ color: visual.color }}
            >
              {showAllFactors ? 'Show less' : `Show all ${factors.length}`}
            </button>
          )}
        </div>
        <RiskFactorsList
          factors={factors}
          maxItems={showAllFactors ? undefined : maxFactors}
          includeZeroContribution={showAllFactors}
          accentColor={visual.color}
        />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-4">
          <h4
            className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgb(var(--hud-on-surface-var))' }}
          >
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {recommendations.map((rec) => (
              <li
                key={rec}
                className="flex items-start gap-2 text-xs"
                style={{ color: 'rgb(var(--hud-on-surface))' }}
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: visual.color }} />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How is this calculated? */}
      <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgb(var(--hud-outline-var) / 0.15)' }}>
        <button
          type="button"
          onClick={() => setShowMethodology((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          style={{ color: 'rgb(var(--hud-on-surface-var))' }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
            <Info className="h-3.5 w-3.5" />
            How is this score calculated?
          </span>
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{ transform: showMethodology ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {showMethodology && (
          <div className="mt-2.5 space-y-3">
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
              The score is a weighted sum of {factors.length} independent factors, capped at 100. Each
              factor adds up to its own maximum (its <span className="font-semibold">weight</span>); the
              bars above show how many points each one actually contributed for this change. A higher
              score means more caution is warranted before execution.
            </p>

            {/* Level scale */}
            <div>
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgb(var(--hud-on-surface-var))' }}
              >
                Level scale
              </p>
              <div className="space-y-1">
                {scale.map((band) => (
                  <div key={band.level} className="flex items-center gap-2 text-[11px]">
                    <span
                      className="inline-flex w-16 justify-center rounded px-1.5 py-0.5 font-semibold"
                      style={{ background: `${band.color}22`, color: band.color, border: `1px solid ${band.color}59` }}
                    >
                      {band.label}
                    </span>
                    <span className="tabular-nums" style={{ color: 'rgb(var(--hud-on-surface))' }}>
                      {band.min}–{band.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] italic leading-relaxed" style={{ color: 'rgb(var(--hud-on-surface-var))' }}>
              V1 heuristic: some inputs (service criticality, recent incidents, ownership) are derived
              from the events currently loaded. When data is missing, prudent defaults are used — the
              per-factor rationale above states when that happens.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default RiskScoreCard
