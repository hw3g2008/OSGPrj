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
