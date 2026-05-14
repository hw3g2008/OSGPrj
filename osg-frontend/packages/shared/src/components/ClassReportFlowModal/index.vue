<template>
  <a-modal
    :open="visible"
    :width="800"
    :destroy-on-close="true"
    :mask-closable="false"
    :body-style="{ maxHeight: '85vh', overflowY: 'auto' }"
    :body-class="loading ? 'class-report-flow-modal__body osg-modal-form osg-modal-form--submitting' : 'class-report-flow-modal__body osg-modal-form'"
    title="上报课程记录"
    @update:open="onVisibleChange"
    @cancel="onCancel"
  >
    <div class="class-report-flow-modal" data-surface-id="shared-class-report-flow-modal">
      <!-- §C3: 单屏滚动版 — 5 个 section 并列渲染，按字段依赖条件显示，不再用 step wizard -->

      <!-- ① 基本信息（学员 / 日期 / 时长，始终显示） -->
      <section class="class-report-flow-modal__section">
        <StepBasicInfo
          :model-value="formState"
          :students="students"
          :loading="studentsLoading"
          :empty-text="studentEmptyText"
          :readonly-fields="readonlyFieldsRef"
          @update:model-value="onFormPatch"
        />
      </section>

      <!-- ② 学员状态（正常 / 旷课，始终显示） -->
      <section class="class-report-flow-modal__section">
        <StepMemberStatus
          :model-value="formState"
          @update:model-value="onFormPatch"
          @absent-toggle="onAbsentToggle"
        />
      </section>

      <!-- 正常上课分支：③ 课程类型 + ④ 关联申请 + ⑤ 反馈/评分 -->
      <template v-if="!isAbsent">
        <section class="class-report-flow-modal__section">
          <StepCourseType
            :model-value="formState.courseType"
            :readonly="isCourseTypeLocked"
            @update:model-value="(v) => onFormPatch({ ...formState, courseType: v })"
            @change="onCourseTypeChange"
          />
        </section>

        <section v-if="formState.courseType" class="class-report-flow-modal__section">
          <StepReference
            :model-value="formState"
            :course-type="formState.courseType"
            :student-id="formState.studentId"
            :end="end"
            :readonly-fields="readonlyFieldsRef"
            @update:model-value="onFormPatch"
          />
        </section>

        <section v-if="formState.courseType" class="class-report-flow-modal__section">
          <!-- T-508: RelationFeedback 需要独立传递 screenshotUrls -->
          <component
            :is="feedbackComponent"
            v-if="feedbackComponent"
            :model-value="(formState.feedbackContent as Record<string, unknown>) || {}"
            :base-course-category="formState.baseCourseCategory"
            :resume-sub-type="formState.resumeSubType"
            :screenshot-urls="formState.courseType === 'relation_test' ? (formState.screenshotUrls ?? []) : undefined"
            @update:model-value="(v: any) => onFormPatch({ ...formState, feedbackContent: v })"
            @update:resume-sub-type="(v: any) => onFormPatch({ ...formState, resumeSubType: v })"
            @update:screenshot-urls="(urls: string[]) => onFormPatch({ ...formState, screenshotUrls: urls })"
          />

          <!-- T-514: 评分输入框 — 位于反馈区下方，正常上课时必填 -->
          <div class="form-group rate-group">
            <label class="form-label">
              评分 <span class="required">*</span>
            </label>
            <a-input
              :value="formState.rate ?? ''"
              placeholder="请填写评分（不限分制）"
              style="width: 200px"
              @update:value="(v: string) => onFormPatch({ ...formState, rate: v })"
            />
            <div v-if="rateError" class="rate-error">{{ rateError }}</div>
          </div>
        </section>
      </template>

      <!-- T-518: 后端错误用 a-alert 展示 -->
      <a-alert
        v-if="errorMsg"
        type="error"
        :message="errorMsg"
        show-icon
        closable
        class="class-report-flow-modal__error"
        @close="clearError"
      />
    </div>

    <template #footer>
      <a-space>
        <a-button @click="onCancel">取消</a-button>
        <!-- T-515 / §C3: 单屏版只有"取消 / 提交"，无 step 切换按钮 -->
        <a-button
          type="primary"
          :loading="loading"
          :disabled="!canSubmit || loading"
          @click="handleSubmit"
        >
          {{ loading ? '提交中...' : (isAbsent ? '提交旷课' : '提交') }}
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * S-055/S-056 §4A.1 共享 ClassReportFlowModal 主弹窗
 *
 * - 三端通用：mentor / lead-mentor / assistant
 * - 5 step v-show 切换：基本信息 / 课程类型 / 关联申请 / 学员状态 / 反馈评分
 * - 旷课分支：memberStatus=absent 时跳过 reference + feedback，durationHours 默认 0.5
 * - ②栏反推锁定：prefilledReferenceType=application | job_coaching + prefilledReferenceId 时锁 courseType=job_coaching；referenceType 透传，不强写
 * - T-514: rate 文本输入框，正常上课时必填，旷课时为 null
 * - T-515: 学员下拉为空时提交按钮 disabled
 * - T-508: RelationFeedback screenshotUrls 独立于 feedbackContent，落 screenshot_urls 列
 * - T-518: loading 时按钮显示"提交中..."；后端错误用 a-alert；body-class 加 osg-modal-form--submitting
 */
