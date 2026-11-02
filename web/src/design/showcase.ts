import tokens from './tokens.json'

/* Data for the design system showcase (pages/ThemeTest.tsx). */

const COLOR_GROUPS: { label: string; names: string[] }[] = [
  { label: 'Surfaces and rules', names: ['paper', 'surface', 'sunken', 'overlay', 'scrim', 'rule', 'rule-soft', 'rule-strong', 'grid'] },
  { label: 'Ink', names: ['ink', 'ink-hover', 'on-ink', 'muted'] },
  { label: 'Signature, the present', names: ['signature', 'on-signature', 'signature-wash', 'needle', 'focus-ring'] },
  { label: 'Status and impact', names: ['failed', 'failed-wash', 'warning', 'warning-wash', 'on-status', 'tag-line', 'impact', 'on-impact', 'impact-wash'] },
  { label: 'Charts only', names: ['chart-done', 'chart-open', 'type-deployment', 'type-operation', 'type-drift', 'type-rpa', 'data-1', 'data-2', 'data-3', 'data-4'] },
]

const grouped = new Set(COLOR_GROUPS.flatMap((g) => g.names))
const ungrouped = tokens.color.tokens.map((t) => t.name).filter((name) => !grouped.has(name))
/** Colour groups shown in the showcase; a token missing from the list above lands in "Other". */
export const colorGroups = ungrouped.length ? [...COLOR_GROUPS, { label: 'Other', names: ungrouped }] : COLOR_GROUPS

export const colorValues: Record<string, { light: string; dark: string }> = Object.fromEntries(
  tokens.color.tokens.map((t) => [t.name, t.value]),
)

// Literal class names, so that Tailwind generates them.
export const TYPE_STYLE_CLASSES: Record<string, string> = {
  'metric-xl': 'text-metric-xl',
  metric: 'text-metric',
  'title-lg': 'text-title-lg',
  title: 'text-title',
  'title-sm': 'text-title-sm',
  summary: 'text-summary',
  'body-strong': 'text-body-strong',
  body: 'text-body',
  caption: 'text-caption',
  data: 'text-data',
  'data-sm': 'text-data-sm',
  'data-strong': 'text-data-strong',
}
