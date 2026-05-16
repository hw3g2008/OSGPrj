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
        <span>{{ mode === 'edit' ? t('admin.resources.onlineTestBank.modal.titleEdit') : t('admin.resources.onlineTestBank.modal.titleCreate') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.onlineTestBank.modal.nameLabel')">
            <a-input v-model:value="form.testBankName" :placeholder="t('admin.resources.onlineTestBank.modal.namePlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.onlineTestBank.modal.companyLabel')">
            <a-input v-model:value="form.companyName" :placeholder="t('admin.resources.onlineTestBank.modal.companyPlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.onlineTestBank.modal.typeLabel')">
            <a-select v-model:value="form.testType">
              <a-select-option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.resources.onlineTestBank.modal.countLabel')">
            <a-input-number v-model:value="form.questionCount" :min="1" :placeholder="t('admin.resources.onlineTestBank.modal.countPlaceholder')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item :label="t('admin.resources.onlineTestBank.modal.statusLabel')">
            <a-select v-model:value="form.status">
              <a-select-option value="enabled">{{ t('admin.resources.onlineTestBank.modal.statusEnabled') }}</a-select-option>
              <a-select-option value="disabled">{{ t('admin.resources.onlineTestBank.modal.statusDisabled') }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ t('admin.resources.onlineTestBank.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">
        {{ mode === 'edit' ? t('admin.resources.onlineTestBank.modal.save') : t('admin.resources.onlineTestBank.modal.create') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SaveTestBankPayload, TestBankRow, TestBankType } from '@osg/shared/api/admin/testBank'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

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