import { computed, ref, watch, onMounted } from "vue"
import { message } from 'ant-design-vue'
import { useClassReport } from '../../composables/useClassReport'
import { useStudentScopeFinder } from '../../composables/useStudentScopeFinder'
import {
  submitClassReport,
  type ClassReportEnd,
} from '../../api/class-records'
import {
  ABSENT_DEFAULT_HOURS,
  MEMBER_STATUS,
} from '../../constants/classReport'
import type {
  ClassReportPayload,
  CourseType,
  ReferenceType,
} from '../../types/classReport'

import StepBasicInfo from './StepBasicInfo.vue'
import StepCourseType from './StepCourseType.vue'
import StepReference from './StepReference.vue'
import StepMemberStatus from './StepMemberStatus.vue'
import {
  isReferenceCourseTypeLocked,
  buildReferenceLockPatch,
} from './lockHelpers'

import JobCoachingFeedback from './feedbacks/JobCoachingFeedback.vue'
import MockInterviewFeedback from './feedbacks/MockInterviewFeedback.vue'
import RelationFeedback from './feedbacks/RelationFeedback.vue'
import MidtermFeedback from './feedbacks/MidtermFeedback.vue'
import BaseCourseFeedback from './feedbacks/BaseCourseFeedback.vue'

interface Props {
  visible: boolean
  end: ClassReportEnd
  prefilledStudentId?: number
  prefilledReferenceType?: ReferenceType
  prefilledReferenceId?: number
  readonlyFields?: Array<keyof ClassReportPayload | 'student' | 'reference'>
}

const props = withDefaults(defineProps<Props>(), {
  prefilledStudentId: undefined,
  prefilledReferenceType: undefined,
  prefilledReferenceId: undefined,
  readonlyFields: () => [],
})

const emit = defineEmits<{
  'update:visible': [v: boolean]
  submitted: [recordId: number]
}>()

// §C3: 单屏滚动版改造后不再使用 step wizard。currentStep 由 composable 内部保留供 reset 用，
//      此处不再消费；totalSteps 传 1 以兼容 composable 签名。
const {
  formState,
  loading,
  error,
  reset,
} = useClassReport(props.end, {
  prefilledStudentId: props.prefilledStudentId,
  prefilledReferenceType: props.prefilledReferenceType,
  prefilledReferenceId: props.prefilledReferenceId,
  totalSteps: 1,
})

// readonlyFields 单独维护（useClassReport 的 readonlyFields 字段不接受 'student'/'reference' 这些聚合 key）
const readonlyFieldsRef = computed(() => props.readonlyFields || [])

