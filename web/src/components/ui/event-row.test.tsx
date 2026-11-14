import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EventList, EventRow, type EventRowData } from './event-row'

const events: EventRowData[] = [
  { id: 'a', time: '15:04', status: 'failed', title: 'Deploy monitoring v2.5.5 → mco', impact: true, meta: ['deployment', 'mco', 'P3', 'infra-team'] },
  { id: 'b', time: '14:20', status: 'running', title: 'Rotate certificates', meta: ['operation', 'production'] },
  { id: 'c', time: '13:02', status: 'done', title: 'Terraform drift — firewall', meta: 'drift · production' },
]

function ControlledList({ onSelect }: { onSelect?: (e: EventRowData) => void }) {
  const [selected, setSelected] = useState<string>()
  return (
    <EventList
      label="Activity"
      events={events}
      selectedId={selected}
      onSelect={(e) => {
        setSelected(e.id)
        onSelect?.(e)
      }}
    />
  )
}

describe('EventRow', () => {
  it('shows time, title, joined metadata, impact and status', () => {
    render(<EventRow {...events[0]} />)
    const row = screen.getByRole('option')
    expect(row).toHaveTextContent('15:04')
    expect(row).toHaveTextContent('deployment · mco · P3 · infra-team')
    expect(screen.getByRole('img', { name: 'Users impacted' })).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(row).toHaveAttribute('aria-selected', 'false')
  })

  it('has a comfortable and a compact density', () => {
    const { rerender } = render(<EventRow {...events[1]} />)
    expect(screen.getByRole('option')).toHaveClass('py-row-pad-comfy')
    rerender(<EventRow {...events[1]} density="compact" />)
    expect(screen.getByRole('option')).toHaveClass('py-row-pad-compact')
  })

  it('takes the selection colour when selected', () => {
    render(<EventRow {...events[1]} selected />)
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option')).toHaveClass('bg-signature-wash')
  })
})

describe('EventList', () => {
  it('is a named listbox with a single tab stop', () => {
    render(<EventList label="Activity" events={events} />)
    expect(screen.getByRole('listbox', { name: 'Activity' })).toBeInTheDocument()
    const tabbable = screen.getAllByRole('option').filter((o) => o.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
  })

  it('selects on click and on Enter', async () => {
    const onSelect = vi.fn()
    render(<ControlledList onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Rotate certificates'))
    expect(onSelect).toHaveBeenLastCalledWith(events[1])
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')

    screen.getAllByRole('option')[2].focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith(events[2])
  })

  it('moves focus and selection with the arrow keys, Home and End', async () => {
    const onSelect = vi.fn()
    render(<ControlledList onSelect={onSelect} />)
    const options = screen.getAllByRole('option')
    await userEvent.tab()
    expect(options[0]).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(options[1]).toHaveFocus()
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[1].tabIndex).toBe(0)

    await userEvent.keyboard('{End}')
    expect(options[2]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(options[2]).toHaveFocus()

    await userEvent.keyboard('{Home}')
    expect(options[0]).toHaveFocus()
    expect(onSelect).toHaveBeenLastCalledWith(events[0])
  })
})
