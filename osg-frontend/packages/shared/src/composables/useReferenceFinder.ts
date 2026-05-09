import { ref, type Ref } from 'vue'
import {
  getReferenceCandidates,
  type ClassReportEnd,
} from '../api/class-records'
import type { ReferenceOption, ReferenceType } from '../types/classReport'

/**
 * S-056 §3.3 / §4A.1 按 referenceType + studentId 路由候选加载
 *
 * - 按 courseType 路由 4 类数据源：
 *   job_coaching → 求职申请（osg_job_application），显示 公司·岗位·阶段·面试时间
 *   mock_interview / relation_test / communication_test → osg_mock_practice 对应子类型，
 *   显示 类型·提交时间·状态
 * - end 参数透传到后端，后端做归属过滤（只返回当前用户被分配的项）
 * - studentId / referenceType 任一变更先清空旧 references，避免脏数据闪现
 */
export interface UseReferenceFinderReturn {
  references: Ref<ReferenceOption[]>
  candidates: Ref<ReferenceOption[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  refresh: (
    studentId: number | null | undefined,
    referenceType: ReferenceType | null | undefined,
  ) => Promise<ReferenceOption[]>
  load: (
    studentId: number | null | undefined,
    referenceType: ReferenceType | null | undefined,
  ) => Promise<ReferenceOption[]>
  clear: () => void
}

export function useReferenceFinder(
  end: ClassReportEnd,
): UseReferenceFinderReturn {
  const references = ref<ReferenceOption[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const clear = (): void => {
    references.value = []
    error.value = null
  }

  /**
   * 加载候选关联项。
   * - studentId 为空或 <=0 时不发请求
   * - referenceType 为空时不发请求
   * - end 透传后端做归属过滤（mentor/lead-mentor/assistant 三端分别只返回当前用户被分配的项）
   */
  const refresh = async (
    studentId: number | null | undefined,
    referenceType: ReferenceType | null | undefined,
  ): Promise<ReferenceOption[]> => {
    // 任意输入变化先清空旧值，避免脏数据闪现
    references.value = []
    error.value = null

    if (!studentId || studentId <= 0 || !referenceType) {
      // 必要参数缺失：不发请求
      return []
    }

    loading.value = true
    try {
      const list = await getReferenceCandidates(end, studentId, referenceType)
      const safe = Array.isArray(list) ? list : []
      references.value = safe
      return safe
    } catch (err: unknown) {
      references.value = []
      error.value =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : '加载关联候选失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    references,
    candidates: references,
    loading,
    error,
    refresh,
    load: refresh,
    clear,
  }
}
