import { describe, it, expect } from 'vitest'

// 操作按钮显示逻辑
function getActionButtons(role: { roleKey: string; userCount: number }) {
  if (role.roleKey === 'super_admin') {
    return { type: 'system', buttons: [] }
  }
  if (role.userCount > 0) {
    return { type: 'hasUsers', buttons: ['edit'] }
  }
  return { type: 'noUsers', buttons: ['edit', 'delete'] }
}

// Checkbox 树联动逻辑
function updateParentCheckState(
  checkedKeys: number[],
  parentId: number,
  childIds: number[]
): 'checked' | 'indeterminate' | 'unchecked' {
  const checkedCount = childIds.filter(id => checkedKeys.includes(id)).length
  if (checkedCount === 0) return 'unchecked'
  if (checkedCount === childIds.length) return 'checked'
  return 'indeterminate'
}

describe('角色管理模块测试', () => {
  describe('操作按钮显示逻辑', () => {
    it('超级管理员显示系统角色', () => {
      const result = getActionButtons({ roleKey: 'super_admin', userCount: 1 })
      expect(result.type).toBe('system')
      expect(result.buttons).toHaveLength(0)
    })

    it('有员工的角色只显示编辑', () => {
      const result = getActionButtons({ roleKey: 'clerk', userCount: 3 })
      expect(result.type).toBe('hasUsers')
      expect(result.buttons).toEqual(['edit'])
    })

    it('无员工的角色显示编辑和删除', () => {
      const result = getActionButtons({ roleKey: 'file_admin', userCount: 0 })
      expect(result.type).toBe('noUsers')
      expect(result.buttons).toEqual(['edit', 'delete'])
    })
  })

  describe('Checkbox 树联动逻辑', () => {
    it('子项全部勾选时父项为选中', () => {
      const checkedKeys = [1, 2, 3]
      const result = updateParentCheckState(checkedKeys, 0, [1, 2, 3])
      expect(result).toBe('checked')
    })

    it('子项部分勾选时父项为半选', () => {
      const checkedKeys = [1, 2]
      const result = updateParentCheckState(checkedKeys, 0, [1, 2, 3])
      expect(result).toBe('indeterminate')
    })

    it('子项全部取消时父项为未选中', () => {
      const checkedKeys: number[] = []
      const result = updateParentCheckState(checkedKeys, 0, [1, 2, 3])
      expect(result).toBe('unchecked')
    })
  })
})
