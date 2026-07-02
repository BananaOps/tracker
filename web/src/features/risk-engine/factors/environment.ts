import type { FactorEvaluator } from '../types'
import { ENVIRONMENT_RISK } from '../constants'

/** Environment risk: prod > preprod > staging > dev. */
export const evaluateEnvironment: FactorEvaluator = ({ event }) => {
  const raw = ENVIRONMENT_RISK[event.environment]
  return {
    raw,
    value: event.environment,
    rationale: `Change targets the "${event.environment}" environment.`,
  }
}
