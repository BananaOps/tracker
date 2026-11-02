import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar, type NavGroup } from './sidebar'

const groups: NavGroup[] = [
  {
    label: 'operations',
    items: [
      { name: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
      { name: 'Timeline', icon: 'timeline', to: '/events/timeline' },
    ],
  },
  { label: 'infrastructure', items: [{ name: 'Locks', icon: 'locks', to: '/locks', count: 3 }] },
]

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <Sidebar groups={groups} active="Timeline" {...props} />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('is a main navigation with group labels and router links', () => {
    renderSidebar()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByText('operations')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Tracker home' })).toHaveAttribute('href', '/')
  })

  it('highlights the active page in signature', () => {
    renderSidebar()
    const active = screen.getByRole('link', { name: 'Timeline' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveClass('bg-signature', 'text-on-signature')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('shows counts', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Locks (3)' })).toBeInTheDocument()
  })

  it('collapses into a 60 px rail where names become accessible names and tooltips', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('operations')).toBeNull()
    expect(screen.getByRole('group', { name: 'operations' })).toBeInTheDocument()
    const locks = screen.getByRole('link', { name: 'Locks (3)' })
    expect(locks).toHaveAttribute('title', 'Locks (3)')
    expect(screen.getByRole('complementary')).toHaveClass('w-[60px]')
  })

  it('offers a toggle button', async () => {
    const onToggle = vi.fn()
    const { rerender } = renderSidebar({ onToggle })
    await userEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(onToggle).toHaveBeenCalled()
    rerender(
      <MemoryRouter>
        <Sidebar groups={groups} collapsed onToggle={onToggle} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument()
  })
})
