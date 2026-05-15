import { http } from '../utils/request'
import {
  type ClassRecordFilters,
  type ClassRecordRow,
  type ClassRecordStats,
} from './admin/classRecord'

import {
  type ClassReportPayload,
  type ReferenceType,
  type StudentOption,
  type ReferenceOption,
} from '../types/classReport'
import {
  type LeadMentorClassRecordMentorGroup,
  getLeadMentorJobOverviewDetail,
} from './jobOverview'

export type StudentClassRecordDetailKind = 'coaching' | 'mock' | 'networking' | 'midterm'

export interface StudentClassRecordNetworkingScore {
  itemName: string
  score: number
  maxScore: number
  label?: string
}

export interface StudentClassRecord {
  recordId: string
  coachingType: string
  coachingDetail: string
  coachingTagColor: string
  courseContent: string
  contentTagColor: string
  mentor: string
  mentorRole: string
  classDate: string
  classDateRaw: string
  isNew: boolean
  duration: string
  ratingScoreValue: string
  ratingLabel: string
  ratingColor: string
  actionLabel: string
  actionKind: 'rate' | 'detail'
  detailTitle: string
  detailKind?: StudentClassRecordDetailKind
  tab: 'pending' | 'evaluated'
  ratingTags: string
  ratingFeedback: string
  newBadgeLabel: string

  mentorFeedback?: string

  mockPurpose?: string
  mockTopics?: string
  mockImprovements?: string
  mentorRatingEmoji?: string
  mentorRatingLabel?: string

  networkingScores?: StudentClassRecordNetworkingScore[]
  mentorRecommendation?: string

  examScoreLabel?: string
  examQuestions?: string
  studentProgressSummary?: string
}

export function listStudentClassRecords(): Promise<{ records: StudentClassRecord[] }> {
  return http.get('/student/class-records/list')
}

export interface StudentClassRecordsMeta {
  pageSummary: {
    titleZh: string
    titleEn: string
    subtitle: string
  }
  /**
   * "新增课程记录"提醒 banner 的静态文案。
   * 注意：动态字段（导师名 / 待评价记录数）由前端基于 listStudentClassRecords
   * 返回的 records 中 isNew=true 的条目自行计算，不通过此接口下发，
   * 以保证 banner 与下方表格基于同一数据源、永不漂移。
   */
  reminderBanner: {
    iconLabel: string
    title: string
    leadText: string
    middleText: string
    suffixText: string
    ctaLabel: string
  }
  tabDefinitions: Array<{
    key: 'all' | 'pending' | 'evaluated'
    label: string
    displayLabel: string
    count: number
  }>
  filters: {
    keywordPlaceholder: string
    coachingTypePlaceholder: string
    courseContentPlaceholder: string
    timeRangePlaceholder: string
    resetLabel: string
    coachingTypeOptions: Array<{ value: string; label: string; color?: string }>
    courseContentOptions: Array<{ value: string; label: string; color?: string }>
    timeRangeOptions: Array<{ value: string; label: string }>
  }
  tableHeaders: {
    recordId: string
    coachingDetail: string
    courseContent: string
    mentor: string
    classDate: string
    duration: string
    rating: string
    action: string
  }
  detailDialog: {
    closeLabel: string
    confirmLabel: string
    fields: {
      recordId: string
      coachingDetail: string
      courseContent: string
      mentor: string
      classDate: string
      duration: string
    }
  }
  ratingDialog: {
    title: string
    scoreLabel: string
    tagLabel: string
    feedbackLabel: string
    tagPlaceholder: string
    feedbackPlaceholder: string
    cancelLabel: string
    submitLabel: string
    successMessage: string
    tagOptions: Array<{ value: string; label: string }>
  }
}

export function getStudentClassRecordsMeta(): Promise<StudentClassRecordsMeta> {
  return http.get('/student/class-records/meta')
}

export function rateStudentClassRecord(data: {
  recordId: string
  rating: number
  tags: string[]
  feedback: string
}): Promise<void> {
  return http.post('/student/class-records/rate', data)
}

export interface LeadMentorClassRecordCreatePayload {
  studentId: number
  classDate: string
  durationHours: number
  courseType: string
  classStatus: string
  feedbackContent: string
  topics?: string
  comments?: string
  /** §A.0.4 关联的求职辅导 application_id（job-coaching 课程类型时） */
  applicationId?: number
  /** §A.0.4 关联的模拟应聘 practice_id（mock-* 课程类型时） */
  practiceId?: number
}

