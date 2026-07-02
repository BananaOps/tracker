import type { FactorEvaluator } from '../types'
import { PREPARATION_PENALTIES } from '../constants'
import { clamp01 } from '../math'

/**
 * Preparation quality: missing rollback plan, runbook or defined owner all
 * raise risk. A known gap (`false`) is penalized more than unknown data.
 */
export const evaluatePreparation: FactorEvaluator = ({ event, profile }) => {
  const gaps: string[] = []
  let raw = 0

  if (event.hasRollbackPlan === false) {
    raw += PREPARATION_PENALTIES.rollbackPlanMissing
    gaps.push('no rollback plan')
  } else if (event.hasRollbackPlan === undefined) {
    raw += PREPARATION_PENALTIES.rollbackPlanUnknown
    gaps.push('rollback plan unknown')
  }

  if (event.hasRunbook === false) {
    raw += PREPARATION_PENALTIES.runbookMissing
    gaps.push('no runbook')
  } else if (event.hasRunbook === undefined) {
    raw += PREPARATION_PENALTIES.runbookUnknown
    gaps.push('runbook unknown')
  }

  if (profile && !profile.ownerDefined) {
    raw += PREPARATION_PENALTIES.ownerMissing
    gaps.push('no defined owner')
  } else if (!profile) {
    raw += PREPARATION_PENALTIES.ownerUnknown
    gaps.push('owner unknown')
  }

  return {
    raw: clamp01(raw),
    value: gaps.length === 0 ? 'well prepared' : gaps.join(', '),
    rationale:
      gaps.length === 0
        ? 'Rollback plan, runbook and owner are all in place.'
        : `Preparation gaps: ${gaps.join(', ')}.`,
  }
}
