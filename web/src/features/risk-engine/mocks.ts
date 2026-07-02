/**
 * Risk Engine — mock data for local development, stories and tests.
 *
 * These are deterministic fixtures. Replace with real API data once the
 * backend risk endpoints exist (see TODOs in `index.ts`).
 */

import type { ChangeEvent, RiskAssessment, RiskEngineContext, ServiceRiskProfile } from './types'
import { computeRiskScore } from './scoring'

export const mockServiceProfiles: ServiceRiskProfile[] = [
  {
    serviceId: 'svc-payments',
    criticality: 'tier1',
    ownerDefined: true,
    productionTrafficLevel: 'high',
    dependencyCount: 12,
    recentIncidentCount: 4,
    rollbackDifficulty: 'hard',
  },
  {
    serviceId: 'svc-catalog',
    criticality: 'tier2',
    ownerDefined: true,
    productionTrafficLevel: 'medium',
    dependencyCount: 5,
    recentIncidentCount: 1,
    rollbackDifficulty: 'medium',
  },
  {
    serviceId: 'svc-notifications',
    criticality: 'tier3',
    ownerDefined: false,
    productionTrafficLevel: 'low',
    dependencyCount: 2,
    recentIncidentCount: 0,
    rollbackDifficulty: 'easy',
  },
]

export const mockChangeEvents: ChangeEvent[] = [
  {
    id: 'evt-1',
    title: 'Payments DB schema migration',
    type: 'database',
    environment: 'prod',
    serviceId: 'svc-payments',
    startsAt: '2026-07-04T23:30:00.000Z', // Saturday night, off-hours
    endsAt: '2026-07-05T01:00:00.000Z',
    impact: 'high',
    priority: 'critical',
    hasRollbackPlan: false,
    hasRunbook: false,
    initiatedBy: 'alice',
  },
  {
    id: 'evt-2',
    title: 'Catalog service deploy v2.3.1',
    type: 'deploy',
    environment: 'prod',
    serviceId: 'svc-catalog',
    startsAt: '2026-07-02T10:00:00.000Z', // Thursday, business hours
    endsAt: '2026-07-02T10:30:00.000Z',
    impact: 'medium',
    priority: 'medium',
    hasRollbackPlan: true,
    hasRunbook: true,
    initiatedBy: 'bob',
  },
  {
    id: 'evt-3',
    title: 'Notifications config tweak',
    type: 'config',
    environment: 'staging',
    serviceId: 'svc-notifications',
    startsAt: '2026-07-01T14:00:00.000Z',
    endsAt: '2026-07-01T14:15:00.000Z',
    impact: 'low',
    priority: 'low',
    hasRollbackPlan: true,
    hasRunbook: false,
    initiatedBy: 'carol',
  },
  {
    id: 'evt-4',
    title: 'Unknown service network change',
    type: 'network',
    environment: 'prod',
    // no serviceId => engine falls back to prudent defaults
    startsAt: '2026-07-03T03:00:00.000Z',
    endsAt: '2026-07-03T04:00:00.000Z',
    initiatedBy: 'dave',
  },
]

export const mockRiskContext: RiskEngineContext = {
  serviceProfiles: mockServiceProfiles,
  activeFreezeWindows: [],
  currentTime: '2026-07-02T12:00:00.000Z',
}

/** Convenience helper: compute assessments for all mock events. */
export function getMockAssessments(): Array<{ event: ChangeEvent; assessment: RiskAssessment }> {
  return mockChangeEvents.map((event) => ({
    event,
    assessment: computeRiskScore(event, mockRiskContext),
  }))
}
