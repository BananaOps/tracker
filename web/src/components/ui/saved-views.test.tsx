import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_VIEWS, type SavedView } from '@/lib/saved-views'
import { SavedViews } from './saved-views'

const views: SavedView[] = [...DEFAULT_VIEWS, { id: 'v1', label: 'Checkout', q: 'service:checkout' }]

describe('SavedViews', () => {
  it('lists the views with their counts and marks the current one', () => {
    render(<SavedViews views={views} currentId="impact" counts={{ all: 12, impact: 3 }} onSelect={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Saved views' })
    const impact = within(nav).getByRole('button', { name: 'Impact (3)' })
    expect(impact).toHaveAttribute('aria-current', 'page')
    expect(impact).toHaveClass('border-ink')
    expect(within(nav).getByRole('button', { name: 'All work (12)' })).not.toHaveAttribute('aria-current')
  })

  it('selects a view', async () => {
    const onSelect = vi.fn()
    render(<SavedViews views={views} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Production deploys' }))
    expect(onSelect).toHaveBeenCalledWith(DEFAULT_VIEWS[2])
  })

  it('saves the current query under a name', async () => {
    const onSave = vi.fn()
    render(<SavedViews views={views} onSelect={() => {}} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
    const name = screen.getByRole('textbox', { name: 'View name' })
    expect(name).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.type(name, 'My deploys{Enter}')
    expect(onSave).toHaveBeenCalledWith('My deploys')
    expect(screen.getByRole('button', { name: 'Save view' })).toBeInTheDocument()
  })

  it('deletes only the views of the user', async () => {
    const onDelete = vi.fn()
    render(<SavedViews views={views} onSelect={() => {}} onDelete={onDelete} />)
    expect(screen.queryByRole('button', { name: 'Delete view Impact' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Delete view Checkout' }))
    expect(onDelete).toHaveBeenCalledWith('v1')
  })
})
