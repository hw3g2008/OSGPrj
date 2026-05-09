import { http } from '../../utils/request'

export interface ContractListParams {
  pageNum?: number
  pageSize?: number
  studentName?: string
  contractType?: string
  contractStatus?: string
  leadMentorId?: number
  leadMentorName?: string
  'params[beginTime]'?: string
  'params[endTime]'?: string
}

export interface ContractListItem {
  contractId: number
  contractNo: string
  studentId: number
  studentName: string
  leadMentorId?: number
  leadMentorName?: string
  contractType: string
  contractAmount: number
  currency?: string
  amountUsd?: number
  amountGbp?: number
  totalHours: number
  usedHours?: number
  remainingHours?: number
  startDate: string
  endDate: string
  renewalReason?: string
  contractStatus: string
  attachmentPath?: string
  updateTime?: string
}

export interface ContractStats {
  totalContracts: number
  activeContracts: number
  expiringContracts: number
  endedContracts: number
  totalAmount: number
  totalHours: number
  usedHours: number
  remainingHours: number
}

export interface ContractDetailPayload {
  summary: {
    totalAmount: number
    totalHours: number
    usedHours: number
    remainingHours: number
  }
  contracts: ContractListItem[]
}

export interface RenewContractPayload {
  studentId: number
  currency?: 'USD' | 'GBP'
  amountUsd?: number
  amountGbp?: number
  contractAmount?: number
  totalHours?: number
  startDate: string
  endDate: string
  renewalReason: string
  otherReason?: string
  attachmentPath?: string
  remark?: string
}

export interface UploadContractAttachmentResult {
  contractId?: number
  attachmentPath: string
  url: string
}

/**
 * 原地更新合同字段（不产生新合同）。
 * 仅 contractStatus='active' 的合同可改；其他字段全部可选（局部更新）。
 */
export interface UpdateContractPayload {
  contractAmount?: number
  totalHours?: number
  startDate?: string
  endDate?: string
  currency?: 'USD' | 'GBP'
  amountUsd?: number
  amountGbp?: number
  attachmentPath?: string
  remark?: string
  contractStatus?: string
}

export interface UpdateContractResult {
  contractId: number
  contractAmount: number
  totalHours: number
  startDate: string
  endDate: string
  currency: string
  amountUsd?: number
  amountGbp?: number
  attachmentPath?: string
  contractStatus: string
  remark?: string
}

export function getContractList(params: ContractListParams) {
  return http.get<{ rows: ContractListItem[]; total: number }>('/admin/contract/list', { params })
}

export function getContractStats(params: ContractListParams = {}) {
  return http.get<ContractStats>('/admin/contract/stats', { params })
}

export function getStudentContractDetail(studentId: number) {
  return http.get<ContractDetailPayload>(`/admin/student/${studentId}/contracts`)
}

export function renewContract(payload: RenewContractPayload) {
  return http.post('/admin/contract/renew', payload)
}

/**
 * 原地更新合同（不产生新合同）。仅 active 合同允许更新。
 */
export function updateContract(contractId: number, payload: UpdateContractPayload) {
  return http.put<UpdateContractResult>(`/admin/contract/${contractId}`, payload)
}

export function uploadContractAttachment(file: File, contractId?: number) {
  const formData = new FormData()
  formData.append('file', file)
  if (contractId !== undefined) {
    formData.append('contractId', String(contractId))
  }
  return http.post<UploadContractAttachmentResult>('/admin/contract/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
