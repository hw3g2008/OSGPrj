import { http } from '@osg/shared/utils'

// 获取用户列表（分页+搜索+筛选）
export function getUserList(params: {
  pageNum: number
  pageSize: number
  userName?: string
  phonenumber?: string
  status?: string
  roleId?: number
}) {
  return http.get<{ rows: any[]; total: number }>('/system/user/list', { params })
}

// 新增用户
export function addUser(data: {
  userName: string
  nickName: string
  email: string
  phonenumber?: string
  roleIds: number[]
  remark?: string
  password?: string
}) {
  return http.post('/system/user', data)
}

// 修改用户
export function updateUser(data: {
  userId: number
  nickName: string
  email: string
  phonenumber?: string
  roleIds: number[]
  remark?: string
}) {
  return http.put('/system/user', data)
}

// 重置用户密码
export function resetUserPwd(data: { userId: number; password: string }) {
  return http.put('/system/user/resetPwd', data)
}

// 修改用户状态（启用/禁用）
export function changeUserStatus(data: { userId: number; status: string }) {
  return http.put('/system/user/changeStatus', data)
}

// 获取角色选项列表（用于新增/编辑用户的角色选择）
export function getRoleOptions() {
  return http.get<any[]>('/system/role/optionselect')
}
