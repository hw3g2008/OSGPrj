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
