import type { FactorEvaluator } from '../types'
import { DEFAULT_RAW, INCIDENT_HISTORY_MAX } from '../constants'
import { clamp01 } from '../math'

/** Recent incident history: more recent incidents => higher risk. */
export const evaluateIncidentHistory: FactorEvaluator = ({ profile }) => {
  const count = profile?.recentIncidentCount
  if (count === undefined) {
    return {
      raw: DEFAULT_RAW.incidentHistory,
      value: 'unknown',
      rationale: 'No incident history available — assuming a low baseline.',
    }
  }
  const raw = clamp01(count / INCIDENT_HISTORY_MAX)
  return {
    raw,
    value: count,
    rationale: `${count} recent incident(s) on this service (saturates at ${INCIDENT_HISTORY_MAX}).`,
  }
}
