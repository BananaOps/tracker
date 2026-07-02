import type { FactorEvaluator } from '../types'
import { CRITICALITY_RISK, DEFAULT_RAW } from '../constants'

/** Service criticality: tier1 > tier2 > tier3. Prudent default if unknown. */
export const evaluateServiceCriticality: FactorEvaluator = ({ profile }) => {
  if (!profile) {
    return {
      raw: DEFAULT_RAW.serviceCriticality,
      value: 'unknown',
      rationale: 'No service profile found — assuming moderate criticality.',
    }
  }
  return {
    raw: CRITICALITY_RISK[profile.criticality],
    value: profile.criticality,
    rationale: `Service is classified as ${profile.criticality}.`,
  }
}
