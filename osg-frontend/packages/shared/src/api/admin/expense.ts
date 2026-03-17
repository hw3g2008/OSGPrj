import { http } from '../../utils/request'

export type ExpenseTab = 'all' | 'processing' | 'approved' | 'denied'
export type ExpenseType = 'Mentor Referral' | 'Student Referral' | 'Transportation' | 'Materials' | 'Other'

export interface ExpenseRow {
  expenseId: number
  mentorId: number
  mentorName: string
  expenseType: ExpenseType
  expenseAmount: string
  expenseDate: string
  description: string
  attachmentUrl?: string | null
  status: Exclude<ExpenseTab, 'all'>
  reviewComment?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
}

export interface ExpenseListFilters {
  keyword?: string
  tab?: ExpenseTab
}

export interface CreateExpensePayload {
  mentorId: number
  mentorName: string
  expenseType: ExpenseType
  expenseAmount: string
  expenseDate: string
  description: string
  attachmentUrl?: string
}

export interface ReviewExpensePayload {
  status: 'approved' | 'denied'
  reviewComment?: string
}

const toParams = (filters: ExpenseListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.keyword) params.keyword = filters.keyword
  if (filters.tab) params.tab = filters.tab

  return params
}

export function getExpenseList(filters: ExpenseListFilters = {}) {
  return http.get<{ rows: ExpenseRow[] }>('/admin/expense/list', {
    params: toParams(filters)
  })
}

export function createExpense(payload: CreateExpensePayload) {
  return http.post<ExpenseRow>('/admin/expense', payload)
}

export function reviewExpense(expenseId: number, payload: ReviewExpensePayload) {
  return http.put<ExpenseRow>(`/admin/expense/${expenseId}/review`, payload)
}
