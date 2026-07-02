import type { FactorEvaluator } from '../types'
import { TIMING_RAW } from '../constants'

/**
 * Time sensitivity (V1, intentionally simple & configurable):
 * a prod change scheduled outside business hours is riskier (less staff on
 * hand to react). Non-prod changes contribute nothing.
 *
 * Assumption: `startsAt` is interpreted in UTC. Business hours are configured
 * in `config.businessHours`. TODO: per-team timezone support.
 */
export const evaluateTiming: FactorEvaluator = ({ event, config }) => {
  if (event.environment !== 'prod') {
    return {
      raw: TIMING_RAW.nonProd,
      value: 'non-prod',
      rationale: 'Non-production change — timing is not a significant risk.',
    }
  }

  const start = new Date(event.startsAt)
  if (Number.isNaN(start.getTime())) {
    return {
      raw: TIMING_RAW.prodBusinessHours,
      value: 'invalid-date',
      rationale: 'Could not parse start time — assuming business hours.',
    }
  }

  const { startHour, endHour, workingDays } = config.businessHours
  const day = start.getUTCDay()
  const hour = start.getUTCHours()
  const inHours = workingDays.includes(day) && hour >= startHour && hour < endHour

  if (inHours) {
    return {
      raw: TIMING_RAW.prodBusinessHours,
      value: 'business-hours',
      rationale: 'Production change scheduled during business hours (UTC).',
    }
  }
  return {
    raw: TIMING_RAW.prodOffHours,
    value: 'off-hours',
    rationale: 'Production change scheduled outside business hours (UTC).',
  }
}
