import { http } from '@osg/shared/utils'

export interface AdminDictRegistryTab {
  dict_type: string
  dict_name: string
  has_parent: boolean
  parent_dict_type?: string
}

export interface AdminDictRegistryGroup {
  group_key: string
  group_label: string
  icon: string
  icon_color: string
  icon_bg: string
  order: number
  dict_types: AdminDictRegistryTab[]
}

export interface AdminDictListRow {
  dictCode: number
  dictLabel: string
  dictValue: string
  dictType: string
  dictSort: number
  status: string
  updateTime?: string
  remark?: string
  parentValue?: string
  extra?: Record<string, string>
}

export function getAdminDictRegistry() {
  return http.get<AdminDictRegistryGroup[]>('/system/admin-dict/registry')
}

function parseRemark(remark?: string) {
  if (!remark) return {}
  try {
    return JSON.parse(remark) as { parentValue?: string; extra?: Record<string, string> }
  } catch {
    return {}
  }
}

function mapRow(row: any): AdminDictListRow {
  const remarkPayload = parseRemark(row?.remark)
  return {
    dictCode: Number(row?.dictCode ?? 0),
    dictLabel: row?.dictLabel ?? '',
    dictValue: row?.dictValue ?? '',
    dictType: row?.dictType ?? '',
    dictSort: Number(row?.dictSort ?? 100),
    status: row?.status ?? '0',
    updateTime: row?.updateTime,
    remark: row?.remark,
    parentValue: remarkPayload.parentValue,
    extra: remarkPayload.extra ?? {},
  }
}

export function getAdminDictList(params: {
  pageNum: number
  pageSize: number
  dictType: string
  dictLabel?: string
  status?: string
}) {
  return http.get<{ rows: any[]; total: number }>('/system/dict/data/list', { params }).then((res) => ({
    rows: (res.rows || []).map(mapRow),
    total: res.total || 0,
  }))
}

export function getAdminDictOptions(dictType: string) {
  return http.get<any[]>(`/system/dict/data/type/${dictType}`).then((rows) => (rows || []).map(mapRow))
}

export function createAdminDictItem(data: {
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort: number
  status: string
  remark?: string
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.post('/system/dict/data', {
    dictType: data.dictType,
    dictLabel: data.dictLabel,
    dictValue: data.dictValue,
    dictSort: data.dictSort,
    status: data.status,
    isDefault: 'N',
    remark: data.remark,
  }, config)
}

export function updateAdminDictItem(data: {
  dictCode: number
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort: number
  status: string
  remark?: string
}, config?: import('@osg/shared/utils').AppRequestConfig) {
  return http.put('/system/dict/data', data, config)
}
