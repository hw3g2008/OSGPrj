import { http } from '../utils/request'

export interface StudentPositionRecord {
  id: number
  title: string
  url: string
  category: 'summer' | 'fulltime' | 'offcycle' | 'spring' | 'events'
  categoryText: string
  department: string
  location: string
  recruitCycle: string
  publishDate: string
  deadline: string
  company: string
  companyKey: string
  companyCode: string
  careerUrl: string
  industry: 'ib' | 'consulting' | 'tech' | 'pevc'
  sourceType?: 'global' | 'manual'
  favorited: boolean
  applied: boolean
  progressStage: string
  progressNote: string
  categoryColor?: string
  industryLabel?: string
  industryIconKey?: string
  companyBrandColor?: string
  locationCode?: string
  requirements?: string
}

export interface StudentPositionOption {
  value: string
  label: string
  color?: string
  code?: string
  iconKey?: string
  brandColor?: string
  sort?: number
}

export interface StudentPositionIntentSummary {
  recruitmentCycle: string
  targetRegion: string
  primaryDirection: string
}

export interface StudentPositionMeta {
  intentSummary: StudentPositionIntentSummary
  filterOptions: {
    categories: StudentPositionOption[]
    industries: StudentPositionOption[]
    companies: StudentPositionOption[]
    locations: StudentPositionOption[]
    applyMethods: StudentPositionOption[]
    progressStages: StudentPositionOption[]
    coachingStages: StudentPositionOption[]
    mentorCounts: StudentPositionOption[]
  }
}

export interface LeadMentorPositionListParams {
  keyword?: string
  positionCategory?: string
  industry?: string
  companyName?: string
  region?: string
  city?: string
  recruitmentCycle?: string
  projectYear?: string
}

export interface LeadMentorPositionListItem {
  positionId: number
  positionCategory: string
  industry: string
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionName: string
  department?: string
  region?: string
  city?: string
  recruitmentCycle?: string
  projectYear?: string
  publishTime?: string
  deadline?: string
  displayStatus?: string
  positionUrl?: string
  applicationNote?: string
  studentCount?: number
  myStudentCount?: number
}

export interface LeadMentorPositionMetaOption {
  value: string
  label: string
}

export interface LeadMentorPositionMeta {
  categories: LeadMentorPositionMetaOption[]
  displayStatuses: LeadMentorPositionMetaOption[]
  industries: LeadMentorPositionMetaOption[]
  companyTypes: LeadMentorPositionMetaOption[]
  companies: LeadMentorPositionMetaOption[]
  recruitmentCycles: LeadMentorPositionMetaOption[]
  projectYears: LeadMentorPositionMetaOption[]
  regions: LeadMentorPositionMetaOption[]
  citiesByRegion: Record<string, LeadMentorPositionMetaOption[]>
  sortOptions: LeadMentorPositionMetaOption[]
}

export interface LeadMentorPositionStudentRow {
  applicationId: number
  studentId: number
  studentName: string
  positionId: number
  positionName: string
  currentStage: string
  status: string
  statusTone?: 'info' | 'warning' | 'success' | 'danger' | 'default'
  usedHours: number
  statusRemark?: string
}

const toLeadMentorPositionRequestParams = (params: LeadMentorPositionListParams = {}) => {
  const requestParams: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    requestParams[key] = String(value)
  })

  return requestParams
}

export function listStudentPositions(): Promise<StudentPositionRecord[]> {
  return http.get('/student/position/list')
}

export function getStudentPositionMeta(): Promise<StudentPositionMeta> {
  return http.get('/student/position/meta')
}

export function updateStudentPositionFavorite(data: { positionId: number; favorited: boolean }): Promise<void> {
  return http.post('/student/position/favorite', data)
}

export function updateStudentPositionApply(data: {
  positionId: number
  applied: boolean
  date?: string
  method?: string
  note?: string
}): Promise<void> {
  return http.post('/student/position/apply', data)
}

export function updateStudentPositionProgress(data: {
  positionId: number
  stage: string
  notes: string
}): Promise<void> {
  return http.post('/student/position/progress', data)
}

export function requestStudentPositionCoaching(data: {
  positionId: number
  stage: string
  mentorCount: string
  note: string
}): Promise<void> {
  return http.post('/student/position/coaching', data)
}

export function createStudentManualPosition(data: {
  category: string
  title: string
  company: string
  location: string
}): Promise<{ positionId: number }> {
  return http.post('/student/position/manual', data)
}

export function getLeadMentorPositionList(
  params: LeadMentorPositionListParams = {},
): Promise<{ rows: LeadMentorPositionListItem[] }> {
  return http.get('/lead-mentor/positions/list', {
    params: toLeadMentorPositionRequestParams(params),
  })
}

export function getLeadMentorPositionMeta(): Promise<LeadMentorPositionMeta> {
  return http.get('/lead-mentor/positions/meta')
}

export function getLeadMentorPositionStudents(positionId: number): Promise<LeadMentorPositionStudentRow[]> {
  return http.get(`/lead-mentor/positions/${positionId}/students`)
}
