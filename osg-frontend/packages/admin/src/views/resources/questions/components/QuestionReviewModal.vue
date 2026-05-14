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
        <span>{{ $t('review_interview_questions') }}</span>
      </span>
    </template>

    <div v-if="row" style="display:grid;gap:18px">
      <a-card size="small" :title="$t('student_information')">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item :label="$t('submitted_by_student')">{{ row.studentName }} <span style="color:#94a3b8">{{ row.studentId || '—' }}</span></a-descriptions-item>
          <a-descriptions-item :label="$t('source')">{{ sourceTypeDisplay(row.sourceType) }}</a-descriptions-item>
          <a-descriptions-item :label="$t('submission_time')">{{ formatTime(row.submittedAt) }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" :title="$t('interview_information')">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item :label="$t('company')">{{ row.companyName }}</a-descriptions-item>
          <a-descriptions-item :label="$t('department')">{{ row.departmentName }}</a-descriptions-item>
          <a-descriptions-item :label="$t('office_location')">{{ row.officeLocation }}</a-descriptions-item>
          <a-descriptions-item :label="$t('round')">{{ row.interviewRound }}</a-descriptions-item>
          <a-descriptions-item :label="$t('interview_date')">{{ formatTime(row.interviewDate) }}</a-descriptions-item>
          <a-descriptions-item :label="$t('interviewer')">{{ row.interviewerName || '—' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('interview_status')">{{ row.interviewStatus }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" :title="$t('interview_questions')">
        <ol style="display:grid;gap:10px;margin:0;padding-left:18px">
          <li v-for="(item, index) in row.questionItems || []" :key="`${row.questionId}-${index}`" style="padding:10px 12px;border-left:4px solid #4f83cc;border-radius:12px;background:#f8fafc">
            <strong>Q{{ index + 1 }}</strong>
            <span style="margin-left:8px">{{ item }}</span>
          </li>
        </ol>
      </a-card>

      <a-card size="small" :title="$t('additional_notes')">
        <p style="margin:0;color:#334155">{{ row.supplementalNote || $t('no_additional_notes') }}</p>
      </a-card>

      <a-alert type="success" show-icon style="border-radius:12px">
        <template #message>{{ $t('access_scope_preview') }}</template>
        <template #description>
          {{ $t('will_be_shared_with_applicants_from') }} {{ row.sharePreview || $t('same_company_same_department_same_office') }} {{ $t('students') }}，
          {{ $t('currently_matching') }}：{{ row.eligibleStudentCount || 0 }} {{ $t('people') }}
        </template>
      </a-alert>

      <a-form layout="vertical">
        <a-form-item :label="$t('review_notes_2')">
          <a-textarea v-model:value="comment" :rows="3" :placeholder="`${$t('additional_review_comments_optional')}）`" />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ $t('cancel') }}</a-button>
      <a-button danger :loading="submitting" :disabled="!row" @click="emitReject">{{ $t('reject_2') }}</a-button>
      <a-button type="primary" :loading="submitting" :disabled="!row" @click="emitApprove">{{ $t('approve_and_share') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { QUESTION_SOURCE_TYPE_MAP, type InterviewQuestionRow } from '@osg/shared/api/admin/question'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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

const { t } = useI18n()
const sourceTypeDisplay = (raw: string) => {
  const entry = QUESTION_SOURCE_TYPE_MAP[raw]
  return entry ? t(entry.i18nKey) : raw
}

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

