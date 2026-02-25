import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, removeToken, setUser, removeUser } from '@osg/shared/utils'
import { login as loginApi, getInfo as getInfoApi, logout as logoutApi } from '@osg/shared/api/auth'
import type { LoginParams, UserInfo } from '@osg/shared/types'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const firstLogin = ref(false)

  async function login(params: LoginParams) {
    const res = await loginApi(params)
    token.value = res.token
    setToken(res.token)
    await fetchInfo()
  }

  async function fetchInfo() {
    const res = await getInfoApi()
    userInfo.value = res.user
    roles.value = res.roles
    permissions.value = res.permissions
    firstLogin.value = res.firstLogin
    setUser(res.user)
  }

  async function logout() {
    try {
      await logoutApi()
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
    fetchInfo,
    logout,
    setFirstLogin
  }
})
