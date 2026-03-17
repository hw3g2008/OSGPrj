import { http } from '../../utils/request'

export type QbankAuthType = 'all' | 'class' | 'user'

export interface QbankFolderRow {
  fileId: number
  fileName: string
  fileType: string
  fileSize?: string
  authType?: QbankAuthType
  authorizedTo?: string
  expiryAt?: string | null
  createTime?: string | null
  updateTime?: string | null
}

export interface QbankListResponse {
  rows: QbankFolderRow[]
}

export interface CreateQbankFolderPayload {
  folderName: string
}

export interface UpdateQbankAuthPayload {
  fileId: number
  authType: QbankAuthType
  authorizedClasses?: string[]
  authorizedUsers?: string[]
}

export interface UpdateQbankExpiryPayload {
  fileId: number
  expiryAt: string
}

export function getQbankList(keyword?: string) {
  return http.get<QbankListResponse>('/admin/qbank/list', {
    params: keyword ? { keyword } : undefined
  })
}

export function createQbankFolder(payload: CreateQbankFolderPayload) {
  return http.post<QbankFolderRow>('/admin/qbank/folder', payload)
}

export function updateQbankAuth(payload: UpdateQbankAuthPayload) {
  return http.put<QbankFolderRow>('/admin/qbank/auth', payload)
}

export function updateQbankExpiry(payload: UpdateQbankExpiryPayload) {
  return http.put<QbankFolderRow>('/admin/qbank/expiry', payload)
}
