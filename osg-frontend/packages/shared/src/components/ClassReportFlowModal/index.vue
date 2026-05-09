<template>
  <a-modal
    :open="visible"
    :width="800"
    :destroy-on-close="true"
    :mask-closable="false"
    :body-style="{ maxHeight: '70vh', overflowY: 'auto' }"
    :body-class="loading ? 'class-report-flow-modal__body osg-modal-form osg-modal-form--submitting' : 'class-report-flow-modal__body osg-modal-form'"
    title="上报课程记录"
    @update:open="onVisibleChange"
    @cancel="onCancel"
  >
    <div class="class-report-flow-modal" data-surface-id="shared-class-report-flow-modal">
      <!-- Step 进度指示 -->
      <div class="class-report-flow-modal__steps">
        <div
          v-for="(label, idx) in stepLabels"
          :key="idx"
          class="class-report-flow-modal__step"
          :class="{ active: currentStep === idx, done: currentStep > idx }"
        >
          <span class="step-index">{{ idx + 1 }}</span>
          <span class="step-label">{{ label }}</span>
        </div>
      </div>

      <!-- Step 1: 基本信息 -->
      <div v-show="currentStep === 0">
        <StepBasicInfo
          :model-value="formState"
          :students="students"
          :loading="studentsLoading"
          :empty-text="studentEmptyText"
          :readonly-fields="readonlyFieldsRef"
          @update:model-value="onFormPatch"
        />
      </div>

      <!-- Step 2: 课程类型 -->
      <div v-show="currentStep === 1">
        <StepCourseType
          :model-value="formState.courseType"
          :readonly="isCourseTypeLocked"
          @update:model-value="(v) => onFormPatch({ ...formState, courseType: v })"
          @change="onCourseTypeChange"
        />
      </div>

      <!-- Step 3: 关联申请 / 基础课分支（旷课跳过） -->
      <div v-show="currentStep === 2">
        <div v-if="isAbsent" class="class-report-flow-modal__skip">
          旷课分支：跳过关联申请选择
        </div>
        <StepReference
          v-else
          :model-value="formState"
          :course-type="formState.courseType"
          :student-id="formState.studentId"
          :end="end"
          :readonly-fields="readonlyFieldsRef"
          @update:model-value="onFormPatch"
        />
      </div>

      <!-- Step 4: 学员状态 -->
      <div v-show="currentStep === 3">
        <StepMemberStatus
          :model-value="formState"
          @update:model-value="onFormPatch"
          @absent-toggle="onAbsentToggle"
        />
      </div>

      <!-- Step 5: 反馈 / 评分（旷课跳过） -->
      <div v-show="currentStep === 4">
        <div v-if="isAbsent" class="class-report-flow-modal__skip">
          旷课分支：无需填写反馈与评分
        </div>
        <template v-else>
          <!-- T-508: RelationFeedback 需要独立传递 screenshotUrls -->
          <component
            :is="feedbackComponent"
            v-if="feedbackComponent"
            :model-value="(formState.feedbackContent as Record<string, unknown>) || {}"
            :base-course-category="formState.baseCourseCategory"
            :screenshot-urls="formState.courseType === 'relation_test' ? (formState.screenshotUrls ?? []) : undefined"
            @update:model-value="(v: any) => onFormPatch({ ...formState, feedbackContent: v })"
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
        </template>
      </div>

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
        <a-button v-if="currentStep > 0" :disabled="loading" @click="goPrev">上一步</a-button>
        <a-button @click="onCancel">取消</a-button>
        <a-button
          v-if="currentStep < totalSteps - 1"
          type="primary"
          :disabled="!canGoNext"
          @click="goNext"
        >
          下一步
        </a-button>
        <!-- T-515: 提交按钮 — 学员下拉为空时 disabled；T-518: loading 时显示"提交中..." -->
        <a-button
          v-else
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
 * - ②栏反推锁定：prefilledReferenceType=application + prefilledReferenceId 时锁 courseType=job_coaching
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

const totalSteps = 5

const stepLabels = ['基本信息', '课程类型', '关联申请', '学员状态', '反馈评分']

// useClassReport 提供 formState / currentStep / loading / error / reset
const {
  formState,
  currentStep,
  loading,
  error,
  reset,
} = useClassReport(props.end, {
  prefilledStudentId: props.prefilledStudentId,
  prefilledReferenceType: props.prefilledReferenceType,
  prefilledReferenceId: props.prefilledReferenceId,
  totalSteps,
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
const isCourseTypeLocked = computed(
  () =>
    props.prefilledReferenceType === 'application' &&
    !!props.prefilledReferenceId &&
    props.prefilledReferenceId > 0,
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

// 基础校验：每步是否可进入下一步
const canGoNext = computed(() => {
  if (currentStep.value === 0) {
    const f = formState.value
    return !!f.studentId && f.studentId > 0 && !!f.classDate && f.durationHours > 0
  }
  if (currentStep.value === 1) {
    return !!formState.value.courseType
  }
  if (currentStep.value === 2) {
    // T-512: base_course + normal 时校验三级题目必选规则（absent 时 goNext 会跳过此步）
    if (!isAbsent.value && formState.value.courseType === 'base_course') {
      const cat = formState.value.baseCourseCategory
      if (!cat) return false
      const topics = formState.value.baseCourseTopics || []
      if (cat === 'tech') {
        const required = topics.filter((t) => /^T(0[1-9]|1[0-9])$/.test(t))
        if (required.length === 0) return false
      }
      if (cat === 'behavior') {
        if (topics.length === 0) return false
      }
    }
    return true
  }
  return true
})

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
  if (!f.courseType) return false
  if (!f.memberStatus) return false
  if (isAbsent.value && !f.absentRemark) return false
  // T-514: 正常上课时 rate 必填，旷课时跳过
  if (!isAbsent.value) {
    const rate = f.rate
    if (!rate || rate.trim() === '') return false
  }
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

function goNext(): void {
  if (currentStep.value < totalSteps - 1) {
    // absent 时跳过 step 2 (reference) 和 step 4 (feedback)
    if (isAbsent.value && currentStep.value === 2) {
      currentStep.value = 3
      return
    }
    currentStep.value += 1
  }
}

function goPrev(): void {
  if (currentStep.value > 0) {
    currentStep.value -= 1
  }
}

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
    const payload: ClassReportPayload = {
      ...formState.value,
      // T-414: 旷课时 rate 为 null
      rate: isAbsent.value ? undefined : formState.value.rate,
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
        formState.value = {
          ...formState.value,
          courseType: 'job_coaching',
          referenceType: 'application',
          referenceId: props.prefilledReferenceId,
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

.class-report-flow-modal__steps {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.class-report-flow-modal__step {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 13px;

  .step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #e5e7eb;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
  }

  &.active {
    color: #1f2937;
    .step-index {
      background: #2563eb;
      color: #fff;
    }
  }

  &.done {
    color: #10b981;
    .step-index {
      background: #10b981;
      color: #fff;
    }
  }
}

.class-report-flow-modal__skip {
  padding: 16px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 6px;
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
