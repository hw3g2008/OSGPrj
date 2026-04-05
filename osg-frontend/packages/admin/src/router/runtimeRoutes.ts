export interface RuntimeRouteMeta {
  title?: string
  icon?: string
}

export interface RuntimeRouteRecord {
  path?: string
  hidden?: boolean
  component?: string
  meta?: RuntimeRouteMeta
  children?: RuntimeRouteRecord[]
}

export interface RuntimeMenuItem {
  path: string
  title: string
  iconClass: string
}

export interface RuntimeMenuGroup {
  key: string
  title: string
  children: RuntimeMenuItem[]
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  return withLeadingSlash.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function resolvePath(parentPath: string, currentPath?: string): string {
  if (!currentPath) return normalizePath(parentPath || '/')
  if (currentPath.startsWith('/')) return normalizePath(currentPath)
  if (!parentPath || parentPath === '/') return normalizePath(currentPath)
  return normalizePath(`${parentPath}/${currentPath}`)
}

function resolveIconClass(icon?: string): string {
  if (!icon) return 'mdi-circle-medium'
  if (icon.startsWith('mdi-')) return icon
  if (icon.startsWith('mdi ')) return icon.replace(/^mdi\s+/, '')
  return /^[a-z0-9-]+$/i.test(icon) ? `mdi-${icon}` : 'mdi-circle-medium'
}

function hasVisibleChildren(route: RuntimeRouteRecord): boolean {
  return Array.isArray(route.children) && route.children.some((child) => !child.hidden)
}

function collectLeafItems(routes: RuntimeRouteRecord[], parentPath = ''): RuntimeMenuItem[] {
  const items: RuntimeMenuItem[] = []

  routes.forEach((route) => {
    if (route.hidden) return

    const fullPath = resolvePath(parentPath, route.path)
    if (hasVisibleChildren(route)) {
      items.push(...collectLeafItems(route.children || [], fullPath))
      return
    }

    const title = route.meta?.title?.trim()
    if (!title) return

    items.push({
      path: fullPath,
      title,
      iconClass: resolveIconClass(route.meta?.icon),
    })
  })

  return items
}

export function buildMenuGroupsFromRuntimeRouters(routes: RuntimeRouteRecord[]): RuntimeMenuGroup[] {
  return routes
    .filter((route) => !route.hidden)
    .map((route) => {
      const fullPath = resolvePath('', route.path)
      const title = route.meta?.title?.trim() || route.path || '未命名分组'
      const children = hasVisibleChildren(route)
        ? collectLeafItems(route.children || [], fullPath)
        : collectLeafItems([route], '')

      return {
        key: fullPath.replace(/\//g, '-') || 'root',
        title,
        children,
      }
    })
    .filter((group) => group.children.length > 0)
}

export function collectRuntimePaths(routes: RuntimeRouteRecord[]): string[] {
  return collectLeafItems(routes).map((item) => item.path)
}

export function resolveRuntimeHomePath(routes: RuntimeRouteRecord[]): string {
  return collectRuntimePaths(routes)[0] || '/dashboard'
}

export function hasRuntimeRouteAccess(routes: RuntimeRouteRecord[], targetPath: string): boolean {
  const normalizedTarget = normalizePath(targetPath)
  return collectRuntimePaths(routes).some((path) => {
    return normalizedTarget === path || normalizedTarget.startsWith(`${path}/`)
  })
}
