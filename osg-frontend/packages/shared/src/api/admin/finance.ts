import { http } from '../../utils/request'

export type FinanceSettlementTab = 'unpaid' | 'paid'
export type FinanceSettlementSource = 'all' | 'mentor' | 'clerk' | 'assistant'

export interface FinanceSettlementRow {
  settlementId: number
  recordId: number
  recordCode?: string | null
  mentorName: string
  studentName: string
  courseTypeLabel: string
  source: FinanceSettlementSource
  sourceLabel: string
  classDate?: string | null
  durationHours?: number | null
  courseFee: string
  paymentStatus: FinanceSettlementTab
  paymentStatusLabel: string
  paymentDate?: string | null
  bankReferenceNo?: string | null
  remark?: string | null
}

export interface FinanceSettlementStats {
  unpaidAmount: string
  monthPaidAmount: string
  weekClassCount: number
  flowSteps: string[]
}

export interface FinanceSettlementFilters {
  keyword?: string
  source?: FinanceSettlementSource
  tab?: FinanceSettlementTab
  startDate?: string
  endDate?: string
}

export interface MarkPaidPayload {
  paymentDate: string
  bankReferenceNo?: string
  remark?: string
}

export interface BatchPayPayload extends MarkPaidPayload {
  settlementIds: number[]
}

const toParams = (filters: FinanceSettlementFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.keyword) params.keyword = filters.keyword
  if (filters.source && filters.source !== 'all') params.source = filters.source
  if (filters.tab) params.tab = filters.tab
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate

  return params
}

export function getFinanceSettlementList(filters: FinanceSettlementFilters = {}) {
  return http.get<{ rows: FinanceSettlementRow[] }>('/admin/finance/list', {
    params: toParams(filters)
  })
}

export function getFinanceSettlementStats(filters: FinanceSettlementFilters = {}) {
  return http.get<FinanceSettlementStats>('/admin/finance/stats', {
    params: toParams(filters)
  })
}

export function markFinanceSettlementPaid(settlementId: number, payload: MarkPaidPayload) {
  return http.put<FinanceSettlementRow>(`/admin/finance/${settlementId}/mark-paid`, payload)
}

export function batchPayFinanceSettlement(payload: BatchPayPayload) {
  return http.put<{ reviewedCount: number; totalAmount: string }>('/admin/finance/batch-pay', payload)
}
