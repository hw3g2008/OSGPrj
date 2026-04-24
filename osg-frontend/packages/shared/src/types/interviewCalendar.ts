/**
 * 共享面试日历类型
 *
 * 各业务端（assistant/lead-mentor/mentor）在 `job-overview` 页面使用的面试/辅导
 * 事件数据，统一走此类型。各端 API 返回的记录只需保证核心字段存在即可 extend。
 */

export type CalendarTone = 'today' | 'danger' | 'info' | 'default'

/** 面试日历事件（所有端共享最小集） */
export interface InterviewEvent {
  id: number
  /** ISO 8601 时间串，如 "2026-04-23 15:00:00"。后端 calendar endpoint 过滤了 null，但复用到 list 场景时可能为空，故声明为可选；composable 内已兜底 */
  interviewTime?: string
  studentName?: string
  company?: string
  position?: string
  location?: string
  interviewStage?: string
  /** 辅导状态，用于色彩语义派生（`辅导中`/`coaching*` → info，其余 → danger） */
  coachingStatus?: string
  /** 其他端扩展字段自由附加 */
  [key: string]: unknown
}

/** 折叠态 7 格胶囊 */
export interface CompactDayView {
  key: string
  weekday: string
  date: string
  tagColor: string
  tagStyle: Record<string, string>
}

/** 折叠态 summary 胶囊（最多 3 条） */
export interface SummaryEventView {
  label: string
  student: string
  tagColor: string
}

/** 展开态 42 格月视图 */
export interface MonthCellView {
  label: string
  iso: string
  tone: CalendarTone
  isCurrentMonth: boolean
  hasEvent: boolean
}

/** 本周事件卡（展开态列表） */
export interface CalendarItemView extends InterviewEvent {
  tone: CalendarTone
  tag: string
  tagColor: string
  weekday: string
  dateNum: string
}
