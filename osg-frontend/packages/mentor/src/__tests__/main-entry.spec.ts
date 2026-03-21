import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('mentor main entry', () => {
  it('loads mdi font styles because mentor pages use mdi icon classes', () => {
    const mainSource = readFileSync(path.resolve(__dirname, '../main.ts'), 'utf-8')

    expect(mainSource).toContain("@mdi/font/css/materialdesignicons.css")
  })
})
