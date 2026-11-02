import type { ReactNode } from 'react'
import { useTheme } from '../contexts/theme'
import { colorGroups, colorValues, TYPE_STYLE_CLASSES } from '../design/showcase'
import tokens from '../design/tokens.json'
import { cn } from '../lib/utils'

/*
 * Living showcase of the design system (docs/design-system/). Every token and,
 * from lot 2 on, every component is shown in the light and the dark theme side
 * by side, whatever the theme of the page.
 */

type ThemeId = 'light' | 'dark'

const RADIUS_CLASSES: Record<string, string> = {
  'radius-xs': 'rounded-xs',
  'radius-sm': 'rounded-sm',
  'radius-md': 'rounded-md',
  'radius-lg': 'rounded-lg',
}

const typeGroups = tokens.type.groups

function ThemeColumns({ children }: { children: (theme: ThemeId) => ReactNode }) {
  return (
    <div className="grid gap-space-6 lg:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} className={cn(theme, 'rounded-md border border-rule bg-paper p-space-5 text-ink')}>
          <p className="mb-space-4 text-data-sm text-muted">{theme}</p>
          {children(theme)}
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-4">
      <div className="flex flex-col gap-space-1">
        <h2 id={id} className="text-title text-ink">{title}</h2>
        <p className="text-body text-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Swatch({ name, theme }: { name: string; theme: ThemeId }) {
  return (
    <li className="flex items-center gap-space-3">
      <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-sm border border-rule" style={{ background: `var(--${name})` }} />
      <span className="flex min-w-0 flex-col">
        <span className="text-data-strong text-ink">{name}</span>
        <span className="text-data-sm text-muted">{colorValues[name]?.[theme]}</span>
      </span>
    </li>
  )
}

function ThemeSwitch() {
  const { theme, effectiveTheme, setTheme } = useTheme()
  const options = ['light', 'dark', 'system'] as const
  return (
    <div className="flex flex-wrap items-center gap-space-3">
      <div role="group" aria-label="Page theme" className="inline-flex rounded-md bg-sunken p-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={theme === option}
            onClick={() => setTheme(option)}
            className={cn(
              'h-[26px] rounded-sm border px-space-3 text-data transition-colors duration-[120ms]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              theme === option ? 'border-rule bg-surface text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <span className="text-data-sm text-muted">page theme · {effectiveTheme}</span>
    </div>
  )
}

export default function ThemeTest() {
  return (
    <div className="flex flex-col gap-space-8 p-space-8 pb-space-16">
      <header className="flex flex-col gap-space-3">
        <h1 className="text-title-lg text-ink">Design system</h1>
        <p className="max-w-3xl text-summary text-muted">
          Tokens and components of Tracker, in the light and the dark theme side by side. The page theme only changes the
          frame around them.
        </p>
        <ThemeSwitch />
      </header>

      <Section id="ds-colour" title="Colour" description="Colour signals a deviation: only failed, warning and impact carry a hue. Type colours belong to charts.">
        <ThemeColumns>
          {(theme) => (
            <div className="flex flex-col gap-space-6">
              {colorGroups.map((group) => (
                <div key={group.label} className="flex flex-col gap-space-3">
                  <h3 className="text-title-sm text-ink">{group.label}</h3>
                  <ul className="grid grid-cols-2 gap-space-3 xl:grid-cols-3">
                    {group.names.map((name) => (
                      <Swatch key={name} name={name} theme={theme} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-type" title="Typography" description="Spline Sans Mono for facts, Spline Sans for sentences. Figures are tabular.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-6">
              {typeGroups.map((group) => (
                <div key={group.name} className="flex flex-col gap-space-4">
                  {group.styles.map((style) => (
                    <div key={style.name} className="flex flex-col gap-space-1 border-t border-rule-soft pt-space-3">
                      <span className="text-data-sm text-muted">
                        {style.name} · {group.family} · {style.fontSize.replace('px', '')}/{style.lineHeight.replace('px', '')} ·{' '}
                        {style.fontWeight}
                        {'letterSpacing' in style ? ` · ${style.letterSpacing}` : ''}
                      </span>
                      <span className={cn(TYPE_STYLE_CLASSES[style.name], 'text-ink')}>{style.sample}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section id="ds-shape" title="Radius, spacing and size" description="A 4 px grid. Rules rather than shadows.">
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-6">
              <ul className="flex flex-wrap gap-space-4">
                {tokens.radius.tokens.map((t) => (
                  <li key={t.name} className="flex flex-col items-start gap-space-2">
                    <span aria-hidden="true" className={cn('h-12 w-12 border border-rule-strong bg-surface', RADIUS_CLASSES[t.name])} />
                    <span className="text-data-sm text-muted">{t.name} · {t.value}</span>
                  </li>
                ))}
              </ul>
              <ul className="flex flex-col gap-space-2">
                {[...tokens.spacing.tokens, ...tokens.size.tokens].map((t) => (
                  <li key={t.name} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-space-3">
                    <span className="text-data-sm text-muted">{t.name} · {t.value}</span>
                    <span aria-hidden="true" className="h-2 max-w-full rounded-xs bg-chart-done" style={{ width: `var(--${t.name})` }} />
                  </li>
                ))}
              </ul>
              <div className="rounded-lg bg-overlay p-space-5 shadow-overlay">
                <p className="text-body-strong text-ink">shadow-overlay</p>
                <p className="text-caption text-muted">Drawer, command palette and menus only.</p>
              </div>
            </div>
          )}
        </ThemeColumns>
      </Section>

      <Section
        id="ds-bridge"
        title="Legacy bridge"
        description="Temporary: the --hud-* classes of the screens not redesigned yet now read the tokens. Removed in lot 5."
      >
        <ThemeColumns>
          {() => (
            <div className="flex flex-col gap-space-3">
              <div className="card">
                <p className="text-hud-on-surface">card · hud-on-surface</p>
                <p className="text-hud-on-surface-var">hud-on-surface-var</p>
              </div>
              <div className="flex flex-wrap gap-space-2">
                <button type="button" className="btn-primary">btn-primary</button>
                <button type="button" className="btn-secondary">btn-secondary</button>
              </div>
              <input type="text" className="input" aria-label="Legacy input" placeholder="input" />
            </div>
          )}
        </ThemeColumns>
      </Section>
    </div>
  )
}
