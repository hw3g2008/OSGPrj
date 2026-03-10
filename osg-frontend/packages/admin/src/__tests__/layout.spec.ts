import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mainLayoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8'
)

describe('layout shell', () => {
  it('should wire a visible logout trigger to handleLogout', () => {
    expect(mainLayoutSource).toContain('退出登录')
    expect(mainLayoutSource).toContain('@click="handleLogout"')
  })

  it('should expose a separate profile settings entry from the logout trigger', () => {
    expect(mainLayoutSource).toContain('个人设置')
    expect(mainLayoutSource).toContain('openProfileSettings')
    expect(mainLayoutSource).toContain('showProfileModal.value = true')
  })
})
