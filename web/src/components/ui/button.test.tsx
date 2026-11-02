import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Export</Button>)
    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute('type', 'button')
  })

  it('draws the three variants with tokens', () => {
    render(
      <>
        <Button variant="primary">Edit event</Button>
        <Button variant="secondary">Lock service</Button>
        <Button variant="ghost">Copy link</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Edit event' })).toHaveClass('bg-ink', 'text-on-ink', 'h-control-md')
    expect(screen.getByRole('button', { name: 'Lock service' })).toHaveClass('border-rule-strong', 'bg-surface')
    expect(screen.getByRole('button', { name: 'Copy link' })).toHaveClass('bg-transparent')
  })

  it('keeps the legacy variant names working', () => {
    render(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('border-rule-strong')
  })

  it('renders a square icon button named by its aria-label', () => {
    render(<Button variant="ghost" size="sm" icon="close" aria-label="Close detail" />)
    const button = screen.getByRole('button', { name: 'Close detail' })
    expect(button).toHaveClass('w-control-sm', 'h-control-sm')
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('puts a 12 px icon after the label', () => {
    render(<Button iconRight="chevron-down">New</Button>)
    const icons = screen.getByRole('button', { name: 'New' }).querySelectorAll('svg')
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveAttribute('width', '12')
  })

  it('shows a 2 px focus ring and does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-focus-ring')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
