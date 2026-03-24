import { http } from '../utils/request'
import {
  type ClassRecordFilters,
  type ClassRecordRow,
  type ClassRecordStats,
} from './admin/classRecord'

export type AssistantClassRecordFilters = ClassRecordFilters
export type AssistantClassRecordRow = ClassRecordRow
export type AssistantClassRecordStats = ClassRecordStats

export function getAssistantClassRecordList(filters: AssistantClassRecordFilters = {}) {
  return http.get<{ rows: AssistantClassRecordRow[]; total: number }>('/admin/class-record/list', {
    params: filters,
    timeout: 60000,
  })
}

export function getAssistantClassRecordStats(filters: AssistantClassRecordFilters = {}) {
  return http.get<AssistantClassRecordStats>('/admin/class-record/stats', {
    params: filters,
    timeout: 60000,
  })
}
