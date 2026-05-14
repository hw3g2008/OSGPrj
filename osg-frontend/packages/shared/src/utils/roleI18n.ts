/**
 * Shared i18n resolver for sys_role display strings (role name and description).
 *
 * Backend emits optional `i18nKey` / `remarkI18nKey` for system-managed roles
 * (super_admin, clerk, etc.). User-defined roles leave these null, so the
 * resolver falls back to the raw Chinese name / remark straight from the DB.
 *
 * This mirrors the menuI18n / dictI18n resolvers for a uniform i18n SSOT.
 */

import type { TranslateFn } from './menuI18n'

export interface RoleNameSource {
  /** Raw role_name from DB. Used as fallback when i18nKey is absent / untranslated. */
  roleName?: string | null
  /** Stable backend-emitted i18n key (e.g. "role_super_admin"). Null for user-defined roles. */
  i18nKey?: string | null
}

export interface RoleRemarkSource {
  /** Raw remark from DB. Used as fallback when remarkI18nKey is absent / untranslated. */
  remark?: string | null
  /** Stable backend-emitted i18n key for the description. Null for user-defined roles. */
  remarkI18nKey?: string | null
}

export function resolveRoleDisplayName(source: RoleNameSource, t: TranslateFn): string {
  const key = source.i18nKey?.trim()
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) {
      return translated
    }
  }
  return source.roleName || ''
}

export function resolveRoleDescription(source: RoleRemarkSource, t: TranslateFn): string {
  const key = source.remarkI18nKey?.trim()
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) {
      return translated
    }
  }
  return source.remark || ''
}
