import { http } from '../utils/request'

export interface LeadMentorScheduleDayView {
  weekday: number
  date: string
  selectedSlots: string[]
}

export interface LeadMentorScheduleView {
  staffId: number
  staffName: string
  weekScope: 'current' | 'next'
  readonly: boolean
  filled: boolean
  availableHours: number
  availableDayCount: number
  selectedSlotKeys: string[]
  note: string
  weekRange: string
  days: LeadMentorScheduleDayView[]
}

export interface LeadMentorScheduleStatusView {
  staffId: number
  forceScheduleModal: boolean
  nextWeekFilled: boolean
  currentWeek: LeadMentorScheduleView
  nextWeek: LeadMentorScheduleView
}

export interface LeadMentorScheduleSavePayload {
  staffId?: number
  weekScope?: 'next'
  availableHours: number
  selectedSlotKeys: string[]
  note?: string
}

export interface LeadMentorScheduleSaveResult extends LeadMentorScheduleView {
  selectedSlotCount: number
  affectedRows: number
}

export interface StaffScheduleApi {
  getSchedule(weekScope: 'current' | 'next'): Promise<LeadMentorScheduleView>
  getStatus(): Promise<LeadMentorScheduleStatusView>
  saveNext(payload: LeadMentorScheduleSavePayload): Promise<LeadMentorScheduleSaveResult>
}

function createStaffScheduleApi(basePath: string): StaffScheduleApi {
  return {
    getSchedule(weekScope) {
      return http.get(basePath, { params: { weekScope } })
    },
    getStatus() {
      return http.get(`${basePath}/status`)
    },
    saveNext(payload) {
      return http.put(`${basePath}/next`, payload)
    },
  }
}

export const leadMentorScheduleApi = createStaffScheduleApi('/lead-mentor/schedule')
export const mentorScheduleApi = createStaffScheduleApi('/mentor/schedule')
export const assistantScheduleApi = createStaffScheduleApi('/assistant/schedule')

// Back-compat named exports used by lead-mentor pages and existing tests.
export function getLeadMentorSchedule(weekScope: 'current' | 'next') {
  return leadMentorScheduleApi.getSchedule(weekScope)
}

export function getLeadMentorScheduleStatus() {
  return leadMentorScheduleApi.getStatus()
}

export function saveLeadMentorNextSchedule(payload: LeadMentorScheduleSavePayload) {
  return leadMentorScheduleApi.saveNext(payload)
}
