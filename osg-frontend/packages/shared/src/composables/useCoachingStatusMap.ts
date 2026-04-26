import { resolveCoachingStatusColor } from '../utils/jobOverviewTone'

/**
 * 辅导状态 → tone color 字符串映射，复用 SSOT resolveCoachingStatusColor。
 * stageUpdated 修饰：覆盖为 'blue'（LM 端阶段更新高亮）。
 *
 * 用法（LM job-overview）：
 *   const { resolveCoachingTone } = useCoachingStatusMap()
 *   const tone = resolveCoachingTone(row.coachingStatus, row.stageUpdated)
 *
 * 注：原 v0 API 返回 `{ color, label }`，但 label 字段无消费方（LM/asst/mentor 各自直接渲染原 status 字段），
 * 故 v1 简化为单返回 string。如需 label，调用方直接用 `status ?? ''` 即可。
 */
export function useCoachingStatusMap() {
  function resolveCoachingTone(
    status?: string | null,
    stageUpdated?: boolean,
  ): string {
    return stageUpdated ? 'blue' : resolveCoachingStatusColor(status)
  }

  return { resolveCoachingTone }
}