// 学员下拉
const {
  students,
  loading: studentsLoading,
  emptyMessage: studentEmptyText,
  isEmpty: isStudentsEmpty,
  refresh: refreshStudents,
} = useStudentScopeFinder(props.end)

// 反推锁定 courseType=job_coaching
// Step2A-F7：同时识别 application（旧 job_coaching 课消落库口径）与 job_coaching（osg_coaching 阶段记录新口径）。
// 判定逻辑抽取到 ./lockHelpers.ts，供 shared __tests__ 纯函数单测。
const isCourseTypeLocked = computed(() =>
  isReferenceCourseTypeLocked(
    props.prefilledReferenceType,
    props.prefilledReferenceId,
  ),
)

const isAbsent = computed(
  () => formState.value.memberStatus === MEMBER_STATUS.ABSENT,
)

const errorMsg = computed(() => error.value)

// T-514: rate 校验错误提示（仅在用户尝试提交后显示）
const rateSubmitAttempted = ref(false)

const rateError = computed(() => {
  if (!rateSubmitAttempted.value) return ''
  if (isAbsent.value) return ''
  const rate = formState.value.rate
  if (!rate || rate.trim() === '') return '请填写评分'
  return ''
})

// 反馈组件按 courseType 选择
const feedbackComponent = computed(() => {
  switch (formState.value.courseType) {
    case 'job_coaching':
      return JobCoachingFeedback
    case 'mock_interview':
      return MockInterviewFeedback
    case 'relation_test':
      return RelationFeedback
    case 'communication_test':
      return MidtermFeedback
    case 'base_course':
      return BaseCourseFeedback
    default:
      return null
  }
})

// §C3: 单屏版无 step 切换，所有校验汇总到 canSubmit；删除 canGoNext。

/**
 * T-514: 正常上课时 rate 必填（非空字符串）
 * T-515: 学员下拉为空时（no reportable students）禁止提交
 */
const canSubmit = computed(() => {
  if (loading.value) return false
  // T-515: 学员下拉为空时禁止提交
  if (isStudentsEmpty.value && !studentsLoading.value) return false
  const f = formState.value
  if (!f.studentId || f.studentId <= 0) return false
  if (!f.classDate) return false
  if (!f.durationHours || f.durationHours <= 0) return false
  if (!f.memberStatus) return false
  // §C3 旷课分支：只校验备注，其它字段（课程类型/反馈/评分）按 RULE-C 不要求
  if (isAbsent.value) {
    if (!f.absentRemark) return false
    return true
  }
  // 正常上课：课程类型 + 评分必填
  if (!f.courseType) return false
  // D: base_course='resume' 类目下必须选 resumeSubType
  if (f.courseType === 'base_course' && f.baseCourseCategory === 'resume' && !f.resumeSubType) {
    return false
  }
  const rate = f.rate
  if (!rate || rate.trim() === '') return false
  return true
})

function onFormPatch(next: ClassReportPayload): void {
  formState.value = { ...next }
}

function onCourseTypeChange(next: CourseType, prev?: CourseType): void {
  if (next === prev) return
  // 切换 courseType 时清理不适用字段
  formState.value = {
    ...formState.value,
    courseType: next,
    referenceType: next === 'base_course' ? undefined : formState.value.referenceType,
    referenceId: next === 'base_course' ? undefined : undefined,
    baseCourseCategory: next === 'base_course' ? formState.value.baseCourseCategory : undefined,
    baseCourseTopics: next === 'base_course' ? formState.value.baseCourseTopics : undefined,
    // D: 切走 base_course 时清除 resumeSubType
    resumeSubType: next === 'base_course' ? formState.value.resumeSubType : undefined,
    feedbackContent: undefined,
    // T-508: 切换课程类型时清除截图（截图仅属于人际关系）
    screenshotUrls: next === 'relation_test' ? formState.value.screenshotUrls : undefined,
  }
}

