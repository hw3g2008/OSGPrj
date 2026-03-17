import { http } from '../../utils/request'

export type CommunicationTab = 'record' | 'networking'

export interface CommunicationFilters {
  tab?: CommunicationTab
  keyword?: string
}

export interface CommunicationRow {
  communicationId: number
  tabType: CommunicationTab
  studentName: string
  recorderName?: string | null
  communicationMethod?: string | null
  communicationTime?: string | null
  contentPreview?: string | null
  followUpStatus?: string | null
  contactName?: string | null
  contactCompany?: string | null
  contactPosition?: string | null
  networkingType?: string | null
  statusLabel?: string | null
}

const toRequestParams = (filters: CommunicationFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.tab) {
    params.tab = filters.tab
  }

  if (filters.keyword) {
    params.keyword = filters.keyword
  }

  return params
}

export function getCommunicationList(filters: CommunicationFilters = {}) {
  return http.get<{ rows: CommunicationRow[] }>('/admin/communication/list', {
    params: toRequestParams(filters)
  })
}
