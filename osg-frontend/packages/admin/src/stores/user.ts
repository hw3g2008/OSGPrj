import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, removeToken, setUser, removeUser } from '@osg/shared/utils'
import { login as loginApi, getInfo as getInfoApi, getRouters as getRoutersApi, logout as logoutApi } from '@osg/shared/api/auth'
import type { LoginParams, UserInfo } from '@osg/shared/types'
import type { RuntimeRouteRecord } from '@/router/runtimeRoutes'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const routeMenus = ref<RuntimeRouteRecord[]>([])
  const routesLoaded = ref(false)
  const firstLogin = ref(false)

  async function login(params: LoginParams) {
    const res = await loginApi(params)
    token.value = res.token
    setToken(res.token)
    await fetchInfo()
  }

  async function fetchInfo() {
    const [res, routers] = await Promise.all([getInfoApi(), getRoutersApi()])
    userInfo.value = res.user
    roles.value = res.roles
    permissions.value = res.permissions
    routeMenus.value = Array.isArray(routers) ? routers : []
    routesLoaded.value = true
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
      routeMenus.value = []
      routesLoaded.value = false
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
    routeMenus,
    routesLoaded,
    firstLogin,
    login,
    fetchInfo,
    logout,
    setFirstLogin
  }
})