function onAbsentToggle(isAbsentNext: boolean): void {
  if (isAbsentNext) {
    // normal → absent：默认覆盖到 0.5
    const cur = formState.value.durationHours
    if (!cur || cur > ABSENT_DEFAULT_HOURS) {
      formState.value = {
        ...formState.value,
        durationHours: ABSENT_DEFAULT_HOURS,
      }
    }
    // T-514: 旷课时 rate 清空（提交时置 null）
    formState.value = {
      ...formState.value,
      rate: undefined,
    }
  }
}

// §C3: 单屏版无 step 切换，删除 goNext / goPrev。

async function handleSubmit(): Promise<void> {
  // T-514: 标记提交尝试，触发 rate 校验提示
  rateSubmitAttempted.value = true

  if (!canSubmit.value) {
    // T-514: rate 为空时提示
    if (!isAbsent.value) {
      const rate = formState.value.rate
      if (!rate || rate.trim() === '') {
        message.warning('请填写评分')
        return
      }
    }
    return
  }

  loading.value = true
  error.value = null
  try {
    // D: 合并 'resume' 类目 → 提交时按 resumeSubType 派生为后端 enum
    const draft = { ...formState.value }
    if (draft.baseCourseCategory === 'resume') {
      const sub = draft.resumeSubType
      if (sub === 'new') {
        draft.baseCourseCategory = 'new_resume'
      } else if (sub === 'update') {
        draft.baseCourseCategory = 'resume_update'
      }
    }
    // 不向后端透 resumeSubType（仅 UI 状态）
    delete (draft as { resumeSubType?: unknown }).resumeSubType
    const payload: ClassReportPayload = {
      ...draft,
      // T-414: 旷课时 rate 为 null
      rate: isAbsent.value ? undefined : draft.rate,
    }
    const resp = await submitClassReport(props.end, payload)
    const recordId = Number(resp?.recordId ?? 0)
    message.success('上报成功')
    emit('submitted', recordId)
    emit('update:visible', false)
    reset()
    rateSubmitAttempted.value = false
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    error.value = msg
    message.error(msg || '上报失败')
  } finally {
    loading.value = false
  }
}

function clearError(): void {
  error.value = null
}

function onCancel(): void {
  emit('update:visible', false)
  rateSubmitAttempted.value = false
}

function onVisibleChange(v: boolean): void {
  emit('update:visible', v)
}

// 弹窗打开时刷新学员下拉 + 应用反推锁定
watch(
  () => props.visible,
  (v) => {
    if (v) {
      void refreshStudents()
      rateSubmitAttempted.value = false
      // 反推锁定：如果 prefilled application + applicationId，锁 courseType=job_coaching
      if (isCourseTypeLocked.value) {
        // Step2A-F7：通过 buildReferenceLockPatch 保留 props.prefilledReferenceType 原值
        // （job_coaching 或 application），不再强写 'application'
        formState.value = {
          ...formState.value,
          ...buildReferenceLockPatch(
            props.prefilledReferenceType,
            props.prefilledReferenceId,
          ),
        }
      }
      if (props.prefilledStudentId) {
        formState.value = {
          ...formState.value,
          studentId: props.prefilledStudentId,
        }
      }
    } else {
      // 关闭时重置（destroy-on-close 已经会销毁，但内部状态也要清）
      reset()
      rateSubmitAttempted.value = false
    }
  },
  { immediate: false },
)

onMounted(() => {
  if (props.visible) {
    void refreshStudents()
  }
})
</script>

<style scoped lang="scss">
.class-report-flow-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* §C3: 单屏版 section 分隔（取代旧的 step 进度条 + skip 提示） */
.class-report-flow-modal__section {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}
.class-report-flow-modal__section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.class-report-flow-modal__error {
  margin-top: 8px;
}

/* T-414 评分区 */
.rate-group {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.rate-error {
  font-size: 12px;
  color: #ef4444;
}
</style>
