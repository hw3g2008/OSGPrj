import { resolveCoachingStatusColor } from '../utils/jobOverviewTone'

export interface CoachingStatusMeta {
  color: string
  label: string
}

/**
 * 辅导状态 → { color, label } 映射，复用 SSOT resolveCoachingStatusColor。
 * stageUpdated 修饰：覆盖为 blue（LM 端阶段更新高亮）。
 */
export function useCoachingStatusMap() {
  function resolve(
    status?: string | null,
    stageUpdated?: boolean,
  ): CoachingStatusMeta {
    const label = status ?? ''
    const color = stageUpdated
      ? 'blue'
      : resolveCoachingStatusColor(status)
    return { color, label }
  }

  return { resolve }
}
