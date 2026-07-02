/**
 * Risk Engine — visual mapping for risk levels.
 *
 * Colors are chosen to read on both light and dark surfaces. Badges/cards use
 * a translucent tint of the base color (8-digit hex alpha) so they sit calmly
 * on `--hud-surface` in either mode while keeping a strong signal.
 *
 *  - low      => discreet green (calm/neutral)
 *  - medium   => amber
 *  - high     => orange/red
 *  - critical => strong magenta/red
 */

import type { RiskLevel } from './types'
import type { LevelThresholds } from './types'

export interface RiskLevelVisual {
  label: string
  /** Base accent color (used for text, dot, gauge fill). */
  color: string
  /** Translucent background tint. */
  softBg: string
  /** Translucent border. */
  border: string
}

const BASE: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B' },
  high: { label: 'High', color: '#F97316' },
  critical: { label: 'Critical', color: '#E11D48' },
}

export function getRiskLevelVisual(level: RiskLevel): RiskLevelVisual {
  const { label, color } = BASE[level]
  return {
    label,
    color,
    softBg: `${color}22`, // ~13% alpha
    border: `${color}59`, // ~35% alpha
  }
}

export interface RiskLevelBand {
  level: RiskLevel
  label: string
  color: string
  /** Inclusive lower bound of the score band. */
  min: number
  /** Inclusive upper bound of the score band. */
  max: number
}

/**
 * Build the readable score scale (the four level bands) from the configured
 * thresholds — used to explain to users how a score maps to a level.
 */
export function getRiskLevelScale(thresholds: LevelThresholds): RiskLevelBand[] {
  return [
    { level: 'low', ...BASE.low, min: 0, max: thresholds.medium - 1 },
    { level: 'medium', ...BASE.medium, min: thresholds.medium, max: thresholds.high - 1 },
    { level: 'high', ...BASE.high, min: thresholds.high, max: thresholds.critical - 1 },
    { level: 'critical', ...BASE.critical, min: thresholds.critical, max: 100 },
  ]
}
