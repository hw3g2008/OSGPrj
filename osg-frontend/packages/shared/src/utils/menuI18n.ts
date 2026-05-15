export interface MenuDisplaySource {
  menuName?: string
  i18nKey?: string
}

export type TranslateFn = (key: string) => string

export function resolveMenuDisplayName(menu: MenuDisplaySource, t: TranslateFn): string {
  const key = menu.i18nKey?.trim()
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) {
      return translated
    }
  }
  return menu.menuName || ''
}
