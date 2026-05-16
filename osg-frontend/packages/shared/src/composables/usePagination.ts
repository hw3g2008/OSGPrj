import { computed, reactive, ref, unref } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { i18n } from '../i18n'

const t = (key: string, named?: Record<string, unknown>): string =>
  named
    ? (i18n.global.t as unknown as (k: string, n: Record<string, unknown>) => string)(key, named)
    : (i18n.global.t as unknown as (k: string) => string)(key)

export interface PagedResponse<T> {
  rows?: T[]
  total?: number
  [key: string]: unknown
}

export interface UsePaginationOptions {
  /** 默认每页条数，默认 10（与导师列表等标准页面一致）*/
  pageSize?: number
  /** 是否显示每页条数切换器，默认 false（统一规范：每页 10 条）*/
  showSizeChanger?: boolean
  /** 每页条数选项，仅在 showSizeChanger=true 时生效，默认 ['10', '20', '50', '100'] */
  pageSizeOptions?: string[]
  /** 是否显示跳页输入框，默认 false */
  showQuickJumper?: boolean
  /** 仅一页时是否隐藏分页器（Ant Design 原生字段），默认 false（始终显示） */
  hideOnSinglePage?: boolean
  /** 自定义 showTotal 文案 */
  showTotal?: (total: number, range: [number, number]) => string
}

export interface UsePaginationReturn<T, P> {
  rows: Ref<T[]>
  loading: Ref<boolean>
  pagination: { current: number; pageSize: number; total: number }
  tablePagination: ComputedRef<Record<string, unknown>>
  /** 拉取数据：首次或搜索时传入过滤参数，翻页时会自动复用上次参数 */
  load: (params?: P) => Promise<void>
  /** 使用上次参数 + 当前分页重新拉取（用于删改后刷新） */
  reload: () => Promise<void>
  /** 重置分页到第 1 页并拉取（用于搜索/筛选条件变化） */
  search: (params?: P) => Promise<void>
  /** 供 <a-table @change> 直接绑定 */
  handleTableChange: (pag: { current?: number; pageSize?: number }) => void
}

/**
 * 统一封装列表页分页逻辑：
 * - 维护 current / pageSize / total 状态
 * - 生成 Ant Design <a-table :pagination> 所需 config
 * - 记忆上次请求参数，翻页无需重传
 * - 提供 search/reload/handleTableChange 语义化 API
 */
export function usePagination<T, P extends Record<string, unknown> = Record<string, unknown>>(
  fetcher: (params: P & { pageNum: number; pageSize: number }) => Promise<PagedResponse<T>>,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T, P> {
  const rows = ref([]) as Ref<T[]>
  const loading = ref(false)
  const defaultPageSize = options.pageSize ?? 10

  const pagination = reactive({
    current: 1,
    pageSize: defaultPageSize,
    total: 0
  })

  const tablePagination = computed(() => ({
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showSizeChanger: options.showSizeChanger ?? false,
    pageSizeOptions: options.pageSizeOptions ?? ['10', '20', '50', '100'],
    showQuickJumper: options.showQuickJumper ?? false,
    hideOnSinglePage: options.hideOnSinglePage ?? false,
    showTotal:
      options.showTotal ??
      ((total: number) => t('common.shared.pagination.totalRecords', { total }))
  }))

  let lastParams: P | undefined

  const load = async (params?: P) => {
    if (params !== undefined) {
      lastParams = params
    }
    loading.value = true
    try {
      const response = await fetcher({
        ...((lastParams ?? {}) as P),
        pageNum: pagination.current,
        pageSize: pagination.pageSize
      })
      rows.value = (response?.rows as T[]) ?? []
      pagination.total = typeof response?.total === 'number' ? response.total : 0
    } finally {
      loading.value = false
    }
  }

  const reload = () => load()

  const search = (params?: P) => {
    pagination.current = 1
    return load(params)
  }

  const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
    pagination.current = pag.current ?? 1
    pagination.pageSize = pag.pageSize ?? pagination.pageSize
    void load()
  }

  return {
    rows,
    loading,
    pagination,
    tablePagination,
    load,
    reload,
    search,
    handleTableChange
  }
}

/**
 * 生成标准客户端分页配置（a-table 内置前端分页）。
 * 与导师列表保持一致：pageSize=10 / 不显示切换器 / 共 N 条记录 / 始终显示。
 * 当数据是一次性拉全量（无后端分页）时使用。
 *
 * @example
 * const pagination = useStandardClientPagination(() => rows.value.length)
 * <a-table :data-source="rows" :pagination="pagination" />
 */
export function useStandardClientPagination(
  total: MaybeRefOrGetter<number>
): ComputedRef<Record<string, unknown>> {
  return computed(() => ({
    pageSize: 10,
    showSizeChanger: false,
    total: typeof total === 'function' ? (total as () => number)() : unref(total),
    showTotal: (total: number) => t('common.shared.pagination.totalRecords', { total }),
    hideOnSinglePage: false
  }))
}
