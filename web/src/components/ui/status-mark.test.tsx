import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DS_STATUSES, type DsStatus } from '@/lib/status'
import { ImpactMark } from './impact-mark'
import { StatusMark } from './status-mark'

describe('StatusMark', () => {
  it.each([
    ['failed', 'bg-failed-wash'],
    ['warning', 'bg-warning-wash'],
    ['running', 'bg-signature'],
    ['done', 'border-tag-line'],
    ['open', 'border-dashed'],
  ] as [DsStatus, string][])('shows %s as a labelled tag', (status, cls) => {
    render(<StatusMark status={status} />)
    const tag = screen.getByText(status).parentElement!
    expect(tag).toHaveClass(cls, 'h-[22px]', 'font-mono')
    expect(tag.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(tag.querySelector('svg')).toHaveAttribute('width', '12')
  })

  it('gives each glyph an inner sign: ✕, !, ✓ or the open arc', () => {
    const paths: Record<string, number> = {}
    for (const status of DS_STATUSES) {
      const { container, unmount } = render(<StatusMark status={status} />)
      paths[status] = container.querySelectorAll('path, circle, rect').length
      unmount()
    }
    expect(paths).toEqual({ failed: 2, warning: 2, running: 2, done: 2, open: 1 })
  })

  it('renders the glyph alone with the label as accessible name', () => {
    render(<StatusMark status="failed" label={false} />)
    const glyph = screen.getByRole('img', { name: 'failed' })
    expect(glyph).toHaveClass('text-failed')
    expect(glyph.querySelector('svg')).toHaveAttribute('width', '14')
  })

  it('stops the running rotation when motion is reduced', () => {
    const { container } = render(<StatusMark status="running" />)
    expect(container.querySelector('svg')).toHaveClass('motion-safe:animate-status-spin')
  })

  it('accepts a custom label and falls back to done for an unknown status', () => {
    render(<StatusMark status={'bogus' as DsStatus} text="3 of 5" />)
    expect(screen.getByText('3 of 5').parentElement).toHaveClass('border-tag-line')
  })
})

describe('ImpactMark', () => {
  it('compact: an icon named Users impacted', () => {
    render(<ImpactMark compact />)
    const mark = screen.getByRole('img', { name: 'Users impacted' })
    expect(mark).toHaveAttribute('title', 'Users impacted')
    expect(mark).toHaveClass('bg-impact-wash', 'text-impact', 'w-[22px]')
  })

  it('labelled: shows its text', () => {
    render(<ImpactMark text="users impacted" />)
    expect(screen.getByText('users impacted').parentElement).toHaveAttribute('title', 'Users impacted')
  })
})
