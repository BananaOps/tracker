/**
 * Risk Engine — unit tests (V1).
 *
 * These tests use Vitest's API (`describe`/`it`/`expect`). Vitest is not yet
 * wired into this project — see the note at the bottom of this file for the
 * one-time setup needed to run them.
 */

import { describe, it, expect } from 'vitest'

import { computeRiskScore } from '../scoring'
import { FACTOR_META, DEFAULT_RISK_CONFIG } from '../constants'
import type { ChangeEvent, RiskEngineContext, ServiceRiskProfile } from '../types'

const paymentsProfile: ServiceRiskProfile = {
  serviceId: 'svc-payments',
  criticality: 'tier1',
  ownerDefined: true,
  dependencyCount: 12,
  recentIncidentCount: 4,
  rollbackDifficulty: 'hard',
}

const context: RiskEngineContext = { serviceProfiles: [paymentsProfile] }

function makeEvent(overrides: Partial<ChangeEvent> = {}): ChangeEvent {
  return {
    id: 'evt-test',
    title: 'Test change',
    type: 'deploy',
    environment: 'prod',
    serviceId: 'svc-payments',
    startsAt: '2026-07-02T10:00:00.000Z', // Thursday, business hours (UTC)
    endsAt: '2026-07-02T11:00:00.000Z',
    ...overrides,
  }
}

describe('factor weights', () => {
  it('sum to 100', () => {
    const total = Object.values(FACTOR_META).reduce((s, f) => s + f.weight, 0)
    expect(total).toBe(100)
  })
})

describe('computeRiskScore', () => {
  it('is deterministic for the same input', () => {
    const a = computeRiskScore(makeEvent(), context)
    const b = computeRiskScore(makeEvent(), context)
    expect(a).toEqual(b)
  })

  it('clamps the score to 0..100', () => {
    const worst = computeRiskScore(
      makeEvent({
        type: 'database',
        environment: 'prod',
        startsAt: '2026-07-04T23:30:00.000Z', // Saturday off-hours
        hasRollbackPlan: false,
        hasRunbook: false,
      }),
      context,
    )
    expect(worst.score).toBeGreaterThanOrEqual(0)
    expect(worst.score).toBeLessThanOrEqual(100)
  })

  it('rates a prod tier-1 database change higher than a dev config change', () => {
    const high = computeRiskScore(makeEvent({ type: 'database', environment: 'prod' }), context)
    const low = computeRiskScore(
      makeEvent({ type: 'config', environment: 'dev', serviceId: undefined }),
      context,
    )
    expect(high.score).toBeGreaterThan(low.score)
  })

  it('maps scores to the expected levels via thresholds', () => {
    const { thresholds } = DEFAULT_RISK_CONFIG
    // Very low-risk change should land in the low band.
    const low = computeRiskScore(
      makeEvent({
        type: 'maintenance',
        environment: 'dev',
        serviceId: undefined,
        hasRollbackPlan: true,
        hasRunbook: true,
      }),
      { serviceProfiles: [] },
    )
    expect(low.score).toBeLessThan(thresholds.medium)
    expect(low.level).toBe('low')

    // Worst-case prod change should reach high or critical.
    const worst = computeRiskScore(
      makeEvent({
        type: 'database',
        environment: 'prod',
        startsAt: '2026-07-04T23:30:00.000Z',
        hasRollbackPlan: false,
        hasRunbook: false,
      }),
      context,
    )
    expect(worst.score).toBeGreaterThanOrEqual(thresholds.high)
    expect(['high', 'critical']).toContain(worst.level)
  })

  it('uses prudent defaults when no service profile is found', () => {
    const result = computeRiskScore(
      makeEvent({ serviceId: undefined }),
      { serviceProfiles: [] },
    )
    const criticality = result.factors.find((f) => f.key === 'serviceCriticality')
    expect(criticality?.value).toBe('unknown')
    // Prudent, not maxed-out.
    expect(criticality?.contribution).toBeLessThan(criticality!.weight)
    expect(criticality?.contribution).toBeGreaterThan(0)
  })

  it('penalizes missing preparation (no rollback plan / runbook)', () => {
    const prepared = computeRiskScore(
      makeEvent({ hasRollbackPlan: true, hasRunbook: true }),
      context,
    )
    const unprepared = computeRiskScore(
      makeEvent({ hasRollbackPlan: false, hasRunbook: false }),
      context,
    )
    const prep = (r: typeof prepared) => r.factors.find((f) => f.key === 'preparation')!.contribution
    expect(prep(unprepared)).toBeGreaterThan(prep(prepared))
    expect(unprepared.score).toBeGreaterThan(prepared.score)
  })

  it('raises the timing factor for prod off-hours changes', () => {
    const businessHours = computeRiskScore(
      makeEvent({ startsAt: '2026-07-02T10:00:00.000Z' }),
      context,
    )
    const offHours = computeRiskScore(
      makeEvent({ startsAt: '2026-07-04T23:30:00.000Z' }), // Saturday night
      context,
    )
    const timing = (r: typeof businessHours) => r.factors.find((f) => f.key === 'timing')!.contribution
    expect(timing(offHours)).toBeGreaterThan(timing(businessHours))
  })

  it('produces a summary and explains every factor', () => {
    const result = computeRiskScore(makeEvent(), context)
    expect(result.summary).toMatch(/risk/i)
    expect(result.factors).toHaveLength(Object.keys(FACTOR_META).length)
    for (const factor of result.factors) {
      expect(factor.rationale.length).toBeGreaterThan(0)
      expect(factor.contribution).toBeLessThanOrEqual(factor.weight)
      expect(factor.contribution).toBeGreaterThanOrEqual(0)
    }
  })
})

/*
 * ---------------------------------------------------------------------------
 * Running these tests
 * ---------------------------------------------------------------------------
 * Vitest is not installed yet. To enable:
 *   npm i -D vitest
 * Add to package.json scripts:  "test": "vitest"
 * (Vite already provides config; Vitest reads vite.config.ts automatically.)
 * Then:  npm test
 */
