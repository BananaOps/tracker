// ─── Enums ────────────────────────────────────────────────────────────────────

/** hard = strict block, soft = warning only */
export type FreezeType = 'hard' | 'soft'

/** Determines which events are affected by a freeze window */
export type FreezeScope = 'global' | 'environment' | 'service' | 'domain'

/** Result severity when an event overlaps freeze windows */
export type ConflictSeverity = 'none' | 'warning' | 'blocked'

// ─── Core models ──────────────────────────────────────────────────────────────

export interface FreezeWindow {
  id: string
  title: string
  description?: string
  type: FreezeType
  scopeType: FreezeScope
  /** Concrete scope values: env names, service ids, domain ids — empty means all */
  scopeIds?: string[]
  startsAt: string  // ISO 8601
  endsAt: string    // ISO 8601
  timezone?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  /** false = disabled (soft-deleted without removal) */
  active?: boolean
}

/** Minimal event shape for freeze conflict resolution */
export interface FreezeChangeEvent {
  id: string
  title: string
  serviceId?: string
  domainId?: string
  environment?: string
  startsAt: string
  endsAt: string
  status?: string
}

// ─── Resolution result ────────────────────────────────────────────────────────

export interface FreezeImpactResult {
  impacted: boolean
  severity: ConflictSeverity
  matchedFreezeWindows: FreezeWindow[]
  reason: string
}

// ─── Form model (used by create/edit drawer) ──────────────────────────────────

export type FreezeWindowDraft = Omit<FreezeWindow, 'id' | 'createdAt' | 'updatedAt'>
