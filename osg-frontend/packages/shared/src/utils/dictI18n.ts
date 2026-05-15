/**
 * Shared i18n resolver for admin dict registry display strings.
 *
 * Backend emits stable i18n keys (e.g. `dict_group_job`, `dict_type_company_name`)
 * alongside the raw Chinese label; frontend calls the resolver, which translates
 * when a locale mapping exists and falls back to the original label otherwise.
 */

import type { TranslateFn } from './menuI18n'

export interface DictDisplaySource {
  /** Raw Chinese label from DB. Acts as fallback when i18nKey is absent / untranslated. */
  label?: string
  /** Stable backend-derived i18n key (e.g. "dict_group_job"). */
  i18nKey?: string
}

export function resolveDictDisplayName(source: DictDisplaySource, t: TranslateFn): string {
  const key = source.i18nKey?.trim()
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) {
      return translated
    }
  }
  return source.label || ''
}
