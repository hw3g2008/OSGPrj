/**
 * 学员相关的颜色 / 色调工具
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
  if (v === '1') return '冻结'
  if (v === '2') return '已结束'
  if (v === '3') return '退款'
  return '正常'
}
