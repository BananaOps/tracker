import type { FactorEvaluator } from '../types'
import { DEFAULT_RAW, ROLLBACK_DIFFICULTY_RISK } from '../constants'

/** Rollback difficulty: hard > medium > easy. Neutral default if unknown. */
export const evaluateRollback: FactorEvaluator = ({ profile }) => {
  const difficulty = profile?.rollbackDifficulty
  if (difficulty === undefined) {
    return {
      raw: DEFAULT_RAW.rollback,
      value: 'unknown',
      rationale: 'Rollback difficulty unknown — assuming medium.',
    }
  }
  return {
    raw: ROLLBACK_DIFFICULTY_RISK[difficulty],
    value: difficulty,
    rationale: `Rollback is rated "${difficulty}".`,
  }
}
