<template>
  <OverlaySurfaceModal
    surface-id="modal-question-review"
    :open="modelValue"
    width="900px"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-check-outline" aria-hidden="true" />
        <span>{{ t('admin.resources.questions.modal.title') }}</span>
      </span>
    </template>

    <div v-if="row" style="display:grid;gap:18px">
      <a-card size="small" :title="t('admin.resources.questions.modal.studentInfo')">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item :label="t('admin.resources.questions.modal.submittedBy')">{{ row.studentName }} <span style="color:#94a3b8">{{ row.studentId || '—' }}</span></a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.columns.source')">{{ formatSourceType(row.sourceType) }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.columns.submittedAt')">{{ formatTime(row.submittedAt) }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" :title="t('admin.resources.questions.modal.interviewInfo')">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item :label="t('admin.resources.questions.columns.company')">{{ row.companyName }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.columns.department')">{{ row.departmentName }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.columns.officeLocation')">{{ row.officeLocation }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.columns.round')">{{ row.interviewRound }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.modal.interviewDate')">{{ formatTime(row.interviewDate) }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.modal.interviewer')">{{ row.interviewerName || '—' }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.resources.questions.modal.interviewStatus')">{{ row.interviewStatus }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" :title="t('admin.resources.questions.modal.questions')">
        <ol style="display:grid;gap:10px;margin:0;padding-left:18px">
          <li v-for="(item, index) in row.questionItems || []" :key="`${row.questionId}-${index}`" style="padding:10px 12px;border-left:4px solid #4f83cc;border-radius:12px;background:#f8fafc">
            <strong>Q{{ index + 1 }}</strong>
            <span style="margin-left:8px">{{ item }}</span>
          </li>
        </ol>
      </a-card>

      <a-card size="small" :title="t('admin.resources.questions.modal.additionalNotes')">
        <p style="margin:0;color:#334155">{{ row.supplementalNote || t('admin.resources.questions.modal.noAdditionalNotes') }}</p>
      </a-card>

      <a-alert type="success" show-icon style="border-radius:12px">
        <template #message>{{ t('admin.resources.questions.modal.scopePreview') }}</template>
        <template #description>
          {{ t('admin.resources.questions.modal.willShareWith') }} {{ row.sharePreview || t('admin.resources.questions.modal.sameScope') }} {{ t('admin.resources.questions.modal.students') }}，
          {{ t('admin.resources.questions.modal.currentlyMatching') }}：{{ row.eligibleStudentCount || 0 }} {{ t('admin.resources.questions.modal.people') }}
        </template>
      </a-alert>

      <a-form layout="vertical">
        <a-form-item :label="t('admin.resources.questions.modal.reviewNotes')">
          <a-textarea v-model:value="comment" :rows="3" :placeholder="t('admin.resources.questions.modal.reviewNotesPlaceholder')" />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ t('admin.resources.questions.actions.cancel') }}</a-button>
      <a-button danger :loading="submitting" :disabled="!row" @click="emitReject">{{ t('admin.resources.questions.actions.reject') }}</a-button>
      <a-button type="primary" :loading="submitting" :disabled="!row" @click="emitApprove">{{ t('admin.resources.questions.actions.approveAndShare') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { i18n } from '@osg/shared'
import type { InterviewQuestionRow } from '@osg/shared/api/admin/question'
import { OverlaySurfaceModal } from '@osg/shared/components'

const t = (key: string) => (i18n.global.t as unknown as (k: string) => string)(key)

const formatSourceType = (sourceType: string) =>
  sourceType === '入职面试申请' // i18n-skip-line: backend values
    ? t('admin.resources.questions.sources.interviewApplication')
    : t('admin.resources.questions.sources.selfSubmitted')

const props = defineProps<{
  modelValue: boolean
  row: InterviewQuestionRow | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'approve', payload: { row: InterviewQuestionRow; reviewComment?: string }): void
  (event: 'reject', payload: { row: InterviewQuestionRow; reviewComment?: string }): void
}>()

const comment = ref('')

const row = computed(() => props.row)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible)
    {
      comment.value = props.row?.reviewComment || ''
    }
  }
)

const emitApprove = () => {
  if (!row.value) return
  emit('approve', { row: row.value, reviewComment: comment.value || undefined })
}

const emitReject = () => {
  if (!row.value) return
  emit('reject', { row: row.value, reviewComment: comment.value || undefined })
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}
</script>
