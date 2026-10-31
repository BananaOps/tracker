#!/usr/bin/env node
// Generates src/design/tokens.css from src/design/tokens.json.
//
//   node scripts/build-tokens.mjs           write the file
//   node scripts/build-tokens.mjs --check   exit 1 if the file is out of date
//
// Light colours go under :root and .light, dark ones under .dark (ThemeContext
// sets one of the two classes on <html>; either can also scope a subtree).
// Every opaque colour also gets an "-rgb" channel variable (--paper-rgb:
// 243 241 236) for the rgb(var(--x) / α) form. Spacing, radii, sizes, font
// families and type styles go in the first block too.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(root, 'src/design/tokens.json')
const TARGET = resolve(root, 'src/design/tokens.css')

// Fontsource registers its variable fonts under "<Family> Variable".
// That name is put first, ahead of the family stack from tokens.json.
const FONTSOURCE_FAMILIES = {
  sans: '"Spline Sans Variable"',
  mono: '"Spline Sans Mono Variable"',
}

function hexToChannels(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value)
  if (!match) return null
  const n = parseInt(match[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

function colorLines(tokens, theme) {
  const lines = []
  for (const token of tokens) {
    const value = token.value[theme]
    lines.push(`--${token.name}: ${value};`)
    const channels = hexToChannels(value)
    if (channels) lines.push(`--${token.name}-rgb: ${channels};`)
  }
  return lines
}

function typeLines(type) {
  const lines = []
  for (const [name, stack] of Object.entries(type.families)) {
    lines.push(`--font-${name}: ${FONTSOURCE_FAMILIES[name]}, ${stack};`)
  }
  for (const group of type.groups) {
    for (const style of group.styles) {
      const prefix = `--typo-${style.name}`
      lines.push(
        `${prefix}-family: var(--font-${group.family});`,
        `${prefix}-size: ${style.fontSize};`,
        `${prefix}-line-height: ${style.lineHeight};`,
        `${prefix}-weight: ${style.fontWeight};`,
        `${prefix}-tracking: ${style.letterSpacing ?? 'normal'};`,
      )
    }
  }
  return lines
}

function block(selector, lines) {
  return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`
}

export function buildTokensCss(tokens) {
  const flat = (family) => tokens[family].tokens.map((t) => `--${t.name}: ${t.value};`)
  const shadows = (theme) => tokens.shadow.tokens.map((t) => `--${t.name}: ${t.value[theme]};`)

  return [
    '/*\n' +
      ' * GENERATED FILE, DO NOT EDIT BY HAND.\n' +
      ' * Source: src/design/tokens.json (copy of docs/design-system/tokens.json).\n' +
      ' * Regenerate with: npm run tokens\n' +
      ' */\n',
    block(':root,\n.light', [
      ...colorLines(tokens.color.tokens, 'light'),
      ...shadows('light'),
      ...typeLines(tokens.type),
      ...flat('spacing'),
      ...flat('radius'),
      ...flat('size'),
    ]),
    block('.dark', [...colorLines(tokens.color.tokens, 'dark'), ...shadows('dark')]),
  ].join('\n')
}

function main() {
  const css = buildTokensCss(JSON.parse(readFileSync(SOURCE, 'utf8')))
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readFileSync(TARGET, 'utf8')
    } catch {
      // missing file: reported below as out of date
    }
    if (current !== css) {
      console.error('src/design/tokens.css is out of date: run npm run tokens')
      process.exit(1)
    }
    return
  }
  writeFileSync(TARGET, css)
}

main()
