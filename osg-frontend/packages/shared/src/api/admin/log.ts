import { downloadAdminFile, http } from '../../utils'
import { i18n } from '../../i18n'

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
    fallbackFilename: `${(i18n.global.t as unknown as (k: string) => string)('common.shared.exportFile.operationLog')}.xlsx`,
  })
}
