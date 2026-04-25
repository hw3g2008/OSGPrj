/**
 * AppSidebar 三端共用侧边栏组件（M0.4 Step 4.1）
 *
 * 抽取背景：M0.4 整壳 MainLayout 共性 45.8% 不达 50% 门槛，但 sidebar 子壳共性 ~95%。
 * 详见 docs/architecture/shared-infrastructure/m0.4-step3-app-sidebar-extraction-plan.md
 */

export { default as AppSidebar } from './AppSidebar.vue'
export type {
  NavigationItem,
  NavigationGroup,
  AppSidebarProps,
  AppSidebarEmits,
} from './types'
