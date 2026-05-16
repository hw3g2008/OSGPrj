import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { i18n } from '../i18n'
import {
  getReportableStudents,
  type ClassReportEnd,
} from '../api/class-records'
import type { StudentOption } from '../types/classReport'

const t = (k: string): string => (i18n.global.t as unknown as (k: string) => string)(k)

/**
 * S-055 §4A.1 共享：按 end 选 reportable students 接口 + 空状态文案
 *
 * 三端共用：mentor / lead-mentor / assistant 在打开 ClassReportFlowModal 时
 * 调用 useStudentScopeFinder(end)，组件层不再感知具体权限 SQL。
 *
 * 空数组（合法但无可上报学员）→ emptyText="当前账号暂无可上报学员"，
 * StepBasicInfo 据此 disabled submit。
 *
 * 403 等权限错误：不吞掉，error 持有可展示消息，students=[]。
 */
const EMPTY_TEXT_KEY = 'common.shared.classReport.basic.studentEmpty'

export interface UseStudentScopeFinderReturn {
  students: Ref<StudentOption[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  isEmpty: ComputedRef<boolean>
  emptyText: string
  emptyMessage: ComputedRef<string>
  refresh: () => Promise<void>
}

export function useStudentScopeFinder(
  end: ClassReportEnd,
): UseStudentScopeFinderReturn {
  const students = ref<StudentOption[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isEmpty = computed(() => !loading.value && students.value.length === 0)

  const emptyMessage = computed(() => {
    if (error.value) return error.value
    return t(EMPTY_TEXT_KEY)
  })

  const refresh = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const list = await getReportableStudents(end)
      students.value = Array.isArray(list) ? list : []
    } catch (err: unknown) {
      // 不吞权限错误：保留 error 文案供 UI 展示，students 清空
      students.value = []
      error.value =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : t('common.shared.classReport.basic.loadFailed')
    } finally {
      loading.value = false
    }
  }

  return {
    students,
    loading,
    error,
    isEmpty,
    get emptyText() {
      return t(EMPTY_TEXT_KEY)
    },
    emptyMessage,
    refresh,
  }
}
