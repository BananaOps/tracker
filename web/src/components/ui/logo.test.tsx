import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './logo'

describe('Logo', () => {
  it('is announced as Tracker', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Tracker' })).toHaveTextContent('tracker')
  })

  it('can show the symbol alone', () => {
    render(<Logo word={false} size={28} />)
    const logo = screen.getByRole('img', { name: 'Tracker' })
    expect(logo).not.toHaveTextContent('tracker')
    expect(logo.querySelector('svg')).toHaveAttribute('width', '28')
  })
})
