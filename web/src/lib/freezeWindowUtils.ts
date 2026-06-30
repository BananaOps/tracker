import type {
  FreezeWindow,
  FreezeChangeEvent,
  FreezeImpactResult,
  ConflictSeverity,
} from '../types/freezeWindow'

// ─── Overlap detection ────────────────────────────────────────────────────────

/**
 * Returns true if event and freeze window share any time overlap.
 * Uses half-open interval: [start, end)
 */
export function detectOverlap(
  event: FreezeChangeEvent,
  freeze: FreezeWindow,
): boolean {
  const eStart = new Date(event.startsAt).getTime()
  const eEnd = new Date(event.endsAt).getTime()
  const fStart = new Date(freeze.startsAt).getTime()
  const fEnd = new Date(freeze.endsAt).getTime()
  return eStart < fEnd && eEnd > fStart
}

// ─── Active check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the freeze window is currently active at the given instant.
 * A window with active === false is always considered inactive.
 */
export function isWindowActive(now: Date, freeze: FreezeWindow): boolean {
  if (freeze.active === false) return false
  const ts = now.getTime()
  return ts >= new Date(freeze.startsAt).getTime() && ts < new Date(freeze.endsAt).getTime()
}

// ─── Scope matching ───────────────────────────────────────────────────────────

/**
 * Returns true if a freeze window's scope applies to the given event.
 *
 * Scope rules:
 * - global   → always matches
 * - environment → matches if event.environment is in scopeIds
 * - service  → matches if event.serviceId is in scopeIds
 * - domain   → matches if event.domainId is in scopeIds
 */
function freezeMatchesEvent(
  event: FreezeChangeEvent,
  freeze: FreezeWindow,
): boolean {
  switch (freeze.scopeType) {
    case 'global':
      return true
    case 'environment':
      return !!(event.environment && freeze.scopeIds?.includes(event.environment))
    case 'service':
      return !!(event.serviceId && freeze.scopeIds?.includes(event.serviceId))
    case 'domain':
      return !!(event.domainId && freeze.scopeIds?.includes(event.domainId))
  }
}

// ─── Impact resolution ────────────────────────────────────────────────────────

/**
 * Resolves the effective freeze impact for a given event.
 *
 * Priority: hard > soft.
 * Only considers windows with active !== false.
 */
export function resolveFreezeImpact(
  event: FreezeChangeEvent,
  freezeWindows: FreezeWindow[],
): FreezeImpactResult {
  const matched = freezeWindows.filter(
    fw =>
      fw.active !== false &&
      detectOverlap(event, fw) &&
      freezeMatchesEvent(event, fw),
  )

  if (matched.length === 0) {
    return {
      impacted: false,
      severity: 'none',
      matchedFreezeWindows: [],
      reason: '',
    }
  }

  const hasHard = matched.some(fw => fw.type === 'hard')
  const severity: ConflictSeverity = hasHard ? 'blocked' : 'warning'

  // Pick the most constraining window for the reason string
  const topWindow = hasHard
    ? matched.find(fw => fw.type === 'hard')!
    : matched[0]

  const reason = hasHard
    ? `Blocked by hard freeze: "${topWindow.title}"`
    : `Warning: overlaps soft freeze "${topWindow.title}"`

  return {
    impacted: true,
    severity,
    matchedFreezeWindows: matched,
    reason,
  }
}

// ─── Visual palette ───────────────────────────────────────────────────────────

export interface FreezePalette {
  bg: string
  bgOverlay: string
  border: string
  text: string
  badge: string
  label: string
}

/**
 * Returns visual tokens for a freeze window type.
 * Designed to be visible but non-intrusive on dark and light backgrounds.
 */
export function getFreezePalette(type: FreezeWindow['type']): FreezePalette {
  if (type === 'hard') {
    return {
      bg: 'rgba(239, 68, 68, 0.06)',       // very faint red fill
      bgOverlay: 'rgba(239, 68, 68, 0.10)',
      border: 'rgba(239, 68, 68, 0.35)',
      text: '#ef4444',
      badge: 'rgba(239, 68, 68, 0.12)',
      label: 'Hard Freeze',
    }
  }
  return {
    bg: 'rgba(245, 158, 11, 0.06)',         // very faint amber fill
    bgOverlay: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#f59e0b',
    badge: 'rgba(245, 158, 11, 0.12)',
    label: 'Soft Freeze',
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns all freeze windows that overlap the given calendar day.
 */
export function getFreezeWindowsForDay(
  day: Date,
  freezeWindows: FreezeWindow[],
): FreezeWindow[] {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)

  return freezeWindows.filter(fw => {
    if (fw.active === false) return false
    const fStart = new Date(fw.startsAt).getTime()
    const fEnd = new Date(fw.endsAt).getTime()
    return dayStart.getTime() < fEnd && dayEnd.getTime() >= fStart
  })
}
