import { downloadAdminFile, http } from '../../utils'

export interface LogRow {
  operId: number
  operateTime: string
  operatorName: string
  roleLabel: string
  operationType: string
  content: string
  ipAddress: string
}

export interface LogFilters {
  keyword?: string
  operationType?: string
  beginTime?: string
  endTime?: string
}

const toParams = (filters: LogFilters = {}) => {
  const params: Record<string, string> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return
    }
    params[key] = value
  })

  return params
}

export function getLogList(filters: LogFilters = {}) {
  return http.get<{ rows: LogRow[] }>('/admin/log/list', {
    params: toParams(filters)
  })
}

export function exportLogs(filters: LogFilters = {}) {
  return downloadAdminFile({
    path: '/admin/log/export',
    params: toParams(filters),
    fallbackFilename: '操作日志.xlsx',
  })
}
