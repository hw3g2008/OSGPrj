import { http } from '../../utils/request'

export interface LogRow {
  operId: number
  operateTime: string
  operatorName: string
  roleLabel: string
  operationType: string
  content: string
  ipAddress: string
}

export function getLogList() {
  return http.get<{ rows: LogRow[] }>('/admin/log/list')
}

export function exportLogs() {
  return http.get<{ fileName: string; exportCount: number }>('/admin/log/export')
}
