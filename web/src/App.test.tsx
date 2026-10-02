import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreatePanelProvider } from './contexts/CreatePanelContext'
import { ThemeProvider } from './contexts/ThemeContext'
import type { Principal } from './types/auth'

const anonymous: Principal = {
  authenticated: false,
  kind: 'anonymous',
  userId: '',
  username: '',
  displayName: '',
  source: '',
  teams: [],
  permissions: [],
  scopeAll: true,
  scopeServices: [],
  mustChangePassword: false,
  isAdmin: false,
}

vi.mock('./lib/authApi', () => ({
  authApi: {
    getConfig: vi.fn(async () => ({ localLoginEnabled: true, oidcEnabled: false, oidcButtonLabel: '', anonymousPermissions: [], demoMode: false })),
    me: vi.fn(async () => anonymous),
    logout: vi.fn(async () => {}),
  },
  getApiErrorStatus: () => undefined,
  getApiErrorMessage: (_e: unknown, fallback: string) => fallback,
}))

// Heavy pages and network-bound widgets are not under test here; the guards are.
vi.mock('./pages/Dashboard', () => ({ default: () => <h1>Dashboard page</h1> }))
vi.mock('./pages/Documentation', () => ({ default: () => <h1>Docs page</h1> }))
vi.mock('./components/LinksSearch', () => ({ default: () => null }))

import App from './App'

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <CreatePanelProvider>
          <App />
        </CreatePanelProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('App routing', () => {
  it('renders the login page outside the layout', async () => {
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Sign in to Tracker' })).toBeInTheDocument()
    expect(screen.queryByText('Tracker', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('sends an anonymous visitor without event:read from the dashboard to the login page', async () => {
    renderApp('/dashboard')
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(window.location.search).toBe('?redirect=%2Fdashboard')
  })

  it('keeps the docs page public', async () => {
    renderApp('/docs')
    expect(await screen.findByRole('heading', { name: 'Docs page' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/docs')
  })
})
