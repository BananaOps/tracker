import { describe, expect, it } from 'vitest'
import { convertEventFromAPI } from './apiConverters'
import { Environment, Priority, Status } from '../types/api'

const apiEvent = (attributes: Record<string, unknown>) => ({
  title: 't',
  attributes: { service: 'svc', ...attributes },
  links: {},
  metadata: { id: '1' },
})

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
