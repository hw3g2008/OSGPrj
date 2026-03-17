import { http } from '../../utils/request'

export type WeekScope = 'current' | 'next'
export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface ScheduleSlot {
  weekday: number
  timeSlot: TimeSlot
}

export interface StaffScheduleListItem {
  staffId: number
  staffName: string
  email?: string
  staffType?: string
  majorDirection?: string
  weekScope: WeekScope
  filled: boolean
  availableHours: number
  availableSlots: ScheduleSlot[]
  availableSlotLabels: string[]
  selectedSlotKeys: string[]
  availableText: string
  actionType: 'fill' | 'adjust'
  canRemind: boolean
  reminder?: string
}

export interface StaffScheduleListParams {
  pageNum?: number
  pageSize?: number
  week?: WeekScope
}

export interface StaffScheduleListResponse {
  rows: StaffScheduleListItem[]
  total: number
}

export interface SaveStaffSchedulePayload {
  staffId: number
  week: WeekScope
  availableHours: number
  reason: string
  notifyStaff: boolean
  selectedSlotKeys: string[]
}

export interface RemindAllResult {
  pendingCount: number
  recipientCount: number
  weekScope: WeekScope
  recipients: string[]
}

export function getStaffScheduleList(params: StaffScheduleListParams) {
  return http.get<StaffScheduleListResponse>('/admin/schedule/list', { params })
}

export function saveStaffSchedule(payload: SaveStaffSchedulePayload) {
  return http.put('/admin/schedule/edit', payload)
}

export function remindAllStaff(payload: { week?: WeekScope }) {
  return http.post<RemindAllResult>('/admin/schedule/remind-all', payload)
}
