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
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.post('/system/user', data, config)
}

// 修改用户
export function updateUser(data: {
  userId: number
  userName: string
  nickName: string
  email: string
  phonenumber?: string
  roleIds: number[]
  remark?: string
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.put('/system/user', data, config)
}

// 重置用户密码
export function resetUserPwd(data: { userId: number; password: string }, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.put('/system/user/resetPwd', data, config)
}

// 修改用户状态（启用/禁用）
export function changeUserStatus(data: { userId: number; status: string }, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.put('/system/user/changeStatus', data, config)
}

// 获取用户详情（含角色信息）
export function getUserDetail(userId: number) {
  return http.get<{ data: any; roles: any[]; roleIds: number[] }>(`/system/user/${userId}`)
}

// 获取角色选项列表（用于新增/编辑用户的角色选择）
export function getRoleOptions() {
  return http.get<any[]>('/system/role/optionselect')
}
