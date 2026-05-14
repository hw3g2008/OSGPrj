<template>
  <OverlaySurfaceModal
    surface-id="modal-interview-bank-form"
    :open="modelValue"
    width="620px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-frequently-asked-questions" aria-hidden="true" />
        <span>{{ mode === 'edit' ? $t('edit_question_bank') : $t('add_question_bank') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('question_bank_name')">
            <a-input v-model:value="form.interviewBankName" :placeholder="$t('question_bank_name')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('interview_stage')">
            <a-select v-model:value="form.interviewStage">
              <a-select-option v-for="option in interviewStageOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('type')">
            <a-select v-model:value="form.interviewType">
              <a-select-option v-for="option in interviewTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('industry')">
            <a-select v-model:value="form.industryName">
              <a-select-option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('question_count')">
            <a-input-number v-model:value="form.questionCount" :min="1" :placeholder="$t('question_count')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('status')">
            <a-select v-model:value="form.status">
              <a-select-option value="enabled">{{ $t('enable') }}</a-select-option>
              <a-select-option value="disabled">{{ $t('disable') }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">
        {{ mode === 'edit' ? $t('save_changes') : $t('create_question_bank') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type {
  InterviewBankRow,
  InterviewIndustry,
  InterviewStage,
  InterviewType,
  SaveInterviewBankPayload
} from '@osg/shared/api/admin/interviewBank'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const interviewStageOptions: InterviewStage[] = ['Screening Call', 'First Round', 'Second Round', 'Superday']
const interviewTypeOptions: InterviewType[] = ['Behavioral', 'Technical', 'Case']
const industryOptions: InterviewIndustry[] = ['Investment Banking', 'Consulting', 'PE', 'VC']

const props = withDefaults(defineProps<{
  modelValue: boolean
  submitting?: boolean
  mode?: 'create' | 'edit'
  initialValue?: Partial<InterviewBankRow> | null
}>(), {
  submitting: false,
  mode: 'create',
  initialValue: null
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: SaveInterviewBankPayload): void
}>()

const createInitialForm = (): SaveInterviewBankPayload => ({
  interviewBankName: '',
  interviewStage: 'Screening Call',
  interviewType: 'Behavioral',
  industryName: 'Investment Banking',
  questionCount: 10,
  status: 'enabled'
})

const form = reactive<SaveInterviewBankPayload>(createInitialForm())

watch(
  () => [props.modelValue, props.initialValue, props.mode] as const,
  ([open, initialValue]) => {
    if (!open) {
      Object.assign(form, createInitialForm())
      return
    }

    Object.assign(form, createInitialForm(), {
      interviewBankName: initialValue?.interviewBankName ?? '',
      interviewStage: initialValue?.interviewStage ?? 'Screening Call',
      interviewType: initialValue?.interviewType ?? 'Behavioral',
      industryName: initialValue?.industryName ?? 'Investment Banking',
      questionCount: initialValue?.questionCount ?? 10,
      status: initialValue?.status ?? 'enabled'
    })
  },
  { immediate: true }
)

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('confirm', {
    interviewBankName: form.interviewBankName,
    interviewStage: form.interviewStage,
    interviewType: form.interviewType,
    industryName: form.industryName,
    questionCount: Number(form.questionCount),
    status: form.status
  })
}
</script>
