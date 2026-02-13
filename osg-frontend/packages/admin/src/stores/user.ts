import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setToken, removeToken, setUser, removeUser, getToken } from '@osg/shared/utils'
import type { LoginParams, UserInfo } from '@osg/shared/types'
import { http } from '@osg/shared/utils'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const firstLogin = ref(false)

  // 登录
  async function login(params: LoginParams) {
    const res = await http.post<{ token: string }>('/login', params)
    token.value = res.token
    setToken(res.token)

    // 获取用户信息
    await getInfo()
  }

  // 获取用户信息
  async function getInfo() {
    const res = await http.get<{
      user: UserInfo
      roles: string[]
      permissions: string[]
      firstLogin: boolean
    }>('/getInfo')

    userInfo.value = res.user
    roles.value = res.roles
    permissions.value = res.permissions
    firstLogin.value = res.firstLogin
    setUser(res.user)
  }

  // 登出
  async function logout() {
    try {
      await http.post('/logout')
    } finally {
      token.value = null
      userInfo.value = null
      roles.value = []
      permissions.value = []
      firstLogin.value = false
      removeToken()
      removeUser()
    }
  }

  // 更新首次登录状态
  function setFirstLogin(value: boolean) {
    firstLogin.value = value
  }

  return {
    token,
    userInfo,
    roles,
    permissions,
    firstLogin,
    login,
    getInfo,
    logout,
    setFirstLogin
  }
})