export interface LeadMentorClassRecordCreateResponse {
  recordId: number
  mentorId: number
  mentorName: string
  studentId: number
  studentName: string
  courseType: string
  courseSource: string
  classStatus: string
  classDate: string
  durationHours: number
  weeklyHours: number
  topics?: string | null
  comments?: string | null
  feedbackContent: string
  status: string
  submittedAt: string
}

export function createLeadMentorClassRecord(data: LeadMentorClassRecordCreatePayload) {
  return http.post<LeadMentorClassRecordCreateResponse>('/lead-mentor/class-records', data, {
    skipErrorMessage: true,
  })
}

export type LeadMentorClassRecordFilters = ClassRecordFilters
export type LeadMentorClassRecordRow = ClassRecordRow
export type LeadMentorClassRecordStats = ClassRecordStats

const toLeadMentorParams = (filters: LeadMentorClassRecordFilters = {}) => {
  const params: Record<string, string> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value)
    }
  })
  return params
}

export function getLeadMentorClassRecordList(filters: LeadMentorClassRecordFilters = {}) {
  return http.get<{ rows: LeadMentorClassRecordRow[]; total: number }>(
    '/lead-mentor/class-records/list',
    {
      params: toLeadMentorParams(filters),
      timeout: 60000,
    },
  )
}

export function getLeadMentorClassRecordStats(filters: LeadMentorClassRecordFilters = {}) {
  return http.get<LeadMentorClassRecordStats>(
    '/lead-mentor/class-records/stats',
    {
      params: toLeadMentorParams(filters),
      timeout: 60000,
    },
  )
}

// ============================================================================
// §4A.1 三端共用上报 / 学员下拉 / 关联申请下拉 / 详情接口
// 来源：docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md
// ============================================================================

/**
 * 三端共用上报课消的端枚举。
 * - mentor       → /mentor/class-records
 * - lead-mentor  → /lead-mentor/class-records
 * - assistant    → /assistant/class-records
 */
export type ClassReportEnd = 'mentor' | 'lead-mentor' | 'assistant'

const resolveClassReportEndPrefix = (end: ClassReportEnd): string => {
  switch (end) {
    case 'mentor':
      return '/mentor/class-records'
    case 'lead-mentor':
      return '/lead-mentor/class-records'
    case 'assistant':
      return '/assistant/class-records'
    default: {
      // 防御非法运行时调用（TS 编译期已拒绝非三端枚举）
      throw new Error('Unsupported class report end')
    }
  }
}

/**
 * §4A.1 三端共用上报课消
 *
 * 路由映射：
 * - mentor       → POST /mentor/class-records
 * - lead-mentor  → POST /lead-mentor/class-records
 * - assistant    → POST /assistant/class-records
 *
 * payload 字段保持 camelCase，由 request 层按既有约定处理。
 */
export function submitClassReport(
  end: ClassReportEnd,
  payload: ClassReportPayload,
): Promise<{ recordId: number }> {
  const prefix = resolveClassReportEndPrefix(end)
  // backend OsgClassRecord.feedbackContent 是 String（DB LONGTEXT）；
  // ClassReportPayload 用对象便于类型化构造，在 wire 边界统一转 JSON 字符串。
  const fc = payload.feedbackContent
  const wirePayload = {
    ...payload,
    feedbackContent:
      fc != null && typeof fc === 'object' ? JSON.stringify(fc) : fc,
  }
  return http.post<{ recordId: number }>(prefix, wirePayload, {
    skipErrorMessage: true,
  })
}

interface RawListResponse<T> {
  rows?: T[]
  list?: T[]
  data?: T[] | { rows?: T[]; list?: T[] }
}

const normalizeRows = <T>(resp: unknown): T[] => {
  if (!resp) {
    return []
  }
  if (Array.isArray(resp)) {
    return resp as T[]
  }
  const obj = resp as RawListResponse<T>
  if (Array.isArray(obj.rows)) {
    return obj.rows
  }
  if (Array.isArray(obj.list)) {
    return obj.list
  }
  if (obj.data) {
    if (Array.isArray(obj.data)) {
      return obj.data
    }
    if (Array.isArray((obj.data as { rows?: T[] }).rows)) {
      return (obj.data as { rows: T[] }).rows
    }
    if (Array.isArray((obj.data as { list?: T[] }).list)) {
      return (obj.data as { list: T[] }).list
    }
  }
  return []
}

