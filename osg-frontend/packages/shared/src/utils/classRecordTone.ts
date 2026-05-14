/**
 * 课程记录 (class-records) 相关的颜色 / 色调工具
 *
 * SSOT：以原型 prototype/assistant.html + lead-mentor.html 课程记录列表「审核状态」列为基准
 * 三端原型完全一致：pending / approved / rejected
 *
 * status enum：
 * - 'pending' → 待审核（warning，#FEF3C7/#92400E 棕黄）
 * - 'approved' → 已通过（success，#D1FAE5/#065F46 绿）
 * - 'rejected' → 已驳回（danger，#FEE2E2/#991B1B 红）
 * - 其他 / 空 / null / undefined → fallback 到 pending（与 asst 现实现 normalizeStatus 一致）
 */
import { i18n } from '../i18n'

export type ClassRecordStatusToneClass =
  | 'osg-class-record-status-tag--pending'
  | 'osg-class-record-status-tag--approved'
  | 'osg-class-record-status-tag--rejected'

/**
 * 标准化 status 字符串为三态枚举
 *
 * 与 asst class-records 现实现 normalizeStatus() 一致：
 * - 'approved' → 'approved'
 * - 'rejected' → 'rejected'
 * - 其他 (含 'pending' / 空 / null / undefined / 任意值) → 'pending'
 */
export function normalizeClassRecordStatus(
  status?: string | null,
): 'pending' | 'approved' | 'rejected' {
  const v = String(status ?? '').trim().toLowerCase()
  if (v === 'approved') return 'approved'
  if (v === 'rejected') return 'rejected'
  return 'pending'
}

/**
 * 按 status 字符串解析 tone class（CSS class 后缀）
 *
 * 规则：
 * - 'approved' → approved（成功 / 绿）
 * - 'rejected' → rejected（驳回 / 红）
 * - 其他 / 空 → pending（待审核 / 棕）
 */
export function resolveClassRecordStatusToneClass(
  status?: string | null,
): ClassRecordStatusToneClass {
  const normalized = normalizeClassRecordStatus(status)
  if (normalized === 'approved') return 'osg-class-record-status-tag--approved'
  if (normalized === 'rejected') return 'osg-class-record-status-tag--rejected'
  return 'osg-class-record-status-tag--pending'
}

/**
 * 按 status 字符串解析中文展示文案
 *
 * 规则（与原型 SSOT + asst/mentor 现实现一致）：
 * - 'approved' → '已通过'
 * - 'rejected' → '已驳回'
 * - 其他 / 空 → '待审核'
 */
export function resolveClassRecordStatusLabel(status?: string | null): string {
  const normalized = normalizeClassRecordStatus(status)
  if (normalized === 'approved') return i18n.global.t('approved')
  if (normalized === 'rejected') return i18n.global.t('rejected_3')
  return i18n.global.t('pending_review')
}
