/**
 * Translate a backend-resolved dict label by i18nKey companion field.
 *
 * Pattern (see admin.json admin.dict.* / admin.role.* etc.):
 *   - backend row 同时返回 dict_label 字段 (zh) + i18nKey 字段
 *   - frontend 调用: tDict(record, 'category') → 优先 record.categoryI18nKey 翻译；缺则 fallback record.categoryText / categoryLabel
 *
 * 业务字段（用户输入、状态比较）不动 record 原值；仅显示层翻译。
 */
import { useI18n } from 'vue-i18n'

export function useI18nDict(namespace: 'admin.dict' | 'admin.role' | 'admin.menu' = 'admin.dict') {
  const { t, te } = useI18n()

  const tByI18nKey = (key?: string | null, fallback?: string | null): string => {
    if (!key) return fallback ?? '-'
    const fullKey = `${namespace}.${key}`
    return te(fullKey) ? (t(fullKey) as string) : (fallback ?? '-')
  }

  /**
   * 优先取 record[`${field}I18nKey`] 翻译；缺则 fallback record[fallbackField]
   * 例: tDict(record, 'category') → 看 record.categoryI18nKey；fallback record.categoryText
   */
  const tDict = (record: any, field: string, fallbackFieldOverride?: string): string => {
    if (!record) return '-'
    const i18nKey = record[`${field}I18nKey`]
    const fallbackField = fallbackFieldOverride ?? (() => {
      // categoryI18nKey -> categoryText (positions) 或 categoryLabel (applications)
      if (record[`${field}Text`] !== undefined) return `${field}Text`
      if (record[`${field}Label`] !== undefined) return `${field}Label`
      return field
    })()
    const fallback = record[fallbackField] || record[field]
    return tByI18nKey(i18nKey, fallback)
  }

  return { tByI18nKey, tDict }
}
