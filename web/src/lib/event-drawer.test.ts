import { describe, expect, it } from 'vitest'
import { ChangeType, Environment, EventType, Priority, Status, type Event } from '@/types/api'
import { pullRequestLabel, toDrawerEvent, toHistory } from './event-drawer'

const local = (d: number, h: number, m: number, s = 0) => new Date(2026, 3, d, h, m, s).toISOString()

const event: Event = {
  title: 'Deploy monitoring v2.5.5 → mco',
  attributes: {
    message: 'Rolls out the new alert rules.',
    source: 'github-actions',
    type: EventType.DEPLOYMENT,
    priority: Priority.P3,
    service: 'monitoring',
    status: Status.FAILURE,
    environment: Environment.MCO,
    impact: true,
    startDate: local(7, 15, 4, 12),
    owner: 'infra-team',
    stakeHolders: ['sre', 'payments'],
    notifications: ['#ops'],
  },
  links: { pullRequestLink: 'https://github.com/org/repo/pull/1287', ticket: 'PAY-342' },
  metadata: { id: 'e1', createdAt: local(7, 15, 0) },
  changelog: [
    { timestamp: local(7, 15, 10), user: 'ci', changeType: ChangeType.STATUS_CHANGED, oldValue: 'in_progress', newValue: 'failure' },
    { timestamp: local(7, 15, 4), user: 'ci', changeType: ChangeType.CREATED },
    { timestamp: local(6, 18, 0), user: 'alice', changeType: ChangeType.COMMENTED, comment: 'planned' },
  ],
}

describe('toDrawerEvent', () => {
  it('maps the header facts', () => {
    const d = toDrawerEvent(event, { ticketUrl: (k) => `https://jira.example/browse/${k}` })
    expect(d).toMatchObject({
      status: 'failed',
      time: '15:04:12',
      title: 'Deploy monitoring v2.5.5 → mco',
      type: 'deployment',
      priority: 'P3',
      service: 'monitoring',
      environment: 'mco',
      owner: 'infra-team',
      stakeholders: ['sre', 'payments'],
      impact: true,
      summary: 'Rolls out the new alert rules.',
      pullRequest: { label: '#1287', href: 'https://github.com/org/repo/pull/1287' },
      ticket: { label: 'PAY-342', href: 'https://jira.example/browse/PAY-342' },
    })
  })

  it('lists secondary details', () => {
    const fields = toDrawerEvent(event).fields!
    expect(fields.map((f) => f[0])).toEqual(['source', 'start', 'notifications', 'id'])
    expect(fields[1][1]).toBe('07 apr 2026 15:04:12')
  })

  it('shows empty link slots and no impact when the event has none', () => {
    const d = toDrawerEvent({ ...event, links: undefined, attributes: { ...event.attributes, impact: undefined } })
    expect(d.pullRequest).toBeNull()
    expect(d.ticket).toBeNull()
    expect(d.impact).toBe(false)
  })
})

describe('toHistory', () => {
  it('sorts the changelog oldest first and words each change', () => {
    const history = toHistory(event.changelog, local(7, 15, 4))
    expect(history.map((h) => h.text)).toEqual(['Comment by alice: planned', 'Created by ci', 'Status in_progress → failure by ci'])
    expect(history.map((h) => h.status)).toEqual(['done', 'open', 'failed'])
  })

  it('shows the date instead of the time for another day', () => {
    const history = toHistory(event.changelog, local(7, 15, 4))
    expect(history[0].time).toBe('06 apr')
    expect(history[1].time).toBe('15:04')
  })
})

describe('pullRequestLabel', () => {
  it('reads GitHub, GitLab and Bitbucket numbers', () => {
    expect(pullRequestLabel('https://github.com/o/r/pull/12')).toBe('#12')
    expect(pullRequestLabel('https://gitlab.com/o/r/-/merge_requests/7')).toBe('#7')
    expect(pullRequestLabel('https://bitbucket.org/o/r/pull-requests/3')).toBe('#3')
    expect(pullRequestLabel('https://example.com/x')).toBe('link')
  })
})
