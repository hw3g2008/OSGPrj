import { http } from '../../utils/request'

export type TestBankTab = 'banks' | 'applications'
export type TestBankType = 'HireVue' | 'Pymetrics' | 'SHL'
export type TestBankStatus = 'enabled' | 'disabled'

export interface TestBankRow {
  bankId?: number
  recordType?: 'bank' | 'application'
  testBankName?: string
  companyName?: string
  testType: TestBankType
  questionCount?: number
  status?: TestBankStatus
  updatedAt?: string | null
  applicationCode?: string
  studentName?: string
  appliedPosition?: string
  applicationTime?: string | null
  applicationSource?: string
  pendingFlag?: string
}

export interface TestBankListFilters {
  tab?: TestBankTab
  keyword?: string
  companyName?: string
  testType?: TestBankType | ''
}

export interface TestBankListResponse {
  rows: TestBankRow[]
  pendingCount: number
}

export interface SaveTestBankPayload {
  bankId?: number
  testBankName: string
  companyName: string
  testType: TestBankType
  questionCount: number
  status: TestBankStatus
}

const toParams = (filters: TestBankListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.tab) params.tab = filters.tab
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.companyName) params.companyName = filters.companyName
  if (filters.testType) params.testType = filters.testType

  return params
}

export function getTestBankList(filters: TestBankListFilters = {}) {
  return http.get<TestBankListResponse>('/admin/test-bank/list', {
    params: toParams(filters)
  })
}

export function createTestBank(payload: SaveTestBankPayload) {
  return http.post<TestBankRow>('/admin/test-bank', payload)
}

export function updateTestBank(payload: SaveTestBankPayload & { bankId: number }) {
  return http.put<TestBankRow>('/admin/test-bank', payload)
}
