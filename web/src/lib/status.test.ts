import { describe, expect, it } from 'vitest'
import { EventType, Status } from '@/types/api'
import { toDsStatus, toTypeIcon } from './status'

describe('toDsStatus', () => {
  it.each([
    [Status.FAILURE, 'failed'],
    [Status.ERROR, 'failed'],
    [Status.WARNING, 'warning'],
    [Status.START, 'running'],
    [Status.IN_PROGRESS, 'running'],
    [Status.SUCCESS, 'done'],
    [Status.DONE, 'done'],
    [Status.CLOSE, 'done'],
  ])('maps %s to %s', (api, ds) => {
    expect(toDsStatus(api)).toBe(ds)
  })

  it.each([
    Status.OPEN,
    Status.PLANNED,
    Status.WAITING_APPROVAL,
    Status.SNAPSHOT,
    Status.USER_UPDATE,
    Status.RECOMMENDATION,
    'recommandation', // proto spelling
    'STATUS_UNSPECIFIED',
    'something-new',
  ])('maps %s to open', (api) => {
    expect(toDsStatus(api)).toBe('open')
  })

  it('treats a missing status as open', () => {
    expect(toDsStatus(undefined)).toBe('open')
    expect(toDsStatus(null)).toBe('open')
    expect(toDsStatus('')).toBe('open')
  })

  it('ignores case', () => {
    expect(toDsStatus('FAILURE')).toBe('failed')
  })
})

describe('toTypeIcon', () => {
  it.each([
    [EventType.DEPLOYMENT, 'deployment'],
    [EventType.OPERATION, 'operation'],
    [EventType.DRIFT, 'drifts'],
    [EventType.INCIDENT, 'incident'],
    [EventType.RPA_USAGE, 'rpa'],
  ])('maps %s to %s', (type, icon) => {
    expect(toTypeIcon(type)).toBe(icon)
  })

  it('falls back to operation for an unknown or missing type', () => {
    expect(toTypeIcon('TYPE_UNSPECIFIED')).toBe('operation')
    expect(toTypeIcon(undefined)).toBe('operation')
  })
})
