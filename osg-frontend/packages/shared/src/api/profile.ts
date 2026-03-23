import { http } from '../utils/request'

export interface StudentPendingProfileChange {
  fieldKey: string
  fieldLabel: string
  oldValue: string
  newValue: string
  status: string
  submittedAt: string
}

export interface StudentProfileRecord {
  studentCode: string
  fullName: string
  englishName: string
  email: string
  sexLabel: string
  statusLabel: string
  leadMentor: string
  assistantName: string
  school: string
  major: string
  graduationYear: string
  highSchool: string
  postgraduatePlan: string
  visaStatus: string
  targetRegion: string
  recruitmentCycle: string
  primaryDirection: string
  secondaryDirection: string
  phone: string
  wechatId: string
}

export interface StudentProfileView {
  profile: StudentProfileRecord
  pendingChanges: StudentPendingProfileChange[]
  pendingCount: number
}

export interface StudentProfileUpdatePayload {
  school: string
  major: string
  graduationYear: string
  highSchool: string
  postgraduatePlan: string
  visaStatus: string
  recruitmentCycle: string
  targetRegion: string
  primaryDirection: string
  secondaryDirection: string
  phone: string
  wechatId: string
}

export function getStudentProfile(): Promise<StudentProfileView> {
  return http.get('/student/profile')
}

export function updateStudentProfile(data: StudentProfileUpdatePayload): Promise<StudentProfileView> {
  return http.put('/student/profile', data)
}

export interface LeadMentorPendingProfileChange {
  changeRequestId: number
  fieldKey: string
  fieldLabel: string
  beforeValue: string
  afterValue: string
  status: string
  requestedBy: string
  submittedAt: string
  remark: string
}

export interface LeadMentorProfileRecord {
  staffId: number
  englishName: string
  genderLabel: string
  typeLabel: string
  email: string
  phone: string
  wechatId: string
  regionArea: string
  regionCity: string
  regionLabel: string
  majorDirection: string
  subDirection: string
  hourlyRate: number
  statusLabel: string
}

export interface LeadMentorProfileView {
  profile: LeadMentorProfileRecord
  pendingChanges: LeadMentorPendingProfileChange[]
  pendingCount: number
}

export interface LeadMentorProfileChangePayload {
  staffId?: number
  englishName: string
  genderLabel: string
  phone: string
  wechatId?: string
  email: string
  regionArea: string
  regionCity: string
  remark?: string
}

export interface LeadMentorProfileChangeResult extends LeadMentorProfileView {
  staffId: number
  changeRequestId: number
  changeRequestIds: number[]
  createdCount: number
  requests: LeadMentorPendingProfileChange[]
}

export function getLeadMentorProfile(): Promise<LeadMentorProfileView> {
  return http.get('/lead-mentor/profile')
}

export function submitLeadMentorProfileChangeRequest(
  data: LeadMentorProfileChangePayload,
): Promise<LeadMentorProfileChangeResult> {
  return http.post('/lead-mentor/profile/change-request', data)
}
