import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync(path.resolve(__dirname, '../main.ts'), 'utf-8')
const directiveSource = readFileSync(path.resolve(__dirname, '../directives/hasPermi.ts'), 'utf-8')
const menuPageSource = readFileSync(path.resolve(__dirname, '../views/permission/menu/index.vue'), 'utf-8')
const rolesPageSource = readFileSync(path.resolve(__dirname, '../views/permission/roles/index.vue'), 'utf-8')

describe('S-052 story regression skeleton', () => {
  it('前端关键按钮通过 v-hasPermi 按真实 perms 控制显示', () => {
    expect(mainSource).toContain("app.directive('hasPermi', hasPermiDirective)")
    expect(directiveSource).toContain('hasAnyPermission')
    expect(directiveSource).toContain("granted.includes('*:*:*')")
    expect(menuPageSource).toContain(`v-hasPermi="'system:menu:add'"`)
    expect(menuPageSource).toContain(`v-hasPermi="'system:menu:edit'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:add'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:edit'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:remove'"`)
  })

  it('perms key 变更后，前端按钮与注册指令仍使用同一套 system:* 权限码', () => {
    expect(menuPageSource).toContain('system:menu:add')
    expect(menuPageSource).toContain('system:menu:edit')
    expect(rolesPageSource).toContain('system:role:add')
    expect(rolesPageSource).toContain('system:role:edit')
    expect(rolesPageSource).toContain('system:role:remove')
  })
})
