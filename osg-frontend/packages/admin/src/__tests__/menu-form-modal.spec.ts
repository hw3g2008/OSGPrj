import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const menuViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/index.vue'),
  'utf-8'
)

const modalPath = path.resolve(__dirname, '../views/permission/menu/components/MenuFormModal.vue')

describe('菜单管理弹层壳体', () => {
  it('提供菜单表单弹层文件并暴露 modal-menu-form surface id', () => {
    expect(fs.existsSync(modalPath)).toBe(true)
    const modalSource = fs.readFileSync(modalPath, 'utf-8')

    expect(modalSource).toContain("surface-id=\"modal-menu-form\"")
    expect(modalSource).toContain('菜单项配置')
    expect(modalSource).toContain('菜单类型')
    expect(modalSource).toContain('上级菜单')
    expect(modalSource).toContain('菜单名称')
    expect(modalSource).toContain('路由地址')
    expect(modalSource).toContain('组件路径')
    expect(modalSource).toContain('权限标识')
    expect(modalSource).toContain('图标')
    expect(modalSource).toContain('显示排序')
    expect(modalSource).toContain('状态')
    expect(modalSource).toContain('保存')
    expect(modalSource).toContain('取消')
    expect(modalSource).toContain('mdi-file-tree')
  })

  it('在菜单管理页中挂接新增和编辑 trigger 到 modal-menu-form', () => {
    expect(menuViewSource).toContain('MenuFormModal')
    expect(menuViewSource).toContain('openMenuForm')
    expect(menuViewSource).toContain("data-surface-trigger=\"modal-menu-form\"")
  })
})
