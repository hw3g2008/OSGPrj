import { http } from '../../utils/request'

export interface MenuListParams {
  menuName?: string
  status?: string
  menuType?: string
}

export interface MenuListItem {
  menuId: number
  parentId?: number
  menuName: string
  menuType: 'M' | 'C' | 'F'
  orderNum?: number
  perms?: string
  component?: string
  path?: string
  icon?: string
  status: '0' | '1'
  visible?: string
}

export interface MenuMutationPayload {
  menuId?: number
  parentId: number
  menuName: string
  menuType: 'M' | 'C' | 'F'
  orderNum: number
  path?: string
  component?: string
  perms?: string
  icon?: string
  status: '0' | '1'
  visible: '0' | '1'
  isFrame: '0' | '1'
  isCache: '0' | '1'
  query?: string
  routeName?: string
}

function toRequestParams(params: MenuListParams = {}) {
  const requestParams: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return
    requestParams[key] = value
  })

  return requestParams
}

export function getAdminMenuList(params: MenuListParams = {}) {
  return http.get<MenuListItem[]>('/system/menu/list', {
    params: toRequestParams(params)
  })
}

export function createAdminMenu(payload: MenuMutationPayload) {
  return http.post('/system/menu', payload)
}

export function updateAdminMenu(payload: MenuMutationPayload) {
  return http.put('/system/menu', payload)
}
