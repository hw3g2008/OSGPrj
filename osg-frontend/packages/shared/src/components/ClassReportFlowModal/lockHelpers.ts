import type { ClassReportPayload, ReferenceType } from '../../types/classReport'

/**
 * Step2A-F7：判断是否需要按预填的关联项反推锁定 courseType=job_coaching。
 *
 * 同时识别两种合法预填口径：
 * - `application`：旧口径，job_coaching 课消最初落库时 reference_type='application'
 * - `job_coaching`：新口径，从 LM 求职总览「我辅导的学员」按 osg_coaching 阶段记录预填
 *
 * 二者都唯一指向 job_coaching 课程类型，需要锁住 Step 2 的 courseType 选择。
 *
 * 其它 referenceType（mock_interview / relation_test / communication_test）不锁，
 * 因为它们对应不同 courseType，应继续走正常 Step 2 选择流程。
 */
export function isReferenceCourseTypeLocked(
  prefilledReferenceType: ReferenceType | undefined,
  prefilledReferenceId: number | undefined,
): boolean {
  return (
    (prefilledReferenceType === 'application' ||
      prefilledReferenceType === 'job_coaching') &&
    typeof prefilledReferenceId === 'number' &&
    prefilledReferenceId > 0
  )
}

/**
 * Step2A-F7：当 `isReferenceCourseTypeLocked` 为 true 时，
 * 构造打开弹窗时应用到 formState 的字段补丁。
 *
 * 关键约束：referenceType 透传 `prefilledReferenceType` 原值，**不**强写 'application'。
 * 这样新口径预填 job_coaching 时，submit 时的 payload.referenceType 才能正确指向 osg_coaching；
 * 旧数据 fallback application 时，行为与本次重构前完全一致（向后兼容）。
 */
export function buildReferenceLockPatch(
  prefilledReferenceType: ReferenceType | undefined,
  prefilledReferenceId: number | undefined,
): Pick<ClassReportPayload, 'courseType' | 'referenceType' | 'referenceId'> {
  return {
    courseType: 'job_coaching',
    referenceType: prefilledReferenceType,
    referenceId: prefilledReferenceId,
  }
}
