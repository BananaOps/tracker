import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '../contexts/ThemeContext'
import tokens from '../design/tokens.json'
import { typeStyles } from '../lib/utils'
import { colorGroups, TYPE_STYLE_CLASSES } from '../design/showcase'
import ThemeTest from './ThemeTest'

function renderShowcase() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ThemeTest />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('design system showcase', () => {
  it('lists every colour token in a named group', () => {
    const shown = colorGroups.flatMap((g) => g.names)
    expect(shown.sort()).toEqual(tokens.color.tokens.map((t) => t.name).sort())
    expect(colorGroups.find((g) => g.label === 'Other')).toBeUndefined()
  })

  it('has a utility class for every type style', () => {
    expect(Object.keys(TYPE_STYLE_CLASSES).sort()).toEqual([...typeStyles].sort())
  })

  it('shows each section in the light and the dark theme', () => {
    const { container } = renderShowcase()
    for (const name of [
      'Colour',
      'Typography',
      'Radius, spacing and size',
      'Icon and logo',
      'Button, Kbd and Highlight',
      'StatusMark and ImpactMark',
      'SegmentedControl and MetricStrip',
      'EventList and TimeRuler',
      'QueryBar and saved views',
      'Sidebar',
      'EventDrawer',
      'CommandPalette',
      'Legacy bridge',
    ]) {
      const section = screen.getByRole('region', { name })
      expect(section.querySelectorAll(':scope .light').length).toBe(1)
      expect(section.querySelectorAll(':scope .dark').length).toBe(1)
    }
    expect(within(screen.getByRole('region', { name: 'Colour' })).getAllByText('signature')).toHaveLength(2)
    expect(container.querySelectorAll('.text-metric-xl')).toHaveLength(2)
  })

  it('marks the selected page theme', () => {
    renderShowcase()
    const group = screen.getByRole('group', { name: 'Page theme' })
    const pressed = within(group).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
  })
})
