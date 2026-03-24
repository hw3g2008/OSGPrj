import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('assistant login entry contract', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, '../views/login/index.vue'),
    'utf8'
  )

  it('keeps the assistant auth entry and avoids native form markup', () => {
    expect(source).toContain('assistantLogin')
    expect(source).toContain('getAssistantInfo')
    expect(source).not.toContain('<a-form')
    expect(source).not.toContain('<form class="login-form"')
    expect(source).toContain('<div class="login-form"')
  })

  it('keeps the prototype shell markers and forgot-password entry', () => {
    expect(source).toContain('class="login-logo"')
    expect(source).toContain('class="login-title"')
    expect(source).toContain('class="login-role-tag"')
    expect(source).toContain('class="login-btn"')
    expect(source).toContain('class="login-links"')
    expect(source).toContain('class="pwd-wrapper"')
    expect(source).toContain('id="login-password"')
    expect(source).toContain('id="pwd-eye"')
    expect(source).toContain('to="/forgot-password"')
  })

  it('does not keep demo credentials or static success state in source', () => {
    expect(source).not.toContain('value="testmentor"')
    expect(source).not.toContain('value="********"')
    expect(source).not.toContain("username: 'testmentor'")
    expect(source).not.toContain("password: '123456'")
  })
})
