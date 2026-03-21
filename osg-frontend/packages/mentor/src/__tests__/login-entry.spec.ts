import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('mentor login entry contract', () => {
  it('uses the mentor auth module instead of shared login directly', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../views/login/index.vue'),
      'utf8'
    )

    expect(source).toContain("from '@/api/auth'")
    expect(source).not.toContain("from '@osg/shared/api'")
  })

  it('avoids native form markup for the login panel', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../views/login/index.vue'),
      'utf8'
    )

    expect(source).not.toContain('<form class=\"login-form\"')
    expect(source).toContain('<div class=\"login-form\"')
  })
})
