import { http } from '@osg/shared/utils'

export interface RoleListRow {
  roleId: number
  roleName: string
  /** stable i18n key for roleName (system roles only); null for user-defined */
  i18nKey?: string | null
  roleKey: string
  roleSort?: number
  status?: string
  remark?: string | null
  /** stable i18n key for remark (system roles only); null for user-defined */
  remarkI18nKey?: string | null
  userCount?: number
  updateTime?: string
  [extra: string]: unknown
}

// 获取角色列表（分页）
export function getRoleList(params: { pageNum: number; pageSize: number }) {
  return http.get<{ rows: RoleListRow[]; total: number }>('/system/role/list', { params })
}

// 新增角色（含 menuIds）
export function addRole(data: {
  roleName: string
  roleKey: string
  status?: string
  remark?: string
  menuIds: number[]
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.post('/system/role', data, config)
}

// 修改角色（含 menuIds）
export function updateRole(data: {
  roleId: number
  roleName: string
  roleKey: string
  status?: string
  remark?: string
  menuIds: number[]
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.put('/system/role', data, config)
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
