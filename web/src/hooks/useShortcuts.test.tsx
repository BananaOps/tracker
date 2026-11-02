import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useShortcuts } from './useShortcuts'

function Shell({ onPalette }: { onPalette: () => void }) {
  useShortcuts({ onPalette })
  const { pathname } = useLocation()
  return (
    <>
      <output data-testid="path">{pathname}</output>
      <input aria-label="page filter" data-page-filter="" />
      <textarea aria-label="notes" />
    </>
  )
}

function renderShell(onPalette = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="*" element={<Shell onPalette={onPalette} />} />
      </Routes>
    </MemoryRouter>,
  )
  return onPalette
}

describe('useShortcuts', () => {
  it('opens the palette with Ctrl+K, even from a field', async () => {
    const onPalette = renderShell()
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.click(screen.getByRole('textbox', { name: 'notes' }))
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(onPalette).toHaveBeenCalledTimes(2)
  })

  it('focuses the page filter with /', async () => {
    renderShell()
    await userEvent.keyboard('/')
    expect(screen.getByRole('textbox', { name: 'page filter' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'page filter' })).toHaveValue('')
  })

  it('navigates with G then T or S', async () => {
    renderShell()
    await userEvent.keyboard('gt')
    expect(screen.getByTestId('path')).toHaveTextContent('/events/timeline')
    await userEvent.keyboard('gs')
    expect(screen.getByTestId('path')).toHaveTextContent('/events/streamline')
  })

  it('ignores plain keys while typing', async () => {
    renderShell()
    await userEvent.click(screen.getByRole('textbox', { name: 'notes' }))
    await userEvent.keyboard('gt/')
    expect(screen.getByTestId('path')).toHaveTextContent('/dashboard')
    expect(screen.getByRole('textbox', { name: 'notes' })).toHaveValue('gt/')
  })
})
