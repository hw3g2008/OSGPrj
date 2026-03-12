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

  it('should keep the shared sidebar iconography on the prototype mdi shell instead of ant svg icons', () => {
    expect(mainLayoutSource).toContain('class="mdi mdi-home"')
    expect(mainLayoutSource).toContain("iconClass: 'mdi-key'")
    expect(mainLayoutSource).toContain("iconClass: 'mdi-shield-account'")
    expect(mainLayoutSource).toContain("iconClass: 'mdi-database-cog'")
    expect(mainLayoutSource).toContain('class="mdi mdi-shield-crown"')
    expect(mainLayoutSource).not.toContain('SafetyCertificateFilled')
  })

  it('should keep the superadmin footer avatar on the prototype SA initials', () => {
    expect(mainLayoutSource).toContain("if (userStore.permissions.includes('*:*:*')) return 'SA'")
  })

  it('should keep the shared sidebar nav icons on the prototype 20px glyph within a 24px slot', () => {
    const navIconBlockStart = mainLayoutSource.indexOf('.nav-item .mdi {')
    const navIconBlockEnd = mainLayoutSource.indexOf('}', navIconBlockStart)
    const navIconBlock = mainLayoutSource.slice(navIconBlockStart, navIconBlockEnd)

    expect(navIconBlock).toContain('width: 24px;')
    expect(navIconBlock).toContain('font-size: 20px;')
  })
})
