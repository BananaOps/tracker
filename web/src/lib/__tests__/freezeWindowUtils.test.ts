/**
 * Unit tests for freezeWindowUtils.
 * Run with: npx tsx src/lib/__tests__/freezeWindowUtils.test.ts
 *
 * TODO: wire into vitest once test runner is configured.
 */

import {
  detectOverlap,
  isWindowActive,
  resolveFreezeImpact,
  getFreezeWindowsForDay,
} from '../freezeWindowUtils'
import type { FreezeWindow, FreezeChangeEvent } from '../../types/freezeWindow'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const hardGlobal: FreezeWindow = {
  id: 'fw-hard-global',
  title: 'Global hard freeze',
  type: 'hard',
  scopeType: 'global',
  startsAt: '2025-07-01T00:00:00Z',
  endsAt: '2025-07-03T00:00:00Z',
  active: true,
}

const softEnv: FreezeWindow = {
  id: 'fw-soft-env',
  title: 'Production soft freeze',
  type: 'soft',
  scopeType: 'environment',
  scopeIds: ['production'],
  startsAt: '2025-07-05T00:00:00Z',
  endsAt: '2025-07-07T00:00:00Z',
  active: true,
}

const hardService: FreezeWindow = {
  id: 'fw-hard-service',
  title: 'Payment hard freeze',
  type: 'hard',
  scopeType: 'service',
  scopeIds: ['payment-service'],
  startsAt: '2025-07-10T00:00:00Z',
  endsAt: '2025-07-11T00:00:00Z',
  active: true,
}

const inactiveFreeze: FreezeWindow = {
  ...hardGlobal,
  id: 'fw-inactive',
  active: false,
}

const eventInRange: FreezeChangeEvent = {
  id: 'ev-001',
  title: 'Deploy v2',
  startsAt: '2025-07-01T10:00:00Z',
  endsAt: '2025-07-01T12:00:00Z',
}

const eventOutOfRange: FreezeChangeEvent = {
  id: 'ev-002',
  title: 'Deploy v3',
  startsAt: '2025-07-04T10:00:00Z',
  endsAt: '2025-07-04T12:00:00Z',
}

// ─── detectOverlap ────────────────────────────────────────────────────────────

function testDetectOverlap() {
  // Overlapping events
  assert(detectOverlap(eventInRange, hardGlobal), 'event inside freeze should overlap')

  // Non-overlapping
  assert(!detectOverlap(eventOutOfRange, hardGlobal), 'event outside freeze should not overlap')

  // Event touching freeze start exactly (half-open [start, end))
  const touchStart: FreezeChangeEvent = { ...eventInRange, startsAt: '2025-07-03T00:00:00Z', endsAt: '2025-07-03T02:00:00Z' }
  assert(!detectOverlap(touchStart, hardGlobal), 'event starting at freeze end should NOT overlap (half-open)')

  // Event ending at freeze start
  const endAtStart: FreezeChangeEvent = { ...eventInRange, startsAt: '2025-06-30T22:00:00Z', endsAt: '2025-07-01T00:00:00Z' }
  assert(!detectOverlap(endAtStart, hardGlobal), 'event ending at freeze start should NOT overlap')

  console.log('  ✓ detectOverlap')
}

// ─── isWindowActive ───────────────────────────────────────────────────────────

function testIsWindowActive() {
  const duringFreeze = new Date('2025-07-01T06:00:00Z')
  const beforeFreeze = new Date('2025-06-30T23:59:00Z')
  const afterFreeze  = new Date('2025-07-03T01:00:00Z')

  assert(isWindowActive(duringFreeze, hardGlobal), 'should be active during freeze')
  assert(!isWindowActive(beforeFreeze, hardGlobal), 'should not be active before freeze')
  assert(!isWindowActive(afterFreeze, hardGlobal), 'should not be active after freeze')
  assert(!isWindowActive(duringFreeze, inactiveFreeze), 'inactive freeze should never be active')

  console.log('  ✓ isWindowActive')
}

// ─── resolveFreezeImpact ──────────────────────────────────────────────────────

function testResolveFreezeImpact() {
  // No conflict
  const noneResult = resolveFreezeImpact(eventOutOfRange, [hardGlobal, softEnv])
  assert(noneResult.severity === 'none', 'expected no impact')
  assert(!noneResult.impacted, 'impacted should be false')

  // Soft freeze match via scope
  const softEvent: FreezeChangeEvent = {
    id: 'ev-soft',
    title: 'Deploy prod',
    environment: 'production',
    startsAt: '2025-07-05T10:00:00Z',
    endsAt: '2025-07-05T12:00:00Z',
  }
  const softResult = resolveFreezeImpact(softEvent, [softEnv])
  assert(softResult.severity === 'warning', 'expected warning from soft freeze')
  assert(softResult.impacted, 'impacted should be true')

  // Environment mismatch — soft freeze should NOT apply
  const wrongEnvEvent: FreezeChangeEvent = { ...softEvent, environment: 'integration' }
  const missResult = resolveFreezeImpact(wrongEnvEvent, [softEnv])
  assert(missResult.severity === 'none', 'wrong environment should not trigger soft freeze')

  // Hard freeze overrides soft
  const hardAndSoft: FreezeWindow = { ...softEnv, type: 'hard', id: 'fw-hard-env', scopeIds: ['production'] }
  const hardResult = resolveFreezeImpact(softEvent, [softEnv, hardAndSoft])
  assert(hardResult.severity === 'blocked', 'hard freeze should result in blocked')
  assert(hardResult.matchedFreezeWindows.length === 2, 'both windows should be matched')
  assert(hardResult.reason.includes('hard freeze'), 'reason should mention hard freeze')

  // Inactive freeze is ignored
  const inactiveResult = resolveFreezeImpact(eventInRange, [inactiveFreeze])
  assert(inactiveResult.severity === 'none', 'inactive freeze should be ignored')

  // Service scope
  const serviceEvent: FreezeChangeEvent = {
    id: 'ev-svc',
    title: 'Payment hotfix',
    serviceId: 'payment-service',
    startsAt: '2025-07-10T06:00:00Z',
    endsAt: '2025-07-10T08:00:00Z',
  }
  const serviceResult = resolveFreezeImpact(serviceEvent, [hardService])
  assert(serviceResult.severity === 'blocked', 'service-scoped hard freeze should block')

  // Different service — no impact
  const otherServiceEvent: FreezeChangeEvent = { ...serviceEvent, serviceId: 'catalog-service' }
  const noMatch = resolveFreezeImpact(otherServiceEvent, [hardService])
  assert(noMatch.severity === 'none', 'different service should not be affected')

  console.log('  ✓ resolveFreezeImpact')
}

// ─── getFreezeWindowsForDay ───────────────────────────────────────────────────

function testGetFreezeWindowsForDay() {
  const day = new Date('2025-07-01T12:00:00Z')
  const result = getFreezeWindowsForDay(day, [hardGlobal, softEnv, inactiveFreeze])
  assert(result.length === 1, 'only active, overlapping freeze should be returned')
  assert(result[0].id === 'fw-hard-global', 'should return hardGlobal')

  const noFreeze = getFreezeWindowsForDay(new Date('2025-08-01T00:00:00Z'), [hardGlobal, softEnv])
  assert(noFreeze.length === 0, 'no freeze windows for out-of-range day')

  console.log('  ✓ getFreezeWindowsForDay')
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`)
}

console.log('freezeWindowUtils tests')
testDetectOverlap()
testIsWindowActive()
testResolveFreezeImpact()
testGetFreezeWindowsForDay()
console.log('All tests passed ✓')
