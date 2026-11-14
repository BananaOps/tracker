import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './icon'
import { iconNames } from './icons'

describe('Icon', () => {
  it('is hidden from assistive tech without a title', () => {
    const { container } = render(<Icon name="search" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '16')
    expect(svg).toHaveAttribute('stroke-linecap', 'square')
  })

  it('exposes its title as an accessible name', () => {
    render(<Icon name="impact" title="Users impacted" size={12} />)
    expect(screen.getByRole('img', { name: 'Users impacted' })).toHaveAttribute('width', '12')
  })

  it('draws every icon of the set, dashed segments included', () => {
    expect(iconNames).toHaveLength(32)
    for (const name of iconNames) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelectorAll('path').length, name).toBeGreaterThan(0)
      unmount()
    }
    const { container } = render(<Icon name="drifts" />)
    expect(container.querySelectorAll('path')[1]).toHaveAttribute('stroke-dasharray', '1.5 1.5')
  })
})
