import { http } from '../utils/request'
import type { UserInfo, PageResult, PageParams } from '../types'

// 获取用户列表
export function getUserList(params: PageParams): Promise<PageResult<UserInfo>> {
  return http.get('/system/user/list', { params })
}

// 获取用户详情
export function getUserDetail(userId: number): Promise<UserInfo> {
  return http.get(`/system/user/${userId}`)
}

// 更新用户信息
export function updateUser(data: Partial<UserInfo>): Promise<void> {
  return http.put('/system/user', data)
}

// 更新密码
export function updatePassword(oldPassword: string, newPassword: string): Promise<void> {
  return http.put('/system/user/profile/updatePwd', { oldPassword, newPassword })
}

// 首次登录 / 默认密码强制改密（无需旧密码）
export function updateFirstLoginPwd(newPassword: string): Promise<void> {
  return http.put('/system/user/profile/updateFirstLoginPwd', { newPassword })
}
