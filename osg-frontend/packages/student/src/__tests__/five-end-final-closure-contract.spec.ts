import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const finalClosureScriptPath = path.resolve(
  __dirname,
  '../../e2e/f-five-end-final-closure.mjs'
)

describe('five-end final closure contract', () => {
  it('keeps the final acceptance closure bound to the c1/c2/c3/d/e headful scripts', () => {
    expect(fs.existsSync(finalClosureScriptPath)).toBe(true)

    const finalClosureScript = fs.readFileSync(finalClosureScriptPath, 'utf-8')

    expect(finalClosureScript).toContain('c1-applications-summary-headful.mjs')
    expect(finalClosureScript).toContain('c2-mock-practice-headful.mjs')
    expect(finalClosureScript).toContain('c3-courses-headful.mjs')
    expect(finalClosureScript).toContain('d-mentor-submit-admin-review-headful.mjs')
    expect(finalClosureScript).toContain('e-assistant-carrier-headful.mjs')
  })
})
