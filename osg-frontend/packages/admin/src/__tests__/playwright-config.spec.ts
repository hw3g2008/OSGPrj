import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../../..')
const playwrightConfigPath = path.join(repoRoot, 'osg-frontend/playwright.config.ts')

describe('Playwright config framework guard', () => {
  it('disables Playwright webServer auto-start when UI_VISUAL_SOURCE=prototype', () => {
    const source = fs.readFileSync(playwrightConfigPath, 'utf-8')

    expect(source).toContain("process.env.UI_VISUAL_SOURCE === 'prototype'")
  })
})
