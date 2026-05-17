import type { Composer } from 'vue-i18n'

// Reverse-lookup helper: takes the Chinese backend label from sys_menu.menu_name
// (e.g. "学员列表" / "学员中心" / "首页") and returns the localized label. Search order:
//   1. admin.layout.menus.*  (二级菜单 / leaf items)
//   2. admin.layout.sections.* (顶级分组 e.g. 学员中心 / 求职中心)
//   3. admin.layout.home (single key for the 首页 standalone entry)
//
// Falls back to the raw zh label when no key matches, so newly added menus
// still render (in Chinese) without breaking the page.
export function createMenuLabelTranslate(i18n: Pick<Composer, 't' | 'locale' | 'messages'>) {
  return (zhLabel: string): string => {
    if (i18n.locale.value === 'zh') return zhLabel
    const zhLayout: any = i18n.messages.value?.zh?.admin?.layout
    if (!zhLayout) return zhLabel
    for (const [key, value] of Object.entries(zhLayout.menus || {})) {
      if (value === zhLabel) return i18n.t(`admin.layout.menus.${key}`)
    }
    for (const [key, value] of Object.entries(zhLayout.sections || {})) {
      if (value === zhLabel) return i18n.t(`admin.layout.sections.${key}`)
    }
    if (zhLayout.home === zhLabel) return i18n.t('admin.layout.home')
    return zhLabel
  }
}
