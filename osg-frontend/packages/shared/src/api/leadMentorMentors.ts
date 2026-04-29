import { http } from '../utils/request'

/**
 * LM 端"分配/更换导师"弹层使用的导师下拉来源。
 * 后端：OsgLeadMentorMentorController（/lead-mentor/mentor/list）。
 */
export interface LeadMentorMentorOption {
  staffId: number
  staffName: string
  majorDirection?: string | null
  subDirection?: string | null
  region?: string | null
  city?: string | null
  hourlyRate?: number | string | null
  studentCount?: number
  /** available / normal / busy，对应字典 osg_schedule_status */
  scheduleStatus?: string
}

export interface LeadMentorMentorListParams {
  keyword?: string
  majorDirection?: string
  subDirection?: string
  scheduleStatus?: string
}

const cleanParams = (params: LeadMentorMentorListParams): Record<string, string> => {
  const out: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const normalized = String(value).trim()
    if (!normalized) return
    out[key] = normalized
  })
  return out
}

export function getLeadMentorMentorList(params: LeadMentorMentorListParams = {}) {
  return http.get<{ rows: LeadMentorMentorOption[] }>('/lead-mentor/mentor/list', {
    params: cleanParams(params),
  })
}
