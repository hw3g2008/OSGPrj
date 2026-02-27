import { http } from '@osg/shared/utils'

// ========== 类型定义 ==========

/** 统计卡片数据 (FR-006.1) */
export interface DashboardStats {
  studentCount: number
  mentorCount: number
  pendingClassHours: number
  pendingSettlement: number
  pendingExpense: number
  // 副信息
  newStudentsThisMonth: number
  leadMentorCount: number
  mentorOnlyCount: number
  earliestPendingDays: number
  settlementReport: number
  settlementOther: number
  expenseTotal: number
}

/** 待处理事项 (FR-006.2) */
export interface TodoItem {
  label: string
  count: number
  route: string
}

/** 最近活动 (FR-006.3) */
export interface ActivityItem {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  time: string
  detail: string
}

/** 学员状态分布 (FR-006.5) */
export interface StudentStatusData {
  activeNormal: number
  activeFrozen: number
  done: number
  total: number
}

/** 本月统计 (FR-006.6) */
export interface MonthlyStatsData {
  newStudents: number
  newContracts: number
  approvedClassHours: number
  classHoursConsumed: number
  settledAmount: number
}

// ========== API 函数 ==========

/** 获取5个统计卡片数据 */
export function getDashboardStats() {
  return http.get<DashboardStats>('/dashboard/stats')
}

/** 获取待处理事项列表 */
export function getDashboardTodos() {
  return http.get<TodoItem[]>('/dashboard/todos')
}

/** 获取最近5条操作日志 */
export function getDashboardActivities() {
  return http.get<ActivityItem[]>('/dashboard/activities')
}

/** 获取学员状态分布 */
export function getStudentStatus() {
  return http.get<StudentStatusData>('/dashboard/student-status')
}

/** 获取本月统计 */
export function getMonthlyStats() {
  return http.get<MonthlyStatsData>('/dashboard/monthly')
}
