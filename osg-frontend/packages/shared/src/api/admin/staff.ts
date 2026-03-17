import { http } from '../../utils/request'

export interface StaffListParams {
  pageNum: number
  pageSize: number
  staffName?: string
  staffType?: string
  majorDirection?: string
  accountStatus?: string
}

export interface StaffListItem {
  staffId: number
  staffName: string
  email?: string
  phone?: string
  staffType?: string
  majorDirection?: string
  subDirection?: string
  region?: string
  city?: string
  hourlyRate?: number
  studentCount?: number
  accountStatus?: string
  isBlacklisted?: boolean
  blacklistReason?: string
}

export interface StaffListResponse {
  rows: StaffListItem[]
  total: number
  pendingReviewCount?: number
  blacklistedCount?: number
}

export interface StaffPayload {
  staffId?: number
  staffName: string
  email: string
  phone?: string
  staffType: string
  majorDirection: string
  subDirection?: string
  region: string
  city: string
  hourlyRate: number
  accountStatus?: string
}

export interface StaffOption {
  label: string
  value: number
}

export interface StaffDetailItem extends StaffListItem {}

export interface ResetStaffPasswordResult {
  staffId: number
  loginAccount: string
  defaultPassword: string
}

export function getStaffList(params: StaffListParams) {
  return http.get<StaffListResponse>('/admin/staff/list', { params })
}

export function getStaffDetail(staffId: number) {
  return http.get<StaffDetailItem>(`/admin/staff/${staffId}`)
}

export function createStaff(payload: StaffPayload) {
  return http.post<StaffListItem>('/admin/staff', payload)
}

export function updateStaff(payload: StaffPayload) {
  return http.put<StaffListItem>('/admin/staff', payload)
}

export function resetStaffPassword(staffId: number) {
  return http.post<ResetStaffPasswordResult>('/admin/staff/reset-password', { staffId })
}

export async function getStaffOptions(keyword = ''): Promise<StaffOption[]> {
  const response = await getStaffList({
    pageNum: 1,
    pageSize: 50,
    staffName: keyword || undefined,
  })
  return (response.rows || []).map((item) => ({
    label: item.staffName,
    value: item.staffId,
  }))
}
