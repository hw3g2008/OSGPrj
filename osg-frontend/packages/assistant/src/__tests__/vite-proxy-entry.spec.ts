import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('assistant vite proxy contract', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, '../../vite.config.ts'),
    'utf8',
  )

  it('rewrites assistant auth endpoints to the backend assistant namespace', () => {
    expect(source).toContain("'/api/assistant/login'")
    expect(source).toContain("rewrite: () => '/assistant/login'")
    expect(source).toContain("'/api/assistant/getInfo'")
    expect(source).toContain("rewrite: () => '/assistant/getInfo'")
  })

  it('keeps a generic /api proxy and preview parity for local verification', () => {
    expect(source).toContain("'/api': {")
    expect(source).toContain("rewrite: (path: string) => path.replace(/^\\/api/, '')")
    expect(source).toContain('preview:')
    expect(source).toContain("port: 4176")
  })
})
