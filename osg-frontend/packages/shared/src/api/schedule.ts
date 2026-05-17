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

export function getLeadMentorSchedule(weekScope: 'current' | 'next'): Promise<LeadMentorScheduleView> {
  return http.get('/lead-mentor/schedule', { params: { weekScope } })
}

export function getLeadMentorScheduleStatus(): Promise<LeadMentorScheduleStatusView> {
  return http.get('/lead-mentor/schedule/status')
}

export function saveLeadMentorNextSchedule(
  payload: LeadMentorScheduleSavePayload,
): Promise<LeadMentorScheduleSaveResult> {
  return http.put('/lead-mentor/schedule/next', payload)
}
