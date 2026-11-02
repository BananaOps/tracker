import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimeRuler } from './time-ruler'

describe('TimeRuler', () => {
  it('describes its axis to assistive tech', () => {
    render(<TimeRuler startHour={12} endHour={18} now="15:31" />)
    expect(screen.getByRole('img', { name: 'Time axis from 12:00 to 18:00, now 15:31' })).toBeInTheDocument()
  })

  it('draws one tick per hour and labels all but the last', () => {
    const { container } = render(<TimeRuler startHour={8} endHour={12} />)
    expect(container.querySelectorAll('line.stroke-ink')).toHaveLength(5)
    const labels = [...container.querySelectorAll('text')].map((t) => t.textContent)
    expect(labels).toEqual(['08:00', '09:00', '10:00', '11:00'])
  })

  it('places marks and the now needle on the time scale', () => {
    const { container } = render(
      <TimeRuler startHour={12} endHour={18} width={600} now="15:30" marks={[{ at: '13:00', status: 'failed' }, { at: 16.5, status: 'open' }]} />,
    )
    const marks = container.querySelectorAll('circle')
    expect(marks[0]).toHaveAttribute('cx', '100')
    expect(marks[0]).toHaveClass('fill-failed')
    expect(marks[1]).toHaveAttribute('cx', '450')
    expect(container.querySelector('line.stroke-needle')).toHaveAttribute('x1', '350')
    expect(screen.getByText('now 15:30')).toHaveClass('fill-on-signature')
  })

  it('accepts from and to as aliases', () => {
    render(<TimeRuler from={0} to={24} />)
    expect(screen.getByRole('img', { name: 'Time axis from 0:00 to 24:00' })).toBeInTheDocument()
  })

  it('keeps the now chip inside the drawing at the right edge', () => {
    const { container } = render(<TimeRuler startHour={12} endHour={18} width={600} now="17:59" />)
    const chip = container.querySelector('rect.fill-signature')!
    expect(Number(chip.getAttribute('x')) + Number(chip.getAttribute('width'))).toBeLessThanOrEqual(600)
  })
})
