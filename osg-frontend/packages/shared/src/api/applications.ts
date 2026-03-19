import { http } from '../utils/request'

export interface StudentApplicationRecord {
  id: number
  company: string
  position: string
  location: string
  bucket: 'applied' | 'ongoing' | 'completed'
  companyType: 'ib' | 'consulting' | 'tech' | 'pevc'
  stage: 'applied' | 'hirevue' | 'first' | 'second' | 'case' | 'offer' | 'rejected'
  stageLabel: string
  stageColor: string
  interviewTime: string
  interviewHint: string
  coachingStatus: 'coaching' | 'pending' | 'none'
  coachingStatusLabel: string
  coachingColor: string
  mentor: string
  mentorMeta: string
  hoursFeedback: string
  feedback: string
  interviewAt: string
  appliedDate: string
  applyMethod: string
  progressNote: string
}

export interface StudentApplicationOption {
  value: string
  label: string
  color?: string
  brandColor?: string
  iconKey?: string
  code?: string
  sort?: number
}

export interface StudentApplicationPageSummary {
  titleZh: string
  titleEn: string
  subtitle: string
}

export interface StudentApplicationScheduleItem {
  id: number
  shortLabel: string
  title: string
  position: string
  location: string
  weekdayLabel: string
  dayLabel: string
  timeLabel: string
  modalTime: string
  accentClass: string
  borderClass: string
}

export interface StudentApplicationsMeta {
  pageSummary: StudentApplicationPageSummary
  tabCounts: {
    all: number
    applied: number
    ongoing: number
    completed: number
  }
  filterOptions: {
    progressStages: StudentApplicationOption[]
    coachingStatuses: StudentApplicationOption[]
    companyTypes: StudentApplicationOption[]
    applyMethods: StudentApplicationOption[]
  }
  schedule: StudentApplicationScheduleItem[]
}

export function listStudentApplications(): Promise<{ applications: StudentApplicationRecord[] }> {
  return http.get('/student/application/list')
}

export function getStudentApplicationsMeta(): Promise<StudentApplicationsMeta> {
  return http.get('/student/application/meta')
}
