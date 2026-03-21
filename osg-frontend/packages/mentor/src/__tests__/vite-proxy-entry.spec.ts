import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('mentor vite proxy contract', () => {
  it('rewrites /api/mentor/login to the backend /mentor/login endpoint', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain("'/api/mentor/login'")
    expect(source).toContain("rewrite: () => '/mentor/login'")
  })

  it('rewrites /api/mentor/getInfo to the backend /mentor/getInfo endpoint', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain("'/api/mentor/getInfo'")
    expect(source).toContain("rewrite: () => '/mentor/getInfo'")
  })

  it('rewrites /api/mentor/forgot-password requests to the backend /mentor/forgot-password endpoints', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain("'/api/mentor/forgot-password'")
    expect(source).toContain("path.replace(/^\\/api/, '')")
  })
})
