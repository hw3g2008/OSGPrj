import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('lead-mentor vite proxy contract', () => {
  it('routes runtime /api traffic through the resolved proxy target instead of a fixed localhost:8080 fallback', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain('process.env.E2E_API_PROXY_TARGET')
    expect(source).toContain('http://127.0.0.1:28080')
    expect(source).not.toContain('http://localhost:8080')
  })

  it('rewrites shared ruoyi /api endpoints to backend paths without the /api prefix', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain("'/api'")
    expect(source).toContain("path.replace(/^\\/api/, '')")
  })

  it('rewrites lead-mentor auth endpoints to the backend /lead-mentor namespace', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../vite.config.ts'),
      'utf8'
    )

    expect(source).toContain("'/api/lead-mentor/login'")
    expect(source).toContain("rewrite: () => '/lead-mentor/login'")
    expect(source).toContain("'/api/lead-mentor/getInfo'")
    expect(source).toContain("rewrite: () => '/lead-mentor/getInfo'")
  })
})
