import { http } from '../utils/request'

export interface StudentPracticeRecord {
  id: string
  type: string
  typeValue: string
  typeColor: string
  content: string
  appliedAt: string
  submittedAtValue: string
  mentor: string
  mentorMeta: string
  hours: string
  feedback: string
  feedbackHint: string
  status: string
  statusValue: string
  statusColor: string
}

export interface StudentClassRequestRecord {
  id: string
  type: string
  typeValue: string
  typeColor: string
  company: string
  status: string
  statusValue: string
  statusColor: string
  submittedAt: string
  submittedAtValue: string
  courseType: string
  jobStatus: string
  remark: string
}

export interface StudentMockPracticeOverview {
  practiceRecords: StudentPracticeRecord[]
  requestRecords: StudentClassRequestRecord[]
}

export interface StudentMockPracticeOption {
  value: string
  label: string
  color?: string
  code?: string
  sort?: number
}

export interface StudentMockPracticeCard {
  id: string
  badge: string
  title: string
  description: string
  cta: string
  buttonType: 'primary' | 'default'
  buttonColor?: string
  gradient: string
  modalTitle: string
}

export interface StudentMockPracticeTab {
  key: 'all' | 'processing' | 'completed'
  label: string
  count: number
}

export interface StudentMockPracticeMeta {
  pageSummary: {
    titleZh: string
    titleEn: string
    subtitle: string
  }
  practiceSection: {
    recordsTitle: string
    keywordPlaceholder: string
    typePlaceholder: string
    statusPlaceholder: string
    rangePlaceholder: string
  }
  practiceCards: StudentMockPracticeCard[]
  practiceFilters: {
    typeOptions: StudentMockPracticeOption[]
    statusOptions: StudentMockPracticeOption[]
    rangeOptions: StudentMockPracticeOption[]
  }
  practiceForm: {
    mentorCountOptions: StudentMockPracticeOption[]
  }
  requestSection: {
    titleZh: string
    titleEn: string
    subtitle: string
    heroTitle: string
    heroSubtitle: string
    actionButtonText: string
    tableTitle: string
    keywordPlaceholder: string
    typePlaceholder: string
    statusPlaceholder: string
    modalTitle: string
  }
  requestTabs: StudentMockPracticeTab[]
  requestFilters: {
    typeOptions: StudentMockPracticeOption[]
    statusOptions: StudentMockPracticeOption[]
  }
  requestCourseOptions: Array<{
    value: string
    label: string
    badge: string
    gradient: string
    requestType: string
    requestContent: string
  }>
  requestForm: {
    companyOptions: StudentMockPracticeOption[]
    jobStatusOptions: StudentMockPracticeOption[]
  }
}

export type LeadMentorMockPracticeScope = 'pending' | 'coaching' | 'managed'

export interface LeadMentorMockPracticeStats {
  pendingCount: number
  scheduledCount: number
  completedCount: number
  cancelledCount: number
  confirmedCount?: number
  totalCount: number
}

export interface LeadMentorMockPracticeMentorOption {
  mentorId: number
  mentorName: string
  mentorBackground?: string
  hourlyRate?: number | string | null
  selected: boolean
  availabilityLabel?: string
  availableSlotCount?: number
}

export interface LeadMentorMockPracticeItem {
  practiceId: number
  studentId: number
  studentName: string
  practiceType: string
  requestContent?: string
  requestedMentorCount?: number
  preferredMentorNames?: string
  status: string
  statusLabel?: string
  mentorIds?: number[]
  mentorNames?: string
  mentorBackgrounds?: string
  scheduledAt?: string
  completedHours?: number
  completedHoursLabel?: string
  feedbackRating?: number
  feedbackSummary?: string
  submittedAt?: string
  note?: string
  isNewAssignment?: boolean
  mentorOptions?: LeadMentorMockPracticeMentorOption[]
  allowedScopes?: LeadMentorMockPracticeScope[]
  canAssign?: boolean
  canAcknowledge?: boolean
}

export interface LeadMentorMockPracticeListParams {
  scope: LeadMentorMockPracticeScope
  keyword?: string
  practiceType?: string
  status?: string
}

const toLeadMentorMockPracticeRequestParams = (
  params: Partial<LeadMentorMockPracticeListParams> = {},
) => {
  const requestParams: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    requestParams[key] = String(value)
  })

  return requestParams
}

export function getStudentMockPracticeOverview(): Promise<StudentMockPracticeOverview> {
  return http.get('/student/mock-practice/overview')
}

export function getStudentMockPracticeMeta(): Promise<StudentMockPracticeMeta> {
  return http.get('/student/mock-practice/meta')
}

export function createStudentPracticeRequest(data: {
  type: string
  reason: string
  mentorCount: string
  preferredMentor: string
  excludedMentor: string
  remark: string
}): Promise<{ requestId: number }> {
  return http.post('/student/mock-practice/practice-request', data)
}

export function createStudentClassRequest(data: {
  courseType: string
  company: string
  status: string
  remark: string
}): Promise<{ requestId: number }> {
  return http.post('/student/mock-practice/class-request', data)
}

export function getLeadMentorMockPracticeStats(
  params: Omit<Partial<LeadMentorMockPracticeListParams>, 'scope'> = {},
): Promise<LeadMentorMockPracticeStats> {
  return http.get('/lead-mentor/mock-practice/stats', {
    params: toLeadMentorMockPracticeRequestParams(params),
  })
}

export function getLeadMentorMockPracticeList(
  params: LeadMentorMockPracticeListParams,
): Promise<{ rows: LeadMentorMockPracticeItem[]; stats?: LeadMentorMockPracticeStats }> {
  return http.get('/lead-mentor/mock-practice/list', {
    params: toLeadMentorMockPracticeRequestParams(params),
  })
}

export function getLeadMentorMockPracticeDetail(
  practiceId: number,
): Promise<LeadMentorMockPracticeItem> {
  return http.get(`/lead-mentor/mock-practice/${practiceId}`)
}

export function assignLeadMentorMockPractice(
  practiceId: number,
  payload: {
    mentorIds: number[]
    scheduledAt: string
    note?: string
  },
): Promise<LeadMentorMockPracticeItem> {
  return http.post(`/lead-mentor/mock-practice/${practiceId}/assign`, payload)
}

export function acknowledgeLeadMentorMockPractice(
  practiceId: number,
): Promise<LeadMentorMockPracticeItem> {
  return http.post(`/lead-mentor/mock-practice/${practiceId}/ack-assignment`)
}
