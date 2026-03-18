import { http } from '@osg/shared/utils/request'

export interface ClassRecord {
  id: number
  recordNo: string
  mentorId: number
  studentId: number
  studentName?: string
  coachingType: string
  contentType: string
  positionId?: number
  classDate: string
  durationHours: number
  hourlyRate: number
  totalFee: number
  studentStatus: string
  noShowNote?: string
  feedback?: string
  studentRating?: number
  reviewStatus: string
  rejectReason?: string
  studentEvaluation?: number
  createTime?: string
}

export interface ClassRecordQuery {
  coachingType?: string
  contentType?: string
  reviewStatus?: string
  classDateStart?: string
  classDateEnd?: string
  pageNum?: number
  pageSize?: number
}

export function listClassRecords(query?: ClassRecordQuery) {
  return http.get<{ rows: ClassRecord[]; total: number }>('/api/mentor/class-records/list', { params: query })
}

export function getClassRecord(id: number) {
  return http.get<ClassRecord>(`/api/mentor/class-records/${id}`)
}

export function addClassRecord(data: Partial<ClassRecord>) {
  return http.post('/api/mentor/class-records', data)
}
