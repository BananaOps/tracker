import { describe, expect, it } from 'vitest'
import { catalogFromAPI, convertEventFromAPI, type ApiEvent } from './apiConverters'
import { CatalogType, Environment, Priority, SLALevel, Status, type Catalog } from '../types/api'

// A partial event as the API returns it; the converter only reads the enums.
const apiEvent = (attributes: Record<string, unknown>) => ({
  title: 't',
  attributes: { service: 'svc', ...attributes },
  links: {},
  metadata: { id: '1' },
}) as ApiEvent

describe('convertEventFromAPI', () => {
  it('maps the enum numbers of the API to their names', () => {
    const event = convertEventFromAPI(apiEvent({ priority: 2, status: 3, environment: 7 }))
    expect(event.attributes.priority).toBe(Priority.P2)
    expect(event.attributes.status).toBe(Status.SUCCESS)
    expect(event.attributes.environment).toBe(Environment.PRODUCTION)
  })

  it('normalizes enum names to the lower case of the web enums', () => {
    const event = convertEventFromAPI(apiEvent({ priority: 'P1', status: 'FAILURE', environment: 'TNR' }))
    expect(event.attributes.priority).toBe(Priority.P1)
    expect(event.attributes.status).toBe(Status.FAILURE)
    expect(event.attributes.environment).toBe(Environment.TNR)
  })

  it('keeps the other fields', () => {
    const event = convertEventFromAPI(apiEvent({ priority: 1, status: 1 }))
    expect(event.title).toBe('t')
    expect(event.attributes.service).toBe('svc')
    expect(event.metadata?.id).toBe('1')
  })
})

describe('catalogFromAPI', () => {
  // Shape returned by GET /api/v1alpha1/catalog: the SLA wrapper types
  // (DoubleValue, UInt32Value) arrive as plain numbers.
  const apiCatalog = {
    name: 'sla-svc',
    type: CatalogType.PROJECT,
    owner: 't',
    version: '1',
    sla: { level: SLALevel.HIGH, uptimePercentage: 99.9, responseTimeMs: 200, description: '' },
    usedDeliverables: [{ name: 'x', type: CatalogType.PACKAGE, versionUsed: '1.0', description: '' }],
  } as Catalog

  it('keeps the SLA uptime and response time', () => {
    const catalog = catalogFromAPI(apiCatalog)
    expect(catalog.sla?.uptimePercentage).toBe(99.9)
    expect(catalog.sla?.responseTimeMs).toBe(200)
  })

  it('keeps the used deliverables and defaults the lists', () => {
    const catalog = catalogFromAPI(apiCatalog)
    expect(catalog.usedDeliverables?.[0].versionUsed).toBe('1.0')
    expect(catalog.communicationChannels).toEqual([])
    expect(catalog.dashboardLinks).toEqual([])
    expect(catalog.infrastructureResources).toEqual([])
  })
})
