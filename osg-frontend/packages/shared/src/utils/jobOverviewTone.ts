/**
 * 求职总览 (job-overview) 相关的颜色 / 色调工具
 *
 * SSOT：以 Assistant job-overview 为基准的 9 条阶段规则 + 辅导状态规则
 * 供三端 (Assistant / Lead-Mentor / Mentor) 共用，保证视觉一致
 *
 * i18n-skip-file: 此文件无 UI 文案输出，仅返回 color 枚举字符串；中文字符串"拒绝"
 * "放弃""投递""辅导""待""新"是与后端字段做子串匹配的 PATTERN，非展示文案，按
 * glossary §4 不做 t() 化。
 */

/**
 * 按面试阶段字符串解析 antd Tag 的 color
 *
 * 规则（按优先级匹配）：
 * - offer → green
 * - reject / 拒绝 → red
 * - withdrawn / 放弃 → default
 * - case / super → orange
 * - first / second / final / round → gold
 * - hirevue / assessment → blue
 * - 投递 → purple
 * - 默认 → blue
 */
export function resolveStageColor(stage?: string | null): string {
  const s = (stage || '').toLowerCase()
  if (s.includes('offer')) return 'green'
  if (s.includes('reject') || s.includes('拒绝')) return 'red'
  if (s.includes('withdrawn') || s.includes('放弃')) return 'default'
  if (s.includes('case') || s.includes('super')) return 'orange'
  if (
    s.includes('first') ||
    s.includes('second') ||
    s.includes('final') ||
    s.includes('round')
  ) {
    return 'gold'
  }
  if (s.includes('hirevue') || s.includes('assessment')) return 'blue'
  if (s.includes('投递')) return 'purple'
  return 'blue'
}

/**
 * 按辅导状态字符串解析 antd Tag 的 color
 *
 * SSOT：以 Assistant 端 coachingColor() 为基准
 *
 * 规则（按优先级匹配，大小写不敏感）：
 * - 辅导 / coaching → purple
 * - 待 / pending → orange
 * - 新 / new → red
 * - 默认 → default
 *
 * 备注：
 * - LM 端有 stageUpdated → blue 修饰，但 LM 用 <strong> 而非 <a-tag>，不影响本函数
 * - Mentor 端的 'new' / 'coaching' enum 值通过 includes 自然命中
 */
export function resolveCoachingStatusColor(status?: string | null): string {
  const s = (status || '').toLowerCase().trim()
  if (s.includes('辅导') || s.includes('coach')) return 'purple'
  if (s.includes('待') || s.includes('pending')) return 'orange'
  if (s.includes('新') || s.includes('new')) return 'red'
  return 'default'
}

/**
 * 学员头像背景色（SSOT 默认 palette）
 *
 * SSOT：以 Assistant 端 resolveAvatarColor() 为基准，4 色循环
 * - palette: ['#2563eb', '#7c3aed', '#0891b2', '#ea580c']
 * - seed = (name || 'assistant').length % 4
 *
 * LM/Mentor 如有自定义颜色规则，由各端传 backgroundColor prop 覆盖。
 */
export const STUDENT_AVATAR_PALETTE: readonly string[] = [
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
]

export function resolveAvatarColor(name?: string | null): string {
  const raw = String(name ?? '').trim() || 'assistant'
  const seed = raw.length % STUDENT_AVATAR_PALETTE.length
  return STUDENT_AVATAR_PALETTE[seed]
}
