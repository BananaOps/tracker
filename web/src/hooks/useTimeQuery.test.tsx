import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TimeQueryProvider } from '../contexts/TimeQueryContext'
import { parseQuery } from '../lib/query'
import { useTimeQuery } from './useTimeQuery'

function View({ name }: { name: string }) {
  const { q, setQuery, period, setPeriod } = useTimeQuery()
  const location = useLocation()
  return (
    <div>
      <h1>{name}</h1>
      <output data-testid="q">{q}</output>
      <output data-testid="from">{period.from?.toISOString() ?? ''}</output>
      <output data-testid="search">{location.search}</output>
      <button onClick={() => setQuery(parseQuery('env:mco status:failed'))}>filter</button>
      <button onClick={() => setPeriod({ from: new Date('2026-04-01T00:00:00Z'), to: new Date('2026-04-08T00:00:00Z') })}>period</button>
      <Link to="/timeline">timeline</Link>
      <Link to="/streamline">streamline</Link>
      <Link to="/dashboard">dashboard</Link>
    </div>
  )
}

function renderAt(path: string) {
  return render(
    <TimeQueryProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/timeline" element={<View name="Timeline" />} />
          <Route path="/streamline" element={<View name="Streamline" />} />
          <Route path="/dashboard" element={<Link to="/streamline">back to streamline</Link>} />
        </Routes>
      </MemoryRouter>
    </TimeQueryProvider>,
  )
}

describe('useTimeQuery', () => {
  it('reads the query and the period from the URL', () => {
    renderAt('/timeline?q=impact%3Atrue&from=2026-04-01T00%3A00%3A00.000Z')
    expect(screen.getByTestId('q')).toHaveTextContent('impact:true')
    expect(screen.getByTestId('from')).toHaveTextContent('2026-04-01T00:00:00.000Z')
  })

  it('writes them to the URL', async () => {
    renderAt('/timeline')
    await userEvent.click(screen.getByRole('button', { name: 'filter' }))
    await userEvent.click(screen.getByRole('button', { name: 'period' }))
    const search = new URLSearchParams(screen.getByTestId('search').textContent!)
    expect(search.get('q')).toBe('env:mco status:failed')
    expect(search.get('from')).toBe('2026-04-01T00:00:00.000Z')
  })

  it('carries them to another time view, even through a page without filters', async () => {
    renderAt('/timeline')
    await userEvent.click(screen.getByRole('button', { name: 'filter' }))
    await userEvent.click(screen.getByRole('link', { name: 'streamline' }))
    expect(screen.getByRole('heading')).toHaveTextContent('Streamline')
    expect(screen.getByTestId('q')).toHaveTextContent('env:mco status:failed')

    await userEvent.click(screen.getByRole('link', { name: 'dashboard' }))
    await userEvent.click(screen.getByRole('link', { name: 'back to streamline' }))
    expect(screen.getByTestId('q')).toHaveTextContent('env:mco status:failed')
  })

  it('keeps an explicit query of the URL over the remembered one', async () => {
    renderAt('/timeline')
    await userEvent.click(screen.getByRole('button', { name: 'filter' }))
    // A shared link wins.
    renderAt('/streamline?q=impact%3Atrue')
    const outputs = screen.getAllByTestId('q')
    expect(outputs[outputs.length - 1]).toHaveTextContent('impact:true')
  })
})
