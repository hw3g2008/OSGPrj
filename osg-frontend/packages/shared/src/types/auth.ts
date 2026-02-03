// 登录参数
export interface LoginParams {
  username: string
  password: string
  code?: string
  uuid?: string
}

// 登录结果
export interface LoginResult {
  token: string
  expires_in?: number
}
