import { http } from '../utils/request'
import {
  type ClassRecordFilters,
  type ClassRecordRow,
  type ClassRecordStats,
} from './admin/classRecord'

export type AssistantClassRecordFilters = ClassRecordFilters
export type AssistantClassRecordRow = ClassRecordRow
export type AssistantClassRecordStats = ClassRecordStats

export interface AssistantClassRecordCreatePayload {
  studentId: number
  classStatus: string
  classDate: string
  // absent(旷课) 场景下不存在以下字段，后端允许 NULL：
  courseType?: string
  durationHours?: number
  feedbackContent?: string
  topics?: string
  comments?: string
}

export interface AssistantClassRecordCreateResponse {
  recordId: number
  studentId: number
  studentName: string
  mentorId: number
  mentorName: string
  courseType: string
  courseSource: string
  classStatus: string
  classDate: string
  durationHours: number
  status: string
  feedbackContent: string
  submittedAt: string
}

export function getAssistantClassRecordList(filters: AssistantClassRecordFilters = {}) {
  return http.get<{ rows: AssistantClassRecordRow[]; total: number }>('/assistant/class-records/list', {
    params: filters,
    timeout: 60000,
  })
}

export function getAssistantClassRecordStats(filters: AssistantClassRecordFilters = {}) {
  return http.get<AssistantClassRecordStats>('/assistant/class-records/stats', {
    params: filters,
    timeout: 60000,
  })
}

export function createAssistantClassRecord(payload: AssistantClassRecordCreatePayload) {
  return http.post<AssistantClassRecordCreateResponse>('/assistant/class-records', payload, {
    timeout: 60000,
  })
}
