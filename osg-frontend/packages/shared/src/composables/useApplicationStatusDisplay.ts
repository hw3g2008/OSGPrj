/**
 * §D.1 / D.2 求职申请状态派生展示（前端 SSOT）
 *
 * 输入 raw 字段（assignStatus / coachingStatus），输出统一的 5 态展示对象：
 * { value, label, tone }
 *
 * 五态：
 * - pending  待分配导师 (danger / red)
 * - assigned 已分配导师 (warning / orange)
 * - coaching 辅导中     (info / blue/purple)
 * - completed 已完成    (success / green)  — 求职申请暂不进入此态
 * - cancelled 已取消    (default / gray)   — 求职申请暂不进入此态
 *
 * 与后端字段口径一致：
 * - assignStatus ∈ { 'pending' | 'assigned' | 'cancelled' | 'completed' }（B.1 已英文化）
 * - coachingStatus ∈ { 'none' | 'pending' | 'coaching' }（B.1 已英文化）
 *
 * 引用方：assistant / mentor / lead-mentor / admin / student 五端列表/详情页
 *
 * 与之前各端冗余 statusLabel/statusTone 字段相比，本 composable 为唯一源。
 * 后端 §D.3 要求停止输出 statusLabel/statusTone 固化字段，仅返回 raw 字段。
 */
export interface ApplicationStatusInput {
  assignStatus?: string | null
  coachingStatus?: string | null
}

export interface ApplicationStatusDisplay {
  value: 'pending' | 'assigned' | 'coaching' | 'completed' | 'cancelled'
  label: string
  tone: 'danger' | 'warning' | 'info' | 'success' | 'default'
}

const LABEL_MAP: Record<ApplicationStatusDisplay['value'], string> = {
  pending: '待分配导师',
  assigned: '已分配导师',
  coaching: '辅导中',
  completed: '已完成',
  cancelled: '已取消',
}

const TONE_MAP: Record<ApplicationStatusDisplay['value'], ApplicationStatusDisplay['tone']> = {
  pending: 'danger',
  assigned: 'warning',
  coaching: 'info',
  completed: 'success',
  cancelled: 'default',
}

/**
 * 派生求职申请展示态。
 *
 * 优先级：assignStatus 终态 > coachingStatus 终态 > 兜底 pending。
 *
 * 边界处理：
 * - 输入空对象 → pending
 * - assignStatus = 'cancelled' / 'completed' → 直出
 * - coachingStatus = 'coaching' → coaching
 * - coachingStatus = 'pending' / assignStatus = 'assigned' → assigned
 * - 其他 → pending
 */
export function deriveApplicationStatus(input: ApplicationStatusInput | null | undefined): ApplicationStatusDisplay {
  const assign = (input?.assignStatus ?? '').toLowerCase().trim()
  const coaching = (input?.coachingStatus ?? '').toLowerCase().trim()

  // 终态优先
  if (assign === 'cancelled') return makeDisplay('cancelled')
  if (assign === 'completed') return makeDisplay('completed')

  // 辅导中
  if (coaching === 'coaching') return makeDisplay('coaching')

  // 已分配（coachingStatus=assigned 表示 admin 已分配；coachingStatus=pending 等待 mentor 确认；assign=assigned 兜底）
  if (coaching === 'assigned' || coaching === 'pending' || assign === 'assigned') return makeDisplay('assigned')

  // 兜底
  return makeDisplay('pending')
}

function makeDisplay(value: ApplicationStatusDisplay['value']): ApplicationStatusDisplay {
  return { value, label: LABEL_MAP[value], tone: TONE_MAP[value] }
}

/**
 * Composable 风格 API（保持与项目其他 composable 一致）
 */
export function useApplicationStatusDisplay() {
  return { deriveApplicationStatus }
}
