<template>
  <div
    v-if="visible"
    class="base-course-feedback osg-modal-form"
    data-feedback="base-course"
    :data-base-category="baseCourseCategory || ''"
  >
    <!-- D: 'resume' 类目下二级 radio（新简历制作 / 简历更新） -->
    <div v-if="isResumeCategory" class="form-group">
      <label class="form-label">简历类型 <span class="required">*</span></label>
      <a-radio-group
        :value="resumeSubType || undefined"
        @update:value="(v: ResumeSubType) => emit('update:resumeSubType', v)"
      >
        <a-radio
          v-for="opt in resumeSubTypeOptions"
          :key="opt.value"
          :value="opt.value"
        >{{ opt.label }}</a-radio>
      </a-radio-group>
    </div>

    <div class="form-group">
      <label class="form-label">课程反馈</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        :placeholder="narrativePlaceholder"
        @update:value="update('narrative', $event)"
      />
    </div>

    <!-- D: 简历更新 → 双槽位（原 + 新）；新简历制作 → 单槽位（新简历） -->
    <div v-if="showResumeSlots" class="resume-slots" :data-slot-mode="resumeSlotMode">
      <div v-if="resumeSlotMode === 'update'" class="form-group" data-slot="original-resume">
        <label class="form-label">上传原简历</label>
        <ResumeUpload
          :model-value="payload.originalResumeUrl"
          slot-label="原简历"
          :max-size-mb="10"
          accept=".pdf,.doc,.docx"
          @update:model-value="update('originalResumeUrl', $event ?? '')"
        />
      </div>

      <div class="form-group" data-slot="updated-resume">
        <label class="form-label">{{ resumeSlotMode === 'new' ? '上传新简历' : '上传修改后简历' }}</label>
        <ResumeUpload
          :model-value="payload.updatedResumeUrl"
          :slot-label="resumeSlotMode === 'new' ? '新简历' : '修改后简历'"
          :max-size-mb="10"
          accept=".pdf,.doc,.docx"
          @update:model-value="update('updatedResumeUrl', $event ?? '')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BaseCategory, ResumeSubType } from '../../../types/classReport'
import { RESUME_SUBTYPE_OPTIONS } from '../../../constants/classReport'
import ResumeUpload from '../widgets/ResumeUpload.vue'

export interface BaseCourseFeedbackPayload {
  schemaVersion: 1
  narrative: string
  /** T-513: 原简历 URL，落 feedbackContent.originalResumeUrl，不新增 DB 列 */
  originalResumeUrl?: string
  /** T-513: 修改后简历 URL，落 feedbackContent.updatedResumeUrl，不新增 DB 列 */
  updatedResumeUrl?: string
}

const props = defineProps<{
  modelValue?: Partial<BaseCourseFeedbackPayload>
  baseCourseCategory?: BaseCategory | ''
  resumeSubType?: ResumeSubType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BaseCourseFeedbackPayload]
  'update:resumeSubType': [value: ResumeSubType]
}>()

const resumeSubTypeOptions = RESUME_SUBTYPE_OPTIONS

function defaults(): BaseCourseFeedbackPayload {
  return {
    schemaVersion: 1,
    narrative: '',
    originalResumeUrl: '',
    updatedResumeUrl: '',
  }
}

const payload = computed<BaseCourseFeedbackPayload>(() => ({
  ...defaults(),
  ...(props.modelValue || {}),
  schemaVersion: 1,
}))

// 二级类型 = tech / behavior 时不显示反馈区（topic 由父弹窗管理）
const visible = computed(
  () => props.baseCourseCategory !== 'tech' && props.baseCourseCategory !== 'behavior',
)

// D: 是否在 'resume' 合并类目下
const isResumeCategory = computed(() => props.baseCourseCategory === 'resume')

// D: 上传槽位模式（new=单槽位上传新简历；update=双槽位）；旧 enum 'new_resume'/'resume_update' 兼容
const resumeSlotMode = computed<'new' | 'update' | ''>(() => {
  if (props.baseCourseCategory === 'resume') {
    return props.resumeSubType ?? ''
  }
  if (props.baseCourseCategory === 'resume_update') return 'update'
  if (props.baseCourseCategory === 'new_resume') return 'new'
  return ''
})

const showResumeSlots = computed(() => resumeSlotMode.value !== '')

const narrativePlaceholder = computed(() => {
  // 优先看 resumeSubType / 旧 enum
  if (resumeSlotMode.value === 'update') return '请描述简历修改的主要内容和建议...'
  if (resumeSlotMode.value === 'new') return '请描述新简历的撰写要点...'
  if (props.baseCourseCategory === 'resume') return '请先选择简历类型（新简历制作 / 简历更新）'
  if (props.baseCourseCategory === 'case_study') return '请描述本次案例分析的主要内容...'
  return '请详细描述本次课程内容和学员表现...'
})

function update<K extends keyof BaseCourseFeedbackPayload>(
  key: K,
  value: BaseCourseFeedbackPayload[K],
) {
  emit('update:modelValue', { ...buildSanitized(), [key]: value })
}

/**
 * 切换 category 时不丢失 narrative，但清理不适用的 resume url 字段
 */
function buildSanitized(): BaseCourseFeedbackPayload {
  const next: BaseCourseFeedbackPayload = { ...payload.value, schemaVersion: 1 }
  if (!showResumeSlots.value) {
    next.originalResumeUrl = ''
    next.updatedResumeUrl = ''
  }
  return next
}
</script>

<style scoped lang="scss">
.base-course-feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.resume-slots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
