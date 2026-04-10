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
  children?: MenuListItem[]
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

/** 将扁平菜单列表按 parentId 构建成树形结构 */
export function buildMenuTree(list: MenuListItem[]): MenuListItem[] {
  const map = new Map<number, MenuListItem>()
  const roots: MenuListItem[] = []

  // 先建索引，清空可能存在的旧 children
  list.forEach((item) => {
    item.children = []
    map.set(item.menuId, item)
  })

  // 挂载子节点
  list.forEach((item) => {
    const parent = item.parentId != null ? map.get(item.parentId) : undefined
    if (parent) {
      parent.children!.push(item)
    } else {
      roots.push(item)
    }
  })

  // 移除空 children（让 Ant Table 不显示多余展开箭头）
  const prune = (nodes: MenuListItem[]) => {
    nodes.forEach((n) => {
      if (n.children && n.children.length === 0) {
        delete n.children
      } else if (n.children) {
        prune(n.children)
      }
    })
  }
  prune(roots)

  return roots
}

export function createAdminMenu(payload: MenuMutationPayload) {
  return http.post('/system/menu', payload)
}

export function updateAdminMenu(payload: MenuMutationPayload) {
  return http.put('/system/menu', payload)
}
