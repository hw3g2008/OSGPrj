<template>
  <div
    v-if="visible"
    class="base-course-feedback osg-modal-form"
    data-feedback="base-course"
    :data-base-category="baseCourseCategory || ''"
  >
    <div class="form-group">
      <label class="form-label">课程反馈</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        :placeholder="narrativePlaceholder"
        @update:value="update('narrative', $event)"
      />
    </div>

    <!--
      T-513: subType=update_resume 时显示双槽位简历上传
      使用 ResumeUpload widget，pdf/doc/docx，单文件 ≤10MB，两槽位互相独立
      URL 落 feedbackContent.originalResumeUrl / feedbackContent.updatedResumeUrl，不新增 DB 列
    -->
    <div v-if="showResumeSlots" class="resume-slots">
      <div class="form-group" data-slot="original-resume">
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
        <label class="form-label">上传修改后简历</label>
        <ResumeUpload
          :model-value="payload.updatedResumeUrl"
          slot-label="修改后简历"
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
import type { BaseCategory } from '../../../types/classReport'
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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BaseCourseFeedbackPayload]
}>()

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

// T-513: 二级类型 = resume_update 时显示双槽位
const showResumeSlots = computed(() => props.baseCourseCategory === 'resume_update')

const narrativePlaceholder = computed(() => {
  switch (props.baseCourseCategory) {
    case 'resume_update':
      return '请描述简历修改的主要内容和建议...'
    case 'new_resume':
      return '请描述新简历的撰写要点...'
    case 'case_study':
      return '请描述本次案例分析的主要内容...'
    default:
      return '请详细描述本次课程内容和学员表现...'
  }
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
