import { http } from '@osg/shared/utils'

export interface UserListParams {
  pageNum: number
  pageSize: number
  userName?: string
  nickName?: string
  status?: string
  roleId?: number
}

export interface UserInfo {
  userId: number
  userName: string
  nickName: string
  email: string
  phonenumber?: string
  status: string
  loginDate?: string
  updateTime?: string
  remark?: string
  roles?: { roleId: number; roleName: string; roleKey: string }[]
}

// 获取用户列表
export function getUserList(params: UserListParams) {
  return http.get<{ rows: UserInfo[]; total: number }>('/system/user/list', { params })
}

// 获取用户详情
export function getUser(userId: number) {
  return http.get<{ data: UserInfo; roles: any[] }>(`/system/user/${userId}`)
}

// 新增用户
export function addUser(data: Partial<UserInfo> & { roleIds: number[] }) {
  return http.post('/system/user', data)
}

// 修改用户
export function updateUser(data: Partial<UserInfo> & { roleIds: number[] }) {
  return http.put('/system/user', data)
}

// 删除用户
export function deleteUser(userId: number) {
  return http.delete(`/system/user/${userId}`)
}

// 重置密码
export function resetUserPwd(userId: number, password: string) {
  return http.put('/system/user/resetPwd', { userId, password })
}

// 修改用户状态
export function changeUserStatus(userId: number, status: string) {
  return http.put('/system/user/changeStatus', { userId, status })
}

// 获取所有角色（用于下拉选择）
export function getAllRoles() {
  return http.get<{ roles: any[] }>('/system/user/')
}
