import type { FactorEvaluator } from '../types'
import { CHANGE_TYPE_RISK } from '../constants'

/** Change-type risk: database/infra/network are the most dangerous. */
export const evaluateChangeType: FactorEvaluator = ({ event }) => {
  const raw = CHANGE_TYPE_RISK[event.type]
  return {
    raw,
    value: event.type,
    rationale: `"${event.type}" changes carry a ${describe(raw)} intrinsic risk.`,
  }
}

function describe(raw: number): string {
  if (raw >= 0.85) return 'very high'
  if (raw >= 0.65) return 'high'
  if (raw >= 0.45) return 'moderate'
  return 'low'
}
