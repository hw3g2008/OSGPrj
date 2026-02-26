import { http } from '@osg/shared/utils'

// 获取角色列表（分页）
export function getRoleList(params: { pageNum: number; pageSize: number }) {
  return http.get<{ rows: any[]; total: number }>('/system/role/list', { params })
}

// 新增角色（含 menuIds）
export function addRole(data: {
  roleName: string
  roleKey: string
  remark?: string
  menuIds: number[]
}) {
  return http.post('/system/role', data)
}

// 修改角色（含 menuIds）
export function updateRole(data: {
  roleId: number
  roleName: string
  roleKey: string
  remark?: string
  menuIds: number[]
}) {
  return http.put('/system/role', data)
}

// 删除角色
export function deleteRole(roleId: number) {
  return http.delete(`/system/role/${roleId}`)
}

// 获取菜单树（权限 Checkbox 数据源）
export function getMenuTree() {
  return http.get<any[]>('/system/menu/treeselect')
}

// 获取角色已勾选的菜单
export function getRoleMenuIds(roleId: number) {
  return http.get<{ checkedKeys: number[]; menus: any[] }>(`/system/menu/roleMenuTreeselect/${roleId}`)
}
