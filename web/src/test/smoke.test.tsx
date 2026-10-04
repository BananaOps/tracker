import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'

describe('test toolchain', () => {
  it('renders inside router and query providers', () => {
    renderWithProviders(<p>hello tracker</p>, { route: '/locks?x=1' })
    expect(screen.getByText('hello tracker')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/locks?x=1')
  })
})
