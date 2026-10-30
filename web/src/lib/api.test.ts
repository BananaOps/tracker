import { afterEach, describe, expect, it, vi } from 'vitest'
import axiosInstance, { eventsApi } from './api'
import { Environment, Priority, Status } from '../types/api'

// An event as protojson writes it: proto enum names, P1 and TNR in upper case.
const rawEvent = {
  title: 'deploy',
  attributes: { service: 'api', type: 'deployment', priority: 'P1', status: 'start', environment: 'TNR' },
  links: {},
  metadata: { id: 'e1' },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('eventsApi', () => {
  it('returns lists with the web enums', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data: { events: [rawEvent], totalCount: 1 } })
    const { events } = await eventsApi.list()
    expect(events[0].attributes.priority).toBe(Priority.P1)
    expect(events[0].attributes.environment).toBe(Environment.TNR)
    expect(events[0].attributes.status).toBe(Status.START)
  })

  it('returns a single event with the web enums', async () => {
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data: { event: rawEvent } })
    const event = await eventsApi.get('e1')
    expect(event.attributes.priority).toBe(Priority.P1)
  })
})
