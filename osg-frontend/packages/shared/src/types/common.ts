// 分页参数
export interface PageParams {
  pageNum?: number
  pageSize?: number
  orderByColumn?: string
  isAsc?: 'asc' | 'desc'
}

// 分页结果
export interface PageResult<T> {
  total: number
  rows: T[]
  code?: number
  msg?: string
}

// API 响应
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// 通用类型定义（SelectOption 已由 utils/mergeDictWithExistingValues.ts 统一导出）
export type { SelectOption } from '../utils/mergeDictWithExistingValues'

// 菜单项
export interface MenuItem {
  key: string
  label: string
  icon?: string
  path?: string
  children?: MenuItem[]
  hidden?: boolean
}
