import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Highlight } from './highlight'
import { Kbd } from './kbd'

describe('Kbd', () => {
  it('renders a kbd element', () => {
    render(<Kbd>⌘K</Kbd>)
    const key = screen.getByText('⌘K')
    expect(key.tagName).toBe('KBD')
    expect(key).toHaveClass('font-mono', 'border-rule')
  })
})

describe('Highlight', () => {
  it('sets on-signature text on a signature fill', () => {
    render(<Highlight>is running</Highlight>)
    expect(screen.getByText('is running')).toHaveClass('bg-signature', 'text-on-signature')
  })

  it('has a mono data variant', () => {
    render(<Highlight data>now 15:31</Highlight>)
    expect(screen.getByText('now 15:31')).toHaveClass('font-mono', 'font-medium')
  })
})
