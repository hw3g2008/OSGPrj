/**
 * 模拟应聘 (mock-practice) 相关的颜色 / 色调工具
 *
 * i18n-skip-file: 中文 enum 字面量是后端兼容匹配模式，不是 UI 文案；展示文案走 i18n。
 */

import { i18n } from '../i18n'

export type PracticeTypeNormalized =
  | 'mock_interview'
  | 'relation_test'
  | 'communication_test'
  | 'midterm'
  | 'unknown'

export type PracticeTypeToneClass =
  | 'osg-practice-type-tag--mock-interview'
  | 'osg-practice-type-tag--relation-test'
  | 'osg-practice-type-tag--midterm'

/**
 * 标准化 practiceType 字符串为枚举（兼容英文 enum + 中文 label）
 */
export function normalizePracticeType(
  value?: string | null,
): PracticeTypeNormalized {
  const raw = String(value ?? '').trim()
  const v = raw.toLowerCase()
  if (v === 'mock_interview' || raw === '模拟面试') return 'mock_interview'
  if (v === 'relation_test' || raw === '人际关系测试') return 'relation_test'
  if (v === 'communication_test' || raw === '沟通测试') return 'communication_test'
  if (v === 'midterm' || v === 'midterm_exam' || raw === '期中考试') return 'midterm'
  return 'unknown'
}

/**
 * 按 practiceType 解析 tone class（CSS class 后缀）
 */
export function resolvePracticeTypeToneClass(
  value?: string | null,
): PracticeTypeToneClass {
  const normalized = normalizePracticeType(value)
  if (normalized === 'midterm') return 'osg-practice-type-tag--midterm'
  if (normalized === 'relation_test' || normalized === 'communication_test') {
    return 'osg-practice-type-tag--relation-test'
  }
  return 'osg-practice-type-tag--mock-interview'
}

/**
 * 按 practiceType 解析展示文案（已 i18n）。
 */
export function resolvePracticeTypeLabel(value?: string | null): string {
  const raw = String(value ?? '').trim()
  const normalized = normalizePracticeType(raw)
  const t = i18n.global.t as unknown as (k: string) => string
  if (normalized === 'mock_interview') return t('common.shared.practiceType.mockInterview')
  if (normalized === 'relation_test') return t('common.shared.practiceType.relation')
  if (normalized === 'communication_test') return t('common.shared.practiceType.communication')
  if (normalized === 'midterm') return t('common.shared.practiceType.midterm')
  return raw
}

/**
 * 按 practiceType 解析 mdi 图标 class 名（不含 'mdi' 前缀）
 */
export function resolvePracticeTypeIcon(value?: string | null): string {
  const normalized = normalizePracticeType(value)
  if (normalized === 'mock_interview') return 'mdi-account-voice'
  if (normalized === 'relation_test' || normalized === 'communication_test') {
    return 'mdi-account-group'
  }
  if (normalized === 'midterm') return 'mdi-file-document-edit'
  return ''
}
