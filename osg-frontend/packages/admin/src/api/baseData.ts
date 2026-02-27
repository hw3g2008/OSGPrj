import { http } from '@osg/shared/utils'

// 获取基础数据列表（分页+搜索+分类筛选）
export function getBaseDataList(params: {
  pageNum: number
  pageSize: number
  name?: string
  category?: string
  tab?: string
  status?: string
}) {
  return http.get<{ rows: any[]; total: number }>('/system/basedata/list', { params })
}

// 新增基础数据
export function addBaseData(data: {
  name: string
  category: string
  tab: string
  sort?: number
  status?: string
  parentId?: number
}) {
  return http.post('/system/basedata', data)
}

// 修改基础数据
export function updateBaseData(data: {
  id: number
  name: string
  sort?: number
  status?: string
  parentId?: number
}) {
  return http.put('/system/basedata', data)
}

// 修改基础数据状态（启用/禁用）
export function changeBaseDataStatus(data: { id: number; status: string }) {
  return http.put('/system/basedata/changeStatus', data)
}

// 获取分类及Tab列表
export function getCategoryTabs() {
  return http.get<{
    categories: {
      key: string
      label: string
      icon: string
      iconColor: string
      tabs: { key: string; label: string; hasParent?: boolean; parentTab?: string }[]
    }[]
  }>('/system/basedata/categories')
}
