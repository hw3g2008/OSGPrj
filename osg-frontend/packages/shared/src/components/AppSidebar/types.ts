/**
 * AppSidebar 数据接口（M0.4 Step 4.1）
 *
 * SSOT 来源：docs/architecture/shared-infrastructure/m0.4-step3-app-sidebar-extraction-plan.md 附录 A
 * 三端各端 navigationGroups 结构按此 shape 提供，导航/徽章/隐藏规则由端控制。
 */

export interface NavigationItem {
  /** 路由路径，如 '/career/positions' */
  path: string
  /** 显示文字，如 '岗位库 Positions' */
  label: string
  /** 图标 class，如 'mdi-briefcase-outline'（不含 'mdi ' 前缀，由模板补 'mdi'） */
  iconClass: string
  /** 高亮触发前缀列表 */
  activePaths: string[]
  /** 可选徽章数字。仅在 badge > 0 时渲染数字徽章；undefined / 0 不显示 */
  badge?: number
  /**
   * 可选隐藏。true 表示该 item 根本不渲染（DOM 不存在）。
   * 注："敬请期待"等"显示+点击拦截"的场景不要用 hidden，
   * 而应在端的 nav emit handler 内拦截（参考 LM 的 AVAILABLE_NAVIGATION_PATHS）。
   */
  hidden?: boolean
}

export interface NavigationGroup {
  /** 分组标题，如 '求职辅导 Career' */
  title: string
  items: NavigationItem[]
}

export interface AppSidebarProps {
  // === 必传 ===
  navigationGroups: NavigationGroup[]
  displayName: string
  userInitials: string
  roleLabel: string
  currentPath: string

  // === 可选（有默认值）===
  logoTitle?: string
  logoSubtitle?: string
  userId?: string | number
  homePath?: string
  profilePath?: string
}

export interface AppSidebarEmits {
  /** 用户点击 nav-item，path 作为 payload；端可拦截（如 LM 的"敬请期待" toast） */
  (e: 'nav', path: string): void
  /** 用户点击"个人设置"入口 */
  (e: 'profile-click'): void
  /** 用户已在 Modal.confirm 上点击"确定"退出登录；端只需执行 clearAuth + 跳转 */
  (e: 'logout'): void
}
