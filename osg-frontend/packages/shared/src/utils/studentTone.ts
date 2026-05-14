/**
 * 学员 (students) 相关的颜色 / 色调工具
 *
 * 包含两组：
 * 1. account_status (StudentStatusTag 用)
 * 2. remainingHours (RemainingHoursCell 用)
 *
 * SSOT：以原型 prototype/assistant.html + lead-mentor.html 学员列表「账号状态」列为基准
 * 两端原型完全一致：tag class 命名 + hex 色卡
 *
 * accountStatus enum：
 * - '0' / 空 / null / undefined → 正常（active / success）
 * - '1' → 冻结（frozen，#DBEAFE/#1E40AF 浅蓝）
 * - '2' → 已结束（ended，#F3F4F6/#6B7280 灰）
 * - '3' → 退款（refunded，#F3F4F6/#6B7280 灰，asst 现实现延用）
 */

import { i18n } from '../i18n'

export type StudentStatusToneClass =
  | 'osg-student-status-tag--active'
  | 'osg-student-status-tag--frozen'
  | 'osg-student-status-tag--ended'
  | 'osg-student-status-tag--refunded'

/**
 * 按 accountStatus 字符串解析 tone class（CSS class 后缀）
 *
 * 规则（按优先级匹配）：
 * - '1' → frozen（冻结）
 * - '2' → ended（已结束）
 * - '3' → refunded（退款）
 * - '0' / 空 / null / undefined → active（正常）
 *
 * 备注：
 * - LM 当前只识别 '1'（其他默认为正常），asst 识别完整 enum
 * - 本函数兼容两端 enum 范围
 */
export function resolveStudentStatusToneClass(
  status?: string | null,
): StudentStatusToneClass {
  const v = String(status ?? '').trim()
  if (v === '1') return 'osg-student-status-tag--frozen'
  if (v === '2') return 'osg-student-status-tag--ended'
  if (v === '3') return 'osg-student-status-tag--refunded'
  return 'osg-student-status-tag--active'
}

/**
 * 按 accountStatus 字符串解析中文展示文案
 *
 * 规则（与原型 SSOT + asst 现实现 line 310-321 一致）：
 * - '1' → '冻结'
 * - '2' → '已结束'
 * - '3' → '退款'
 * - '0' / 空 / null / undefined → '正常'
 */
export function resolveStudentStatusLabel(status?: string | null): string {
  const v = String(status ?? '').trim()
  if (v === '1') return i18n.global.t('frozen')
  if (v === '2') return i18n.global.t('ended')
  if (v === '3') return i18n.global.t('refund_2')
  return i18n.global.t('active_3')
}

// ────────────────────────────────────────────────────────────
// remainingHours (RemainingHoursCell 用)
// ────────────────────────────────────────────────────────────

/**
 * 剩余课时 (remainingHours) 的色调枚举
 *
 * SSOT：原型 prototype/assistant.html students 列表「剩余课时」列：
 * - 2.5h（< 8h）→ `color: var(--danger)` 红 (#EF4444) + font-weight:600
 * - 0h → `color: var(--muted)` 灰 (#94A3B8)
 * - ≥ 8h（推断）→ 绿 (#22C55E) 与"投递"/Offer 列绿色一致
 *
 * 阈值：≥ 8h 充足 / >0h<8h 不足 / =0h 已耗尽
 *
 * 三态规则（与 asst 现实现 line 352-361 一致）：
 * - safeValue >= 8 → success（绿）
 * - safeValue > 0 → warning（红，注意：是红不是橙；LM 现实现用橙是偏离原型）
 * - 其他（=0 / null / undefined / NaN）→ muted（灰）
 */
export type RemainingHoursToneClass =
  | 'osg-remaining-hours-cell--success'
  | 'osg-remaining-hours-cell--warning'
  | 'osg-remaining-hours-cell--muted'

/**
 * 按 remainingHours 数值解析 tone class
 *
 * 规则：
 * - >= 8 → success（绿）
 * - > 0 < 8 → warning（红，原型 SSOT --danger）
 * - = 0 / null / undefined / NaN / 负数 → muted（灰）
 */
export function resolveRemainingHoursToneClass(
  value?: number | string | null,
): RemainingHoursToneClass {
  const safeValue = Number(value ?? 0)
  if (!Number.isFinite(safeValue)) return 'osg-remaining-hours-cell--muted'
  if (safeValue >= 8) return 'osg-remaining-hours-cell--success'
  if (safeValue > 0) return 'osg-remaining-hours-cell--warning'
  return 'osg-remaining-hours-cell--muted'
}

/**
 * 格式化 remainingHours 显示文案
 *
 * 规则（与 asst + LM 现实现一致）：
 * - 整数：'8h' / '0h'
 * - 小数：'2.5h' / '8.5h' (toFixed(1))
 * - null / undefined / NaN → '0h' (与 Number(null ?? 0) 行为一致)
 */
export function formatRemainingHours(value?: number | string | null): string {
  const safeValue = Number(value ?? 0)
  const finalValue = Number.isFinite(safeValue) ? safeValue : 0
  return Number.isInteger(finalValue) ? `${finalValue}h` : `${finalValue.toFixed(1)}h`
}


