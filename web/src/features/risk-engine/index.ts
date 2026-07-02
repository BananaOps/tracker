/**
 * Risk Engine — public API (V1).
 *
 * Import everything from this barrel:
 *   import { computeRiskScore, RiskScoreBadge } from '@/features/risk-engine'
 *
 * ---------------------------------------------------------------------------
 * TODO — future backend & observability integrations
 * ---------------------------------------------------------------------------
 * The V1 engine is pure/frontend with mockable data. Planned extensions:
 *
 *  1. Real service profiles: replace `mocks.ts` with data from a
 *     `GET /api/services/:id/risk-profile` endpoint (criticality, ownership,
 *     dependency graph, traffic). Feed it into `RiskEngineContext`.
 *
 *  2. Incident history: back `recentIncidentCount` with real incident data
 *     (e.g. from the events store / an incidents service) and add decay by age.
 *
 *  3. CI/CD signals: add a `pipeline` factor (test coverage, flaky rate,
 *     rollback success rate) — new file under `factors/`, new weight in
 *     `constants.ts` (rebalance weights to keep sum = 100).
 *
 *  4. Freeze windows: implement a `freezeWindow` factor consuming
 *     `context.activeFreezeWindows` (currently typed `unknown[]`).
 *
 *  5. Dependencies / blast radius: use the real service dependency graph
 *     instead of a flat `dependencyCount`.
 *
 *  6. Observability: emit the assessment (score, level, top factors) as a
 *     metric/trace attribute when a change is created, so risk can be tracked
 *     over time and correlated with actual incidents (feedback loop to tune
 *     weights). Add structured logging of factor contributions.
 *
 *  7. Server parity: if scoring moves server-side, keep this module as the
 *     shared contract (types) and consider generating it from proto.
 */

export * from './types'
export * from './constants'
export {
  computeRiskScore,
  deriveLevel,
  topFactors,
  clamp,
  clamp01,
} from './scoring'
export { getRiskLevelVisual, getRiskLevelScale } from './theme'
export type { RiskLevelVisual, RiskLevelBand } from './theme'

export {
  mockServiceProfiles,
  mockChangeEvents,
  mockRiskContext,
  getMockAssessments,
} from './mocks'

export { RiskScoreBadge } from './components/risk-score-badge'
export { RiskScoreCard } from './components/risk-score-card'
export { RiskFactorsList } from './components/risk-factors-list'

export {
  toChangeEvent,
  buildRiskContext,
  assessAppEvent,
  getEventId,
} from './adapters'
