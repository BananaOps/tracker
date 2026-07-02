/**
 * Risk Engine — application integration layer.
 *
 * This is the ONLY file in the feature that knows about the app's API `Event`
 * shape (`@/types/api`). It maps that shape onto the engine's generic
 * `ChangeEvent`/`RiskEngineContext` so the core engine stays reusable.
 *
 * V1 is frontend-only: since there is no backend risk API yet, service
 * profiles are derived heuristically from the events the UI already has.
 * These heuristics are intentionally simple and documented — replace them
 * with real profiles once the backend endpoints land (see index.ts TODOs).
 */

import type { Event, Catalog } from '@/types/api'
import type {
  ChangeEvent,
  ChangeType,
  Environment as RiskEnvironment,
  PriorityLevel,
  RiskAssessment,
  RiskEngineContext,
  ServiceCriticality,
  ServiceRiskProfile,
} from './types'
import { computeRiskScore } from './scoring'

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase().trim()
}

/** App EventType -> engine ChangeType. Best-effort mapping (tunable). */
function mapChangeType(type: unknown): ChangeType {
  switch (norm(type)) {
    case 'deployment':
    case '1':
      return 'deploy'
    case 'drift':
    case '3':
      return 'config'
    case 'incident':
    case '4':
      return 'infrastructure'
    case 'operation':
    case '2':
    case 'rpa_usage':
    case '5':
      return 'maintenance'
    default:
      return 'deploy'
  }
}

/** App Environment -> engine Environment. Unknown defaults to `staging`. */
function mapEnvironment(env: unknown): RiskEnvironment {
  switch (norm(env)) {
    case 'production':
    case 'mco':
      return 'prod'
    case 'preproduction':
      return 'preprod'
    case 'uat':
    case 'recette':
      return 'staging'
    case 'development':
    case 'integration':
    case 'tnr':
      return 'dev'
    default:
      return 'staging'
  }
}

/** App Priority (p1..p5) -> engine PriorityLevel. */
function mapPriority(priority: unknown): PriorityLevel | undefined {
  switch (norm(priority)) {
    case 'p1':
    case '1':
      return 'critical'
    case 'p2':
    case '2':
      return 'high'
    case 'p3':
    case '3':
      return 'medium'
    case 'p4':
    case 'p5':
    case '4':
    case '5':
      return 'low'
    default:
      return undefined
  }
}

/** Stable identifier for an app event. */
export function getEventId(event: Event): string {
  return event.metadata?.id ?? event.title
}

/** Map an app `Event` onto the engine's `ChangeEvent`. */
export function toChangeEvent(event: Event): ChangeEvent {
  const attrs = event.attributes
  const startsAt = attrs.startDate ?? event.metadata?.createdAt ?? new Date().toISOString()
  const endsAt = attrs.endDate ?? startsAt
  return {
    id: getEventId(event),
    title: event.title,
    type: mapChangeType(attrs.type),
    environment: mapEnvironment(attrs.environment),
    serviceId: attrs.service || undefined,
    startsAt,
    endsAt,
    impact: attrs.impact ? 'high' : undefined,
    priority: mapPriority(attrs.priority),
    // The app does not track these yet -> left undefined (engine treats as
    // "unknown" with a prudent, reduced penalty rather than a hard gap).
    hasRollbackPlan: undefined,
    hasRunbook: undefined,
    initiatedBy: attrs.owner || attrs.source || undefined,
  }
}

/**
 * Map a service SLA level (from the catalog) to engine criticality.
 * The SLA is the source of truth for how critical a service is — NOT the
 * priority of an individual change.
 */
function mapSlaToCriticality(slaLevel: unknown): ServiceCriticality {
  switch (norm(slaLevel)) {
    case 'critical':
      return 'tier1'
    case 'high':
      return 'tier2'
    case 'medium':
      return 'tier3'
    case 'low':
      return 'tier3'
    default:
      // unspecified / missing SLA -> prudent moderate default.
      return 'tier2'
  }
}

/**
 * Derive per-service risk profiles for the current event list.
 *
 * Criticality comes from the service **SLA** in the catalog (source of truth).
 * Ownership and dependency count (blast radius) are also read from the catalog
 * when available. Recent incident count is derived from the loaded events
 * (no dedicated incident backend yet — heuristic V1).
 *
 * @param events   Events currently loaded in the view.
 * @param catalogs Catalog entries (with `sla`, `owner`, dependencies).
 */
export function buildRiskContext(events: Event[], catalogs: Catalog[] = []): RiskEngineContext {
  const catalogByName = new Map<string, Catalog>()
  for (const catalog of catalogs) {
    if (catalog?.name) catalogByName.set(catalog.name, catalog)
  }

  const byService = new Map<string, Event[]>()
  for (const event of events) {
    const service = event.attributes.service
    if (!service) continue
    const bucket = byService.get(service)
    if (bucket) bucket.push(event)
    else byService.set(service, [event])
  }

  // Include every catalog service and every service seen in events.
  const serviceIds = new Set<string>([...byService.keys(), ...catalogByName.keys()])

  const serviceProfiles: ServiceRiskProfile[] = []
  for (const serviceId of serviceIds) {
    const serviceEvents = byService.get(serviceId) ?? []
    const catalog = catalogByName.get(serviceId)

    const recentIncidentCount = serviceEvents.filter((e) => {
      const type = norm(e.attributes.type)
      const status = norm(e.attributes.status)
      return type === 'incident' || status === 'failure' || status === 'error'
    }).length

    const dependencyCount = catalog
      ? (catalog.dependenciesIn?.length ?? 0) + (catalog.dependenciesOut?.length ?? 0)
      : undefined

    serviceProfiles.push({
      serviceId,
      criticality: mapSlaToCriticality(catalog?.sla?.level),
      ownerDefined: Boolean(catalog?.owner) || serviceEvents.some((e) => Boolean(e.attributes.owner)),
      recentIncidentCount,
      dependencyCount,
    })
  }

  return { serviceProfiles }
}

/**
 * Assess an app event directly. When called for a single event without a
 * shared context, pass no context to fall back to prudent engine defaults;
 * in list/calendar views build a shared context once via `buildRiskContext`.
 */
export function assessAppEvent(event: Event, context?: RiskEngineContext): RiskAssessment {
  return computeRiskScore(toChangeEvent(event), context ?? { serviceProfiles: [] })
}
