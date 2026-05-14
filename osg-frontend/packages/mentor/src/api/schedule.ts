import { http } from '@osg/shared/utils/request'

export interface MentorSchedule {
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

export function getCurrentSchedule() {
  return http.get<MentorSchedule>('/mentor/schedule')
}

export function saveSchedule(data: MentorSchedule) {
  return http.put('/mentor/schedule', data)
}

export function getLastWeekSchedule() {
  return http.get<MentorSchedule>('/mentor/schedule/last-week')
}
