/**
 * Risk Engine — tunable constants (V1).
 *
 * Every number that influences a score lives here so the scoring rules stay
 * explicit and easy to adjust without touching logic. Keep factor weights
 * summing to 100 so the raw weighted sum maps directly onto the 0..100 scale.
 */

import type {
  BusinessHoursConfig,
  ChangeType,
  Environment,
  FactorKey,
  FactorMeta,
  LevelThresholds,
  RiskEngineConfig,
  RollbackDifficulty,
  ServiceCriticality,
} from './types'

// ---------------------------------------------------------------------------
// Factor weights (must sum to 100)
// ---------------------------------------------------------------------------

export const FACTOR_META: Record<FactorKey, FactorMeta> = {
  environment: { label: 'Environment', weight: 18 },
  changeType: { label: 'Change type', weight: 15 },
  serviceCriticality: { label: 'Service criticality', weight: 15 },
  blastRadius: { label: 'Blast radius', weight: 12 },
  incidentHistory: { label: 'Recent incidents', weight: 12 },
  rollback: { label: 'Rollback difficulty', weight: 10 },
  preparation: { label: 'Preparation', weight: 10 },
  timing: { label: 'Timing', weight: 8 },
}

/** Deterministic order used when iterating factors. */
export const FACTOR_ORDER: FactorKey[] = [
  'environment',
  'changeType',
  'serviceCriticality',
  'blastRadius',
  'incidentHistory',
  'rollback',
  'preparation',
  'timing',
]

// ---------------------------------------------------------------------------
// Per-factor raw sub-score tables (normalized to [0, 1])
// ---------------------------------------------------------------------------

export const ENVIRONMENT_RISK: Record<Environment, number> = {
  prod: 1.0,
  preprod: 0.55,
  staging: 0.25,
  dev: 0.1,
}

export const CHANGE_TYPE_RISK: Record<ChangeType, number> = {
  database: 1.0,
  infrastructure: 0.95,
  network: 0.9,
  security: 0.7,
  config: 0.5,
  deploy: 0.5,
  maintenance: 0.35,
}

export const CRITICALITY_RISK: Record<ServiceCriticality, number> = {
  tier1: 1.0,
  tier2: 0.6,
  tier3: 0.3,
}

export const ROLLBACK_DIFFICULTY_RISK: Record<RollbackDifficulty, number> = {
  hard: 1.0,
  medium: 0.55,
  easy: 0.2,
}

/** dependencyCount >= this value maps to the maximum blast-radius sub-score. */
export const BLAST_RADIUS_MAX_DEPENDENCIES = 15

/** recentIncidentCount >= this value maps to the maximum history sub-score. */
export const INCIDENT_HISTORY_MAX = 5

// ---------------------------------------------------------------------------
// Preparation penalties (summed, then clamped to 1)
// A `false` value is a known gap; `undefined` is unknown and penalized less.
// ---------------------------------------------------------------------------

export const PREPARATION_PENALTIES = {
  rollbackPlanMissing: 0.4,
  rollbackPlanUnknown: 0.2,
  runbookMissing: 0.3,
  runbookUnknown: 0.15,
  ownerMissing: 0.3,
  ownerUnknown: 0.15,
} as const

// ---------------------------------------------------------------------------
// Prudent defaults used when context data is missing.
// Chosen to be cautious but not alarmist (never max out on absence of data).
// ---------------------------------------------------------------------------

export const DEFAULT_RAW = {
  /** No service profile => assume mid criticality. */
  serviceCriticality: 0.5,
  /** No dependency data => small, non-zero blast radius. */
  blastRadius: 0.3,
  /** No incident data => low-but-present baseline. */
  incidentHistory: 0.2,
  /** No rollback difficulty => neutral/medium. */
  rollback: 0.5,
} as const

// ---------------------------------------------------------------------------
// Timing sub-scores (prod only; non-prod contributes 0)
// ---------------------------------------------------------------------------

export const TIMING_RAW = {
  prodOffHours: 1.0,
  prodBusinessHours: 0.2,
  nonProd: 0.0,
} as const

// ---------------------------------------------------------------------------
// Level thresholds: 0-24 low, 25-49 medium, 50-74 high, 75-100 critical
// ---------------------------------------------------------------------------

export const LEVEL_THRESHOLDS: LevelThresholds = {
  medium: 25,
  high: 50,
  critical: 75,
}

// ---------------------------------------------------------------------------
// Default business hours (UTC). Off-hours in prod raises the timing factor.
// Assumption: `startsAt` is interpreted in UTC for V1. TODO: per-team TZ.
// ---------------------------------------------------------------------------

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 8,
  endHour: 19,
  workingDays: [1, 2, 3, 4, 5], // Monday..Friday (UTC)
}

// ---------------------------------------------------------------------------
// Bundled default config consumed by `computeRiskScore`.
// ---------------------------------------------------------------------------

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  factorMeta: FACTOR_META,
  thresholds: LEVEL_THRESHOLDS,
  businessHours: DEFAULT_BUSINESS_HOURS,
}
