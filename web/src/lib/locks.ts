import type { Lock } from './api'

// The lock of a service in an environment, as shown for an event: the event
// page and the event modal both use it.
export function findServiceLock(locks: Lock[] | undefined, service?: string, environment?: string): Lock | undefined {
  if (!service || !environment) return undefined
  return locks?.find((l) => l.service === service && l.environment === environment)
}
