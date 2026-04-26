/**
 * 岗位页 tone 工具集（list / drilldown 共用）
 *
 * 提取自原 lead-mentor / assistant 中的 tone 解析逻辑，
 * 作为 PositionsListTable / PositionsDrilldown 共享组件的纯函数依赖。
 */

import type {
  DeadlineTone,
  IndustryTone,
  PositionTableRow,
} from '../components/positions/types'

/**
 * 由 deadline 字符串推导 deadline tone：
 * - 已过 → closed（灰删除线）
 * - 未来 7 天内 → urgent（红加粗）
 * - 否则 → normal（普通）
 *
 * @param deadline 截止时间字符串（任何 Date.parse 可识别的格式）
 * @param now      参考时间（默认 Date.now()），便于测试注入
 */
export function resolveDeadlineTone(
  deadline?: string | null,
  now: number = Date.now(),
): DeadlineTone {
  if (!deadline) return 'normal'
  const t = new Date(deadline).getTime()
  if (Number.isNaN(t)) return 'normal'
  if (t < now) return 'closed'
  if (t - now <= 7 * 24 * 60 * 60 * 1000) return 'urgent'
  return 'normal'
}

/**
 * deadline tone → class 名（与 PositionsListTable.vue 中样式一致）
 */
export function deadlineToneClass(tone?: DeadlineTone): string {
  if (tone === 'urgent') return 'osg-deadline--urgent'
  if (tone === 'closed') return 'osg-deadline--closed'
  return ''
}

/**
 * 由公司名派生 logo 文字（fallback）：
 * - 单词：取前 2 字母大写（"Goldman" → "GO"，"BMO" → "BM"）
 * - 多词：每词首字母大写拼接（"Goldman Sachs" → "GS"）
 * - 空：返回 "?"
 */
export function deriveLogoText(companyName?: string | null): string {
  const name = (companyName || '').trim()
  if (!name) return '?'
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * 取 row 显示用的 logo 文字（优先 row.logoText，缺省派生自 companyName）
 */
export function resolveLogoText(row: PositionTableRow): string {
  if (row.logoText) return row.logoText
  return deriveLogoText(row.companyName)
}

/**
 * 取 row logo 应用的 CSS class：
 * - 优先 logoColor（hex 时由 inline style 覆盖，class 留空）
 * - 否则按 industryTone 取 7 色
 */
export function resolveLogoToneClass(row: PositionTableRow): string {
  if (row.logoColor) return ''
  const tone: IndustryTone = (row.industryTone as IndustryTone) || 'slate'
  return `osg-positions-list-table__logo--${tone}`
}

/**
 * IndustryTone 是否为合法 7 色之一
 */
export function isValidIndustryTone(tone?: string): tone is IndustryTone {
  return (
    tone === 'gold' ||
    tone === 'violet' ||
    tone === 'blue' ||
    tone === 'amber' ||
    tone === 'teal' ||
    tone === 'indigo' ||
    tone === 'slate'
  )
}
