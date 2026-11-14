import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MetricStrip } from './metric-strip'
import { SegmentedControl } from './segmented-control'

describe('SegmentedControl', () => {
  it('marks the active option with aria-pressed and switches on click', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Period" options={['24h', '7d', '30d']} defaultValue="7d" onChange={onChange} />)
    const group = screen.getByRole('group', { name: 'Period' })
    expect(within(group).getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(group).getByRole('button', { name: '30d' }))
    expect(onChange).toHaveBeenCalledWith('30d')
    expect(within(group).getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('follows the value when controlled', async () => {
    render(<SegmentedControl options={['comfortable', 'compact']} value="compact" onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'comfortable' }))
    expect(screen.getByRole('button', { name: 'compact' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MetricStrip', () => {
  const items = [
    { label: 'events / 24h', value: '236' },
    { label: 'failed', value: '2', tone: 'failed' as const, sub: '3 of 5 finished' },
    { label: 'users impacted', value: '1', tone: 'impact' as const },
    { label: 'failure rate', value: '4.1%', delta: '−3.2 pts vs prev.', trend: 'better' as const },
    { label: 'recovery', value: '42 min', delta: '+7 min vs prev.', trend: 'worse' as const },
  ]

  it('is a named group of metrics', () => {
    render(<MetricStrip label="Last 24 hours" items={items} />)
    const group = screen.getByRole('group', { name: 'Last 24 hours' })
    expect(within(group).getByText('236')).toHaveClass('text-metric')
    expect(within(group).getByText('3 of 5 finished')).toBeInTheDocument()
  })

  it('colours a value only through its tone', () => {
    render(<MetricStrip items={items} />)
    expect(screen.getByText('2')).toHaveClass('text-failed')
    expect(screen.getByText('1')).toHaveClass('text-impact')
    expect(screen.getByText('236')).not.toHaveClass('text-failed', 'text-impact')
  })

  it('colours only a worse trend, with a warning glyph', () => {
    render(<MetricStrip items={items} />)
    const better = screen.getByText('−3.2 pts vs prev.').parentElement!
    const worse = screen.getByText('+7 min vs prev.').parentElement!
    expect(better).toHaveClass('text-muted')
    expect(better.querySelector('svg')).toBeNull()
    expect(worse).toHaveClass('text-warning')
    expect(worse.querySelector('svg')).not.toBeNull()
    expect(worse).toHaveTextContent('worse than the previous period')
  })
})
