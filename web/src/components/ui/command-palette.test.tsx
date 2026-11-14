import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette, type PaletteGroup, type PaletteItem } from './command-palette'

const createEvent = vi.fn()

const groups: PaletteGroup[] = [
  {
    label: 'Jump to',
    items: [
      { label: 'Dashboard', icon: 'dashboard' },
      { label: 'Timeline', icon: 'timeline' },
    ],
  },
  { label: 'Create', items: [{ label: 'New event', icon: 'plus', kbd: 'E', run: createEvent }] },
  { label: 'Events', items: [{ id: 'e1', label: 'Deploy monitoring v2.5.5 → mco', icon: 'deployment', hint: 'failed · 15:04' }] },
]

function Harness({ onSelect }: { onSelect?: (item: PaletteItem) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <CommandPalette open={open} onOpenChange={setOpen} groups={groups} onSelect={onSelect} />
    </>
  )
}

describe('CommandPalette', () => {
  it('is a named dialog with a search field and groups in order', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Command palette' })
    expect(within(dialog).getByRole('combobox', { name: 'Search or run a command' })).toHaveFocus()
    const headings = [...dialog.querySelectorAll('[cmdk-group-heading]')].map((h) => h.textContent)
    expect(headings).toEqual(['Jump to', 'Create', 'Events'])
    expect(within(dialog).getByText('failed · 15:04')).toBeInTheDocument()
    expect(within(dialog).getByText('E').tagName).toBe('KBD')
  })

  it('filters on the label and the hint, and says when nothing matches', async () => {
    render(<Harness />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'failed')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.clear(input)
    await userEvent.type(input, 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No results for “zzz”')).toBeInTheDocument()
  })

  it('moves the active item with the arrows and runs it with Enter', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(options[2]).toHaveAttribute('aria-selected', 'true')
    expect(options[2]).toHaveClass('data-[selected=true]:bg-signature-wash')
    await userEvent.keyboard('{Enter}')
    expect(createEvent).toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'New event' }))
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('closes with Escape', async () => {
    render(<Harness />)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
