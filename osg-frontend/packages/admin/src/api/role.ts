import { http } from '@osg/shared/utils'

// 获取角色列表
export function getRoleList(params: { pageNum: number; pageSize: number }) {
  return http.get<{ rows: any[]; total: number }>('/system/role/list', { params })
}

// 获取角色详情
export function getRole(roleId: number) {
  return http.get<any>(`/system/role/${roleId}`)
}

// 新增角色
export function addRole(data: any) {
  return http.post('/system/role', data)
}

// 修改角色
export function updateRole(data: any) {
  return http.put('/system/role', data)
}

// 删除角色
export function deleteRole(roleId: number) {
  return http.delete(`/system/role/${roleId}`)
}

// 获取菜单树
export function getMenuTree() {
  return http.get<any[]>('/system/menu/treeselect')
}

// 获取角色已分配的菜单
export function getRoleMenuIds(roleId: number) {
  return http.get<{ checkedKeys: number[] }>(`/system/menu/roleMenuTreeselect/${roleId}`)
}
