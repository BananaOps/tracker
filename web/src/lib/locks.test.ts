import { describe, expect, it } from 'vitest'
import { findServiceLock } from './locks'
import type { Lock } from './api'

const locks: Lock[] = [
  { id: 'a', service: 'api', environment: 'production', resource: 'deployment', who: 'ci' },
  { id: 'b', service: 'api', environment: 'staging', resource: 'deployment', who: 'ci' },
]

describe('findServiceLock', () => {
  it('finds the lock of the service in the environment', () => {
    expect(findServiceLock(locks, 'api', 'staging')?.id).toBe('b')
  })

  it('finds nothing for another service or environment', () => {
    expect(findServiceLock(locks, 'web', 'production')).toBeUndefined()
    expect(findServiceLock(locks, 'api', 'uat')).toBeUndefined()
  })

  it('finds nothing without a service, an environment or locks', () => {
    expect(findServiceLock(locks, '', 'production')).toBeUndefined()
    expect(findServiceLock(locks, 'api', undefined)).toBeUndefined()
    expect(findServiceLock(undefined, 'api', 'production')).toBeUndefined()
  })
})
