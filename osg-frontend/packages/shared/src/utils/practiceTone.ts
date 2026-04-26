/**
 * 模拟应聘 (mock-practice) 相关的颜色 / 色调工具
 *
 * SSOT：以原型 prototype/assistant.html + lead-mentor.html 模拟应聘列表「类型」列为基准
 * 三端原型完全一致（asst + LM 视觉规范一致）
 *
 * practiceType enum / label：
 * - 'mock_interview' / '模拟面试' → info 蓝（#DBEAFE/#1E40AF）+ mdi-account-voice
 * - 'relation_test' / '人际关系测试' → warning 黄（#FEF3C7/#92400E）+ mdi-account-group
 * - 'communication_test' / '沟通测试' → warning 黄（asst 独有，归并视觉到 relation_test）+ mdi-account-group
 * - 'midterm' / 'midterm_exam' / '期中考试' → 紫底白（#8B5CF6/#fff）+ mdi-file-document-edit
 * - 其他 / 空 → fallback 到 mock_interview（与 mentor 现实现 default 'blue' 一致）
 */

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
 *
 * 接受输入：
 * - 英文 enum：mock_interview / relation_test / communication_test / midterm / midterm_exam
 * - 中文 label：模拟面试 / 人际关系测试 / 沟通测试 / 期中考试
 * - 大小写不敏感，前后空白自动 trim
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
 *
 * 视觉规则（按原型 SSOT）：
 * - mock_interview → 蓝（info）
 * - relation_test / communication_test → 黄（warning，asst communication_test 视觉归并）
 * - midterm → 紫底白
 * - unknown / 其他 → fallback 到 mock_interview（蓝）
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
 * 按 practiceType 解析中文展示文案
 *
 * 规则：
 * - mock_interview → '模拟面试'
 * - relation_test → '人际关系测试'
 * - communication_test → '沟通测试'（asst 独有保留）
 * - midterm → '期中考试'
 * - unknown / 其他 → 原值（fallback to raw input）
 */
export function resolvePracticeTypeLabel(value?: string | null): string {
  const raw = String(value ?? '').trim()
  const normalized = normalizePracticeType(raw)
  if (normalized === 'mock_interview') return '模拟面试'
  if (normalized === 'relation_test') return '人际关系测试'
  if (normalized === 'communication_test') return '沟通测试'
  if (normalized === 'midterm') return '期中考试'
  return raw
}

/**
 * 按 practiceType 解析 mdi 图标 class 名（不含 'mdi' 前缀）
 *
 * 规则（与原型 SSOT 一致）：
 * - mock_interview → 'mdi-account-voice'
 * - relation_test / communication_test → 'mdi-account-group'
 * - midterm → 'mdi-file-document-edit'
 * - unknown → '' （不渲染图标）
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