/**
 * §4A.1 学员下拉源（按 end 切换路由）。
 *
 * 兼容后端三种包装：array / { rows } / { list }，统一返回 StudentOption[]。
 * 空状态文案不在 API 层硬编码，由 useStudentScopeFinder 负责。
 */
export async function getReportableStudents(
  end: ClassReportEnd,
): Promise<StudentOption[]> {
  const prefix = resolveClassReportEndPrefix(end)
  const resp = await http.get<unknown>(`${prefix}/reportable-students`)
  const rows = normalizeRows<Record<string, unknown>>(resp)
  return rows
    .map((row) => {
      const studentId = Number(row.studentId ?? row.student_id ?? row.id ?? 0)
      const studentName = String(
        row.studentName ?? row.student_name ?? row.name ?? '',
      )
      const disabled = row.disabled as boolean | undefined
      const accountStatusRaw = row.accountStatus ?? row.account_status
      const accountStatus =
        accountStatusRaw == null ? undefined : String(accountStatusRaw)
      const isBlacklisted = Boolean(row.isBlacklisted ?? row.is_blacklisted ?? false)
      return { studentId, studentName, disabled, accountStatus, isBlacklisted }
    })
    .filter((item) => item.studentId > 0)
}

const buildReferenceLabel = (
  refType: ReferenceType,
  raw: Record<string, unknown>,
): string => {
  if (refType === 'job_coaching' || refType === 'application') {
    const company = raw.companyName ?? raw.company ?? ''
    const position = raw.positionName ?? raw.position ?? ''
    const stage = raw.currentStage ?? raw.stage ?? ''
    const interviewTime = raw.interviewTime ?? raw.interview_time ?? ''
    return [company, position, stage, interviewTime].filter(Boolean).join(' / ')
  }
  // mock / relation / communication
  const type = raw.type ?? raw.subType ?? ''
  const submittedAt = raw.submittedAt ?? raw.submitted_at ?? ''
  const status = raw.status ?? ''
  return [type, submittedAt, status].filter(Boolean).join(' / ')
}

/**
 * §4A.1 关联申请候选项下拉。
 *
 * - studentId 为空或 <=0 时不发请求并返回 []，避免脏请求
 * - label 优先使用后端返回；缺失时按 refType 回退拼接
 */
export async function getReferenceCandidates(
  end: ClassReportEnd,
  studentId: number,
  refType: ReferenceType,
): Promise<ReferenceOption[]> {
  if (!studentId || studentId <= 0) {
    return []
  }
  const prefix = resolveClassReportEndPrefix(end)
  // §C7 修复：后端 controller @RequestParam 名为 referenceType（不是 refType），
  // 之前传 refType 后端收不到 → service 立即返回 [] → 前端下拉只剩 prefill 的裸 ID。
  // 同时保留 refType 别名兼容，万一某天后端改了参数名也不破坏。
  const resp = await http.get<unknown>(`${prefix}/reference-candidates`, {
    params: { studentId, referenceType: refType, refType },
  })
  const rows = normalizeRows<Record<string, unknown>>(resp)
  return rows
    .map((row) => {
      const referenceId = Number(
        row.referenceId ?? row.reference_id ?? row.id ?? 0,
      )
      const backendLabel = row.label as string | undefined
      const label =
        backendLabel && backendLabel.length > 0
          ? backendLabel
          : buildReferenceLabel(refType, row)
      const disabled = row.disabled as boolean | undefined
      return {
        referenceType: refType,
        referenceId,
        label,
        disabled,
        raw: row,
      }
    })
    .filter((item) => item.referenceId > 0)
}

/**
 * §4A.1 上报课消详情（按导师分组）。
 *
 * 复用 getLeadMentorJobOverviewDetail，取 classRecordsByMentor 字段。
 * - applicationId 非法（空或 <=0）→ 直接返回 []
 * - 后端返回无 classRecordsByMentor → 返回 []
 *
 * 该函数供 ClassRecordDetailDrawer / S-054 详情查看复用，不引入 admin 端依赖。
 */
export async function getClassReportDetail(
  applicationId: number,
): Promise<LeadMentorClassRecordMentorGroup[]> {
  if (!applicationId || applicationId <= 0) {
    return []
  }
  const detail = await getLeadMentorJobOverviewDetail(applicationId)
  return detail?.classRecordsByMentor ?? []
}
