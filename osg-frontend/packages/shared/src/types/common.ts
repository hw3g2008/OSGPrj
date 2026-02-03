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

// 下拉选项
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  children?: SelectOption[]
}

// 菜单项
export interface MenuItem {
  key: string
  label: string
  icon?: string
  path?: string
  children?: MenuItem[]
  hidden?: boolean
}
