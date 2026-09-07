import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL pushed into the MemoryRouter. */
  route?: string
}

/** Renders the current pathname + search so tests can assert on navigation. */
export function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

// eslint-disable-next-line react-refresh/only-export-components -- test helper file, not subject to Fast Refresh
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

/**
 * Wraps `ui` in a MemoryRouter and a fresh QueryClient. The element is
 * mounted at `route` on a catch-all route so `useNavigate` and `useLocation`
 * work; `<LocationProbe />` is rendered alongside for navigation assertions.
 */
// eslint-disable-next-line react-refresh/only-export-components -- test helper file, not subject to Fast Refresh
export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: Options = {}) {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                {children}
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
