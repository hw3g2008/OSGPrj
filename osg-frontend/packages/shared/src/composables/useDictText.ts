import { useI18n } from 'vue-i18n'

/**
 * Translate a dict value to its display label.
 *
 * Convention:
 *   - i18n key shape: `dictText.<dictType>.<dictValue>`
 *   - falls back to provided fallback string, then to raw value
 *
 * Use this for:
 *   - dict-driven categorical fields (coaching_type, region, status, etc.)
 *   - system-fixed labels (course_action.view, course_badge.new)
 *
 * DO NOT use this for user-entered free text (names, notes, descriptions) —
 * those should be rendered as raw `{{ record.field }}`.
 *
 * @example
 *   const { tDict } = useDictText()
 *   tDict('coaching_type', 'interview')        // "面试辅导" / "Interview Coaching"
 *   tDict('coaching_type', 'unknown', 'N/A')   // "N/A"
 *   tDict('coaching_type', 'unknown')          // "unknown" (raw)
 */
export function useDictText() {
  const { t, te } = useI18n()

  const tDict = (
    dictType: string,
    dictValue?: string | null,
    fallback?: string | null,
  ): string => {
    if (!dictValue) return fallback ?? ''
    const key = `dictText.${dictType}.${dictValue}`
    if (te(key)) return t(key) as string
    return fallback ?? dictValue
  }

  return { tDict }
}
