import { http } from '../utils/request'

export interface AssistantSchedule {
  id?: number
  mentorId?: number
  weekStartDate?: string
  totalHours: number
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export function getAssistantCurrentSchedule() {
  return http.get<AssistantSchedule | null>('/api/mentor/schedule', {
    timeout: 60000,
  })
}

export function saveAssistantSchedule(data: AssistantSchedule) {
  return http.put<{ code: number; msg: string }>('/api/mentor/schedule', data, {
    timeout: 60000,
  })
}

export function getAssistantLastWeekSchedule() {
  return http.get<AssistantSchedule | null>('/api/mentor/schedule/last-week', {
    timeout: 60000,
  })
}
