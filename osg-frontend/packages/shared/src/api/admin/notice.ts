import { http } from '../../utils/request'

export type NoticeReceiverType = 'all_mentor' | 'target_mentor' | 'all_student' | 'target_student'

export interface NoticeRow {
  noticeId: number
  receiverType: NoticeReceiverType
  receiverLabel: string
  noticeTitle: string
  noticeContent?: string
  createTime: string
}

export interface NoticeListFilters {
  keyword?: string
  receiverType?: NoticeReceiverType | ''
}

export interface SendNoticePayload {
  receiverType: NoticeReceiverType
  receiverLabel: string
  noticeTitle: string
  noticeContent: string
}

const toParams = (filters: NoticeListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.keyword) params.keyword = filters.keyword
  if (filters.receiverType) params.receiverType = filters.receiverType

  return params
}

export function getNoticeList(filters: NoticeListFilters = {}) {
  return http.get<{ rows: NoticeRow[] }>('/admin/notice/list', {
    params: toParams(filters)
  })
}

export function sendNotice(payload: SendNoticePayload) {
  return http.post<NoticeRow>('/admin/notice/send', payload)
}
