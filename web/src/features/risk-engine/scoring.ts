/**
 * Risk Engine — scoring orchestration (V1).
 *
 * `computeRiskScore` is the single public entry point. It is pure and
 * deterministic: given the same event + context + config, it always returns
 * the same assessment. All explainability is carried in `factors`.
 */

import type {
  ChangeEvent,
  FactorEvaluator,
  FactorKey,
  LevelThresholds,
  RiskAssessment,
  RiskEngineConfig,
  RiskFactorResult,
  RiskLevel,
  RiskEngineContext,
  ServiceRiskProfile,
} from './types'
import { DEFAULT_RISK_CONFIG, FACTOR_ORDER } from './constants'
import { clamp, clamp01 } from './math'

import { evaluateEnvironment } from './factors/environment'
import { evaluateChangeType } from './factors/change-type'
import { evaluateServiceCriticality } from './factors/service-criticality'
import { evaluateBlastRadius } from './factors/blast-radius'
import { evaluateIncidentHistory } from './factors/incident-history'
import { evaluateRollback } from './factors/rollback'
import { evaluatePreparation } from './factors/preparation'
import { evaluateTiming } from './factors/timing'

// Re-export math helpers so factors and consumers have a single source.
export { clamp, clamp01 } from './math'

/** Registry mapping each factor key to its evaluator. */
const FACTOR_EVALUATORS: Record<FactorKey, FactorEvaluator> = {
  environment: evaluateEnvironment,
  changeType: evaluateChangeType,
  serviceCriticality: evaluateServiceCriticality,
  blastRadius: evaluateBlastRadius,
  incidentHistory: evaluateIncidentHistory,
  rollback: evaluateRollback,
  preparation: evaluatePreparation,
  timing: evaluateTiming,
}

/**
 * Compute a fully-explained risk assessment for a change event.
 *
 * @param event   The change event to score.
 * @param context Engine context (service profiles, current time, ...).
 * @param config  Optional override of weights/thresholds/business hours.
 */
export function computeRiskScore(
  event: ChangeEvent,
  context: RiskEngineContext,
  config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): RiskAssessment {
  const profile = resolveProfile(event, context)
  const input = { event, profile, context, config }

  const factors: RiskFactorResult[] = FACTOR_ORDER.map((key) => {
    const evaluation = FACTOR_EVALUATORS[key](input)
    const meta = config.factorMeta[key]
    const raw = clamp01(evaluation.raw)
    return {
      key,
      label: meta.label,
      weight: meta.weight,
      contribution: Math.round(raw * meta.weight),
      value: evaluation.value,
      rationale: evaluation.rationale,
    }
  })

  const rawScore = factors.reduce((total, f) => total + f.contribution, 0)
  const score = clamp(Math.round(rawScore), 0, 100)
  const level = deriveLevel(score, config.thresholds)

  return {
    score,
    level,
    factors,
    summary: buildSummary(event, level, score, factors),
    recommendations: buildRecommendations(factors, event, profile),
  }
}

// Import kept below the function for readability of the public API first.

function resolveProfile(
  event: ChangeEvent,
  context: RiskEngineContext,
): ServiceRiskProfile | undefined {
  if (!event.serviceId) return undefined
  return context.serviceProfiles.find((p) => p.serviceId === event.serviceId)
}

/** Map a numeric score onto a readable level using the configured thresholds. */
export function deriveLevel(score: number, thresholds: LevelThresholds): RiskLevel {
  if (score >= thresholds.critical) return 'critical'
  if (score >= thresholds.high) return 'high'
  if (score >= thresholds.medium) return 'medium'
  return 'low'
}

/** Return the top `n` factors by contribution (descending), ignoring zeros. */
export function topFactors(factors: RiskFactorResult[], n: number): RiskFactorResult[] {
  return [...factors]
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, n)
}

function buildSummary(
  event: ChangeEvent,
  level: RiskLevel,
  score: number,
  factors: RiskFactorResult[],
): string {
  const drivers = topFactors(factors, 3)
    .map((f) => f.label.toLowerCase())
    .join(', ')
  const scope = `${event.type} on ${event.environment}`
  if (!drivers) {
    return `${capitalize(level)} risk (${score}/100) for this ${scope} change.`
  }
  return `${capitalize(level)} risk (${score}/100) for this ${scope} change. Main drivers: ${drivers}.`
}

function buildRecommendations(
  factors: RiskFactorResult[],
  event: ChangeEvent,
  profile: ServiceRiskProfile | undefined,
): string[] {
  const recommendations: string[] = []
  const byKey = new Map(factors.map((f) => [f.key, f]))

  if (event.hasRollbackPlan === false) {
    recommendations.push('Define and attach a rollback plan before execution.')
  }
  if (event.hasRunbook === false) {
    recommendations.push('Provide a runbook so on-call can react quickly.')
  }
  if (profile && !profile.ownerDefined) {
    recommendations.push('Assign a clear service owner for this change.')
  }
  if ((byKey.get('timing')?.value) === 'off-hours') {
    recommendations.push('Prefer scheduling within business hours, or ensure on-call coverage.')
  }
  if (profile?.criticality === 'tier1') {
    recommendations.push('Require peer review and staged rollout for this tier-1 service.')
  }
  if ((profile?.recentIncidentCount ?? 0) >= 3) {
    recommendations.push('Investigate recent incidents on this service before proceeding.')
  }
  if (profile?.rollbackDifficulty === 'hard') {
    recommendations.push('Rehearse the rollback path — recovery is known to be hard.')
  }

  return recommendations
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
