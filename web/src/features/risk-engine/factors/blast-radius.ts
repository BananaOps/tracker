import type { FactorEvaluator } from '../types'
import { BLAST_RADIUS_MAX_DEPENDENCIES, DEFAULT_RAW } from '../constants'
import { clamp01 } from '../math'

/**
 * Simplified blast radius: the more downstream dependencies a service has,
 * the wider the impact of a failed change. V1 uses `dependencyCount` only;
 * traffic level and dependency graph depth are future refinements.
 */
export const evaluateBlastRadius: FactorEvaluator = ({ profile }) => {
  const count = profile?.dependencyCount
  if (count === undefined) {
    return {
      raw: DEFAULT_RAW.blastRadius,
      value: 'unknown',
      rationale: 'No dependency data — assuming a small blast radius.',
    }
  }
  const raw = clamp01(count / BLAST_RADIUS_MAX_DEPENDENCIES)
  return {
    raw,
    value: count,
    rationale: `${count} known dependency(ies) (saturates at ${BLAST_RADIUS_MAX_DEPENDENCIES}).`,
  }
}
