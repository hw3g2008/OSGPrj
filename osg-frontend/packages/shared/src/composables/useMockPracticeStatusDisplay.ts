/**
 * §D.1 / D.2 模拟应聘状态派生展示（前端 SSOT）
 *
 * 输入 raw 字段（status / completedHours / plannedHours），输出统一的 5 态展示对象：
 * { value, label, tone }
 *
 * 五态（与求职申请 composable 对齐）：
 * - pending  待分配导师 (danger / red)
 * - assigned 已分配导师 (warning / orange)
 * - coaching 辅导中     (info / blue/purple)
 * - completed 已完成    (success / green)
 * - cancelled 已取消    (default / gray)
 *
 * 与后端字段口径一致：
 * - status ∈ { 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' }
 * - plannedHours: §E.1/E.2 后端 toPayload 输出（requestedMentorCount × 字典）
 *
 * 派生规则（按优先级匹配）：
 * 1. status='cancelled' → cancelled
 * 2. status='completed' → completed（终态显式）
 * 3. completedHours >= plannedHours 且 plannedHours > 0 → completed（派生）
 * 4. status='confirmed' 且 completedHours > 0 → coaching（mentor 已开始上课）
 * 5. status in ('scheduled','confirmed') → assigned（已分配但未开始）
 * 6. 兜底 → pending
 *
 * 引用方：assistant / mentor / lead-mentor / admin / student 五端 mock-practice 列表/详情页
 */
export interface MockPracticeStatusInput {
  status?: string | null
  completedHours?: number | null
  plannedHours?: number | null
}

export interface MockPracticeStatusDisplay {
  value: 'pending' | 'assigned' | 'coaching' | 'completed' | 'cancelled'
  label: string
  tone: 'danger' | 'warning' | 'info' | 'success' | 'default'
}

const LABEL_MAP: Record<MockPracticeStatusDisplay['value'], string> = {
  pending: '待分配导师',
  assigned: '已分配导师',
  coaching: '辅导中',
  completed: '已完成',
  cancelled: '已取消',
}

const TONE_MAP: Record<MockPracticeStatusDisplay['value'], MockPracticeStatusDisplay['tone']> = {
  pending: 'danger',
  assigned: 'warning',
  coaching: 'info',
  completed: 'success',
  cancelled: 'default',
}

/**
 * 派生模拟应聘展示态。
 */
export function deriveMockPracticeStatus(
  input: MockPracticeStatusInput | null | undefined,
): MockPracticeStatusDisplay {
  const status = (input?.status ?? '').toLowerCase().trim()
  const completed = toNumber(input?.completedHours)
  const planned = toNumber(input?.plannedHours)

  // 1. 已取消
  if (status === 'cancelled') return makeDisplay('cancelled')

  // 2. 已完成（显式终态）
  if (status === 'completed') return makeDisplay('completed')

  // 3. 已完成（派生：completedHours >= plannedHours 且 plannedHours > 0）
  if (planned > 0 && completed >= planned) return makeDisplay('completed')

  // 4. 辅导中（mentor 已开始上课但未完成）
  if (status === 'confirmed' && completed > 0) return makeDisplay('coaching')

  // 5. 已分配（已分配导师但未开始）
  if (status === 'scheduled' || status === 'confirmed') return makeDisplay('assigned')

  // 6. 兜底（pending 或未知）
  return makeDisplay('pending')
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function makeDisplay(value: MockPracticeStatusDisplay['value']): MockPracticeStatusDisplay {
  return { value, label: LABEL_MAP[value], tone: TONE_MAP[value] }
}

/**
 * Composable 风格 API
 */
export function useMockPracticeStatusDisplay() {
  return { deriveMockPracticeStatus }
}
