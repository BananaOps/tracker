import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import tokens from './tokens.json'

const web = resolve(__dirname, '../..')

describe('design tokens', () => {
  it('keeps tokens.json in sync with docs/design-system', () => {
    const source = readFileSync(resolve(web, '../docs/design-system/tokens.json'), 'utf8')
    expect(JSON.parse(source)).toEqual(tokens)
  })

  it('keeps the generated tokens.css up to date', () => {
    // Throws (non-zero exit) when tokens.css differs from what tokens.json produces.
    expect(() =>
      execFileSync(process.execPath, ['scripts/build-tokens.mjs', '--check'], { cwd: web, stdio: 'pipe' }),
    ).not.toThrow()
  })

  it('gives every colour a light and a dark value', () => {
    for (const token of tokens.color.tokens) {
      expect(token.value.light, token.name).toBeTruthy()
      expect(token.value.dark, token.name).toBeTruthy()
    }
  })
})
