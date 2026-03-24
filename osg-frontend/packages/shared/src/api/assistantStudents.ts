import { http } from '../utils/request'
import type { StudentListItem, StudentListParams } from './admin/student'

export type AssistantStudentListFilters = StudentListParams
export type AssistantStudentListItem = StudentListItem

export function getAssistantStudentList(params: AssistantStudentListFilters) {
  return http.get<{ rows: AssistantStudentListItem[]; total: number }>('/admin/student/list', {
    params,
    timeout: 60000,
  })
}
