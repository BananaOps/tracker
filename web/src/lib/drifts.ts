import type { Event } from '@/types/api'

const RESOLVED = ['failed', 'done', 'closed', 'close']

/** A drift still to handle: not done, closed or failed. */
export function isActiveDrift(drift: Event): boolean {
  return !RESOLVED.includes(String(drift.attributes.status || '').toLowerCase())
}
