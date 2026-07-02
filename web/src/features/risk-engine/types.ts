/**
 * Risk Engine — domain & engine types (V1).
 *
 * Design goals:
 * - Strict typing, no `any`.
 * - Pure, deterministic scoring.
 * - Every score is explainable via `RiskFactorResult[]` (no black box).
 *
 * This file only contains types. Tunable numbers live in `constants.ts`,
 * the scoring orchestration in `scoring.ts`, and per-factor rules in `factors/`.
 */

// ---------------------------------------------------------------------------
// Domain enums (kept as string unions for zero-cost serialization & DX)
// ---------------------------------------------------------------------------

export type ChangeType =
  | 'deploy'
  | 'config'
  | 'database'
  | 'infrastructure'
  | 'network'
  | 'security'
  | 'maintenance'

export type Environment = 'dev' | 'staging' | 'preprod' | 'prod'

export type ImpactLevel = 'low' | 'medium' | 'high'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

export type ServiceCriticality = 'tier1' | 'tier2' | 'tier3'

export type TrafficLevel = 'low' | 'medium' | 'high'

export type RollbackDifficulty = 'easy' | 'medium' | 'hard'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ---------------------------------------------------------------------------
// Business objects
// ---------------------------------------------------------------------------

export interface ChangeEvent {
  id: string
  title: string
  type: ChangeType
  environment: Environment
  serviceId?: string
  domainId?: string
  /** ISO 8601 datetime string. */
  startsAt: string
  /** ISO 8601 datetime string. */
  endsAt: string
  impact?: ImpactLevel
  priority?: PriorityLevel
  hasRollbackPlan?: boolean
  hasRunbook?: boolean
  initiatedBy?: string
}

export interface ServiceRiskProfile {
  serviceId: string
  criticality: ServiceCriticality
  ownerDefined: boolean
  productionTrafficLevel?: TrafficLevel
  dependencyCount?: number
  recentIncidentCount?: number
  rollbackDifficulty?: RollbackDifficulty
}

export interface RiskEngineContext {
  serviceProfiles: ServiceRiskProfile[]
  /**
   * Reserved for a future factor. Shape intentionally left `unknown` in V1
   * so the engine stays extensible without committing to a schema yet.
   * TODO(freeze-windows): type this once the freeze-window API lands.
   */
  activeFreezeWindows?: unknown[]
  /** ISO 8601 datetime string. Defaults to `event.startsAt` when omitted. */
  currentTime?: string
}

// ---------------------------------------------------------------------------
// Engine result types
// ---------------------------------------------------------------------------

/** Stable identifier for each scoring factor. */
export type FactorKey =
  | 'environment'
  | 'changeType'
  | 'serviceCriticality'
  | 'blastRadius'
  | 'incidentHistory'
  | 'rollback'
  | 'preparation'
  | 'timing'

export interface RiskFactorResult {
  key: FactorKey
  label: string
  /** Max points this factor can add to the final score. */
  weight: number
  /** Actual points this factor contributed (0..weight, rounded). */
  contribution: number
  /** The observed input value that drove the sub-score. */
  value: string | number | boolean
  /** Human-readable explanation of why this factor scored as it did. */
  rationale: string
}

export interface RiskAssessment {
  /** Final risk score, clamped to 0..100. */
  score: number
  level: RiskLevel
  factors: RiskFactorResult[]
  /** One-sentence, human-readable explanation of the score. */
  summary: string
  /** Actionable, deterministic recommendations derived from the factors. */
  recommendations: string[]
}

// ---------------------------------------------------------------------------
// Factor plumbing (internal, but exported for testing & custom factors)
// ---------------------------------------------------------------------------

/** Everything a factor evaluator is allowed to read. Keeps factors pure. */
export interface FactorInput {
  event: ChangeEvent
  /** Resolved from `context.serviceProfiles` by `event.serviceId`, if any. */
  profile: ServiceRiskProfile | undefined
  context: RiskEngineContext
  config: RiskEngineConfig
}

/**
 * A factor returns a normalized `raw` sub-score in [0, 1] plus explanation.
 * The engine turns `raw` into points using the factor's configured weight,
 * keeping weighting concerns out of the individual factors.
 */
export interface FactorEvaluation {
  raw: number
  value: string | number | boolean
  rationale: string
}

export type FactorEvaluator = (input: FactorInput) => FactorEvaluation

// ---------------------------------------------------------------------------
// Engine configuration (all tunables in one place — see constants.ts)
// ---------------------------------------------------------------------------

export interface FactorMeta {
  label: string
  /** Weight in points. The sum of all factor weights should equal 100. */
  weight: number
}

export interface BusinessHoursConfig {
  /** Inclusive start hour (0..23), interpreted in UTC. */
  startHour: number
  /** Exclusive end hour (0..23), interpreted in UTC. */
  endHour: number
  /** Allowed working days, using UTC day numbers (0 = Sunday .. 6 = Saturday). */
  workingDays: number[]
}

export interface LevelThresholds {
  /** score < medium => low. */
  medium: number
  /** score < high => medium. */
  high: number
  /** score < critical => high; score >= critical => critical. */
  critical: number
}

export interface RiskEngineConfig {
  factorMeta: Record<FactorKey, FactorMeta>
  thresholds: LevelThresholds
  businessHours: BusinessHoursConfig
}
