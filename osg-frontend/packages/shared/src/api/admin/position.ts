import { http } from '../../utils/request'

export interface PositionListParams {
  pageNum?: number
  pageSize?: number
  keyword?: string
  positionCategory?: string
  industry?: string
  companyName?: string
  region?: string
  city?: string
  displayStatus?: string
  recruitmentCycle?: string
  projectYear?: string
  beginPublishTime?: string
  endPublishTime?: string
}

export interface PositionListItem {
  positionId: number
  positionCategory: string
  industry: string
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionName: string
  department?: string
  region: string
  city: string
  recruitmentCycle: string
  projectYear: string
  publishTime?: string
  deadline?: string
  displayStatus: string
  displayStartTime?: string
  displayEndTime?: string
  positionUrl?: string
  applicationNote?: string
  studentCount?: number
}

export interface PositionStats {
  totalPositions: number
  openPositions: number
  closingSoonPositions: number
  closedPositions: number
  studentApplications: number
}

export interface PositionMetaOption {
  value: string
  label: string
  tone?: string
  icon?: string
  parent?: string
  remark?: string
}

export interface PositionTrafficSummary {
  totalViews: number
}

export interface PositionMeta {
  categories: PositionMetaOption[]
  displayStatuses: PositionMetaOption[]
  industries: PositionMetaOption[]
  companyTypes: PositionMetaOption[]
  recruitmentCycles: PositionMetaOption[]
  projectYears: PositionMetaOption[]
  regions: PositionMetaOption[]
  citiesByRegion: Record<string, PositionMetaOption[]>
  publishPresets: PositionMetaOption[]
  processGlossary: PositionMetaOption[]
  uploadRuleCopy?: string
  uploadSteps: string[]
  trafficSummary?: PositionTrafficSummary | null
}

export interface PositionCompanyOption {
  value: string
  label: string
  industry?: string
  companyType?: string
  companyWebsite?: string
}

export interface PositionStudentRow {
  studentId: number
  studentName: string
  positionName: string
  status: string
  statusTone?: 'info' | 'warning' | 'success' | 'danger' | 'default'
  usedHours: number
}

export interface DrillDownPosition extends PositionListItem {}

export interface DrillDownCompany {
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionCount: number
  openCount: number
  studentCount: number
  positions: DrillDownPosition[]
}

export interface DrillDownIndustry {
  industry: string
  companyCount: number
  positionCount: number
  openCount: number
  studentCount: number
  companies: DrillDownCompany[]
}

export interface PositionPayload {
  positionId?: number
  positionCategory: string
  industry: string
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionName: string
  department?: string
  region: string
  city: string
  recruitmentCycle: string
  projectYear: string
  displayStatus?: string
  displayStartTime: string
  displayEndTime: string
  deadline?: string
  positionUrl?: string
  applicationNote?: string
}

export interface PositionBatchUploadResult {
  totalCount: number
  successCount: number
  duplicateCount: number
  duplicates: string[]
}

const toRequestParams = (params: PositionListParams = {}) => {
  const requestParams: Record<string, string | number> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (key === 'beginPublishTime') {
      requestParams['params[beginPublishTime]'] = value
      return
    }
    if (key === 'endPublishTime') {
      requestParams['params[endPublishTime]'] = value
      return
    }
    requestParams[key] = value
  })

  return requestParams
}

export function getPositionList(params: PositionListParams = {}) {
  return http.get<{ rows: PositionListItem[]; total: number }>('/admin/position/list', {
    params: toRequestParams(params)
  })
}

export function getPositionStats(params: PositionListParams = {}) {
  return http.get<PositionStats>('/admin/position/stats', {
    params: toRequestParams(params)
  })
}

export function getPositionDrillDown(params: PositionListParams = {}) {
  return http.get<DrillDownIndustry[]>('/admin/position/drill-down', {
    params: toRequestParams(params)
  })
}

export function getPositionMeta() {
  return http.get<PositionMeta>('/admin/position/meta')
}

export function getPositionCompanyOptions(keyword?: string) {
  return http.get<PositionCompanyOption[]>('/admin/position/company-options', {
    params: keyword ? { keyword } : undefined
  })
}

export function getPositionStudents(positionId: number) {
  return http.get<PositionStudentRow[]>(`/admin/position/${positionId}/students`)
}

export function createPosition(payload: PositionPayload) {
  return http.post<PositionListItem>('/admin/position', payload)
}

export function updatePosition(payload: PositionPayload) {
  return http.put<PositionListItem>('/admin/position', payload)
}

export function uploadPositionFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<PositionBatchUploadResult>('/admin/position/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
