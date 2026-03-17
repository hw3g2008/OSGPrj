import { http } from '../../utils/request'

export interface MailJobRow {
  jobId: number
  jobTitle: string
  recipientGroup: string
  emailSubject: string
  smtpServerName: string
  totalCount: number
  pendingCount: number
  successCount: number
  failCount: number
  createTime: string
}

export interface SmtpServerRow {
  serverName: string
  host: string
  port: number
  username: string
  status: string
}

export interface CreateMailJobPayload {
  jobTitle: string
  recipientGroup: string
  emailSubject: string
  emailContent: string
  smtpServerName: string
  totalCount?: number
  pendingCount?: number
  successCount?: number
  failCount?: number
}

export function getMailJobList() {
  return http.get<{ rows: MailJobRow[]; smtpServers: SmtpServerRow[] }>('/admin/mailjob/list')
}

export function createMailJob(payload: CreateMailJobPayload) {
  return http.post<MailJobRow>('/admin/mailjob', payload)
}
