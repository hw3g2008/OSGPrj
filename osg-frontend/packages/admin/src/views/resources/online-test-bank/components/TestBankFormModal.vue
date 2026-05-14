<template>
  <OverlaySurfaceModal
    surface-id="modal-test-bank-form"
    :open="modelValue"
    width="600px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-clipboard-text-outline" aria-hidden="true" />
        <span>{{ mode === 'edit' ? $t('edit_question_bank') : $t('add_question_bank') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('question_bank_name')">
            <a-input v-model:value="form.testBankName" :placeholder="$t('question_bank_name')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('company')">
            <a-input v-model:value="form.companyName" :placeholder="$t('company')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('type')">
            <a-select v-model:value="form.testType">
              <a-select-option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('question_count')">
            <a-input-number v-model:value="form.questionCount" :min="1" :placeholder="$t('question_count')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
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
import type { SaveTestBankPayload, TestBankRow, TestBankType } from '@osg/shared/api/admin/testBank'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const testTypeOptions: TestBankType[] = ['HireVue', 'Pymetrics', 'SHL']

const props = withDefaults(defineProps<{
  modelValue: boolean
  submitting?: boolean
  mode?: 'create' | 'edit'
  initialValue?: Partial<TestBankRow> | null
}>(), {
  submitting: false,
  mode: 'create',
  initialValue: null
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: SaveTestBankPayload): void
}>()

const createInitialForm = (): SaveTestBankPayload => ({
  testBankName: '',
  companyName: '',
  testType: 'HireVue',
  questionCount: 10,
  status: 'enabled'
})

const form = reactive<SaveTestBankPayload>(createInitialForm())

watch(
  () => [props.modelValue, props.initialValue, props.mode] as const,
  ([open, initialValue]) => {
    if (!open) {
      Object.assign(form, createInitialForm())
      return
    }

    Object.assign(form, createInitialForm(), {
      testBankName: initialValue?.testBankName ?? '',
      companyName: initialValue?.companyName ?? '',
      testType: initialValue?.testType ?? 'HireVue',
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
    testBankName: form.testBankName,
    companyName: form.companyName,
    testType: form.testType,
    questionCount: Number(form.questionCount),
    status: form.status
  })
}
</script>
