import { http } from '../utils/request'

export interface StudentApplicationCoachingRecord {
  coachingId: number
  applicationId: number
  interviewStage: string
  interviewStageLabel: string
  interviewTime: string
  city: string
  cityLabel: string
  companyInterviewer: string
  requestedMentorCount?: number
  requestNote: string
  mentorId?: number
  mentorName: string
  mentorIds: string
  mentorNames: string
  status: string
  latestRating: string
  reportedLessonCount: number
}

export interface StudentApplicationCoachingPayload {
  interviewStage: string
  interviewTime?: string | null
  city?: string
  companyInterviewer?: string
  requestedMentorCount?: string
  requestNote?: string
}

export interface StudentApplicationCoachingUpdatePayload {
  interviewTime?: string
  companyInterviewer?: string
}

export interface StudentApplicationCoachingClassRecord {
  recordId: number
  classId: string
  mentorName: string
  classDate: string
  durationHours?: number
  memberStatus: string
  rate: string
  topics: string
  comments: string
  feedbackContent: string
  referenceType: string
  referenceId: number
}

export interface StudentApplicationCoachingClassRecordsResponse {
  applicationId: number
  coachingId: number
  latestRating: string
  reportedLessonCount: number
  records: StudentApplicationCoachingClassRecord[]
}

export interface StudentApplicationRecord {
  id: number
  positionId: number
  company: string
  position: string
  location: string
  bucket: 'applied' | 'ongoing' | 'completed'
  companyType: 'ib' | 'consulting' | 'tech' | 'pevc'
  stage: string
  stageLabel: string
  stageColor: string
  interviewTime: string
  interviewHint: string
  coachingStatus: 'coaching' | 'pending' | 'none'
  // §D.3 已移除 coachingStatusLabel / coachingColor 固化字段；前端用 deriveApplicationStatus composable 派生 SSOT
  mentor: string
  mentorMeta: string
  hoursFeedback: string
  feedback: string
  interviewAt: string
  appliedDate: string
  applyMethod: string
  progressNote: string
  // RULE-A 学生端 8 字段：行业 / 岗位分类 / 地区 / 招聘周期 / 投递时间 / 求职状态
  industry: string
  industryLabel: string
  positionCategory: string
  categoryLabel: string
  region: string
  regionLabel: string
  recruitmentCycle: string
  submittedAt: string
  applicationStatus: 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdraw'
  applicationStatusLabel: string
  applicationStatusColor: string
  coachings: StudentApplicationCoachingRecord[]
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
    coachingStages: StudentApplicationOption[]
    mentorCounts: StudentApplicationOption[]
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

export function requestStudentApplicationCoaching(
  applicationId: number,
  data: StudentApplicationCoachingPayload
): Promise<{ coachingId: number; applicationId: number; status: string }> {
  return http.post(`/student/applications/${applicationId}/coachings`, data)
}

export function updateStudentApplicationCoaching(
  applicationId: number,
  coachingId: number,
  data: StudentApplicationCoachingUpdatePayload
): Promise<{ coachingId: number; applicationId: number }> {
  return http.put(`/student/applications/${applicationId}/coachings/${coachingId}`, data)
}

export function getStudentApplicationCoachingClassRecords(
  applicationId: number,
  coachingId: number
): Promise<StudentApplicationCoachingClassRecordsResponse> {
  return http.get(`/student/applications/${applicationId}/coachings/${coachingId}/class-records`)
}
