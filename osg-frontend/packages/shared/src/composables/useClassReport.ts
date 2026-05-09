import { computed, ref, type Ref } from 'vue'
import {
  submitClassReport,
  type ClassReportEnd,
} from '../api/class-records'
import type {
  ClassReportPayload,
  CourseType,
  MemberStatus,
} from '../types/classReport'

/**
 * S-055 §4A.1 共享 ClassReportFlowModal 行为抽取
 *
 * useClassReport(end, options) — 三端通用的开课记录上报状态机：
 * - formState：ClassReportPayload 草稿
 * - currentStep：当前步骤索引（0..n）
 * - loading / error
 * - canSubmit：基础必填校验通过 & 非提交中
 * - nextStep / prevStep / reset
 * - submit：内部调用 submitClassReport(end, formState)，成功后 emit 回调
 *
 * 本 Story 只保证现有行为可迁移（mentor / lead-mentor / assistant 三端 ReportModal），
 * 不引入 S-056 的新业务字段校验。
 */
export interface UseClassReportOptions {
  /** 预填学员 ID（如从详情页直接发起上报） */
  prefilledStudentId?: number
  /** 预填关联类型（如从模拟应聘详情发起上报） */
  prefilledReferenceType?: ClassReportPayload['referenceType']
  /** 预填关联 ID */
  prefilledReferenceId?: number
  /** 只读字段（在 UI 层禁用），本 composable 不强校验，仅作为状态透传 */
  readonlyFields?: Array<keyof ClassReportPayload>
  /** 总步骤数（默认 3：基本信息 / 内容 / 反馈） */
  totalSteps?: number
  /** 提交成功回调（弹窗关闭、列表刷新等） */
  onSubmitted?: (payload: ClassReportPayload) => void
}

export interface UseClassReportReturn {
  formState: Ref<ClassReportPayload>
  currentStep: Ref<number>
  loading: Ref<boolean>
  error: Ref<string | null>
  canSubmit: Ref<boolean>
  readonlyFields: Ref<Array<keyof ClassReportPayload>>
  nextStep: () => void
  prevStep: () => void
  reset: () => void
  submit: () => Promise<void>
}

const DEFAULT_COURSE_TYPE: CourseType = 'job_coaching'
const DEFAULT_MEMBER_STATUS: MemberStatus = 'normal'

function buildInitialFormState(
  options: UseClassReportOptions = {},
): ClassReportPayload {
  return {
    studentId: options.prefilledStudentId ?? 0,
    classDate: '',
    durationHours: 1,
    courseType: DEFAULT_COURSE_TYPE,
    referenceType: options.prefilledReferenceType,
    referenceId: options.prefilledReferenceId,
    baseCourseCategory: undefined,
    baseCourseTopics: undefined,
    memberStatus: DEFAULT_MEMBER_STATUS,
    absentRemark: undefined,
    rate: undefined,
    feedbackContent: undefined,
    screenshotUrls: undefined,
  }
}

/**
 * 基础必填校验：studentId / classDate / durationHours / courseType / memberStatus 缺失时拒绝。
 *
 * 注意：本 Story 不引入 §4A 新业务字段（如关联申请必填、缺勤备注必填等），
 * 这些将由 S-056 在 useClassReport 之外的 Step 校验中加入。
 */
function isBaseRequiredFilled(form: ClassReportPayload): boolean {
  if (!form.studentId || form.studentId <= 0) return false
  if (!form.classDate) return false
  if (typeof form.durationHours !== 'number' || form.durationHours <= 0) return false
  if (!form.courseType) return false
  if (!form.memberStatus) return false
  return true
}

export function useClassReport(
  end: ClassReportEnd,
  options: UseClassReportOptions = {},
): UseClassReportReturn {
  const totalSteps = Math.max(1, options.totalSteps ?? 3)

  const formState = ref<ClassReportPayload>(buildInitialFormState(options))
  const currentStep = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const readonlyFields = ref<Array<keyof ClassReportPayload>>(
    options.readonlyFields ?? [],
  )

  const canSubmit = computed(() => {
    if (loading.value) return false
    return isBaseRequiredFilled(formState.value)
  })

  const nextStep = (): void => {
    if (currentStep.value < totalSteps - 1) {
      currentStep.value += 1
    }
  }

  const prevStep = (): void => {
    if (currentStep.value > 0) {
      currentStep.value -= 1
    }
  }

  const reset = (): void => {
    formState.value = buildInitialFormState(options)
    currentStep.value = 0
    loading.value = false
    error.value = null
  }

  const submit = async (): Promise<void> => {
    if (!canSubmit.value) {
      // 必填缺失或正在提交：拒绝发请求，避免脏数据
      return
    }
    loading.value = true
    error.value = null
    try {
      const payload = { ...formState.value }
      await submitClassReport(end, payload)
      options.onSubmitted?.(payload)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    formState,
    currentStep,
    loading,
    error,
    canSubmit,
    readonlyFields,
    nextStep,
    prevStep,
    reset,
    submit,
  }
}
