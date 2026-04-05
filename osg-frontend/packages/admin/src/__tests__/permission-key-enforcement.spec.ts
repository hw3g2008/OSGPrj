import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasAnyPermission } from '../directives/hasPermi'

const mainSource = readFileSync(path.resolve(__dirname, '../main.ts'), 'utf-8')
const menuPageSource = readFileSync(path.resolve(__dirname, '../views/permission/menu/index.vue'), 'utf-8')
const rolesPageSource = readFileSync(path.resolve(__dirname, '../views/permission/roles/index.vue'), 'utf-8')

describe('permission key enforcement', () => {
  it('recognizes admin wildcard and exact perms', () => {
    expect(hasAnyPermission('system:menu:add', ['system:menu:add'])).toBe(true)
    expect(hasAnyPermission('system:menu:add', ['*:*:*'])).toBe(true)
    expect(hasAnyPermission(['system:menu:add', 'system:menu:edit'], ['system:menu:edit'])).toBe(true)
    expect(hasAnyPermission('system:menu:add', ['system:menu:list'])).toBe(false)
  })

  it('registers v-hasPermi and applies it to key admin buttons', () => {
    expect(mainSource).toContain("app.directive('hasPermi', hasPermiDirective)")
    expect(menuPageSource).toContain(`v-hasPermi="'system:menu:add'"`)
    expect(menuPageSource).toContain(`v-hasPermi="'system:menu:edit'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:add'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:edit'"`)
    expect(rolesPageSource).toContain(`v-hasPermi="'system:role:remove'"`)
  })
})
