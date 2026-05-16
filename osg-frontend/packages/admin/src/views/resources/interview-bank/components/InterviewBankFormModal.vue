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
        <span>{{ mode === 'edit' ? t('admin.resources.interviewBank.modal.titleEdit') : t('admin.resources.interviewBank.modal.titleCreate') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.nameLabel')">
            <a-input v-model:value="form.interviewBankName" :placeholder="t('admin.resources.interviewBank.modal.namePlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.stageLabel')">
            <a-select v-model:value="form.interviewStage">
              <a-select-option v-for="option in interviewStageOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.typeLabel')">
            <a-select v-model:value="form.interviewType">
              <a-select-option v-for="option in interviewTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.industryLabel')">
            <a-select v-model:value="form.industryName">
              <a-select-option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.countLabel')">
            <a-input-number v-model:value="form.questionCount" :min="1" :placeholder="t('admin.resources.interviewBank.modal.countPlaceholder')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.interviewBank.modal.statusLabel')">
            <a-select v-model:value="form.status">
              <a-select-option value="enabled">{{ t('admin.resources.interviewBank.modal.statusEnabled') }}</a-select-option>
              <a-select-option value="disabled">{{ t('admin.resources.interviewBank.modal.statusDisabled') }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ t('admin.resources.interviewBank.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">
        {{ mode === 'edit' ? t('admin.resources.interviewBank.modal.save') : t('admin.resources.interviewBank.modal.create') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  InterviewBankRow,
  InterviewIndustry,
  InterviewStage,
  InterviewType,
  SaveInterviewBankPayload
} from '@osg/shared/api/admin/interviewBank'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

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
