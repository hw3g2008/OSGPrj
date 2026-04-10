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
        <span>{{ mode === 'edit' ? '编辑题库' : '新增题库' }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="题库名称">
            <a-input v-model:value="form.testBankName" placeholder="题库名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="公司">
            <a-input v-model:value="form.companyName" placeholder="公司" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="类型">
            <a-select v-model:value="form.testType">
              <a-select-option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="题目数">
            <a-input-number v-model:value="form.questionCount" :min="1" placeholder="题目数" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="状态">
            <a-select v-model:value="form.status">
              <a-select-option value="enabled">启用</a-select-option>
              <a-select-option value="disabled">禁用</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">
        {{ mode === 'edit' ? '保存修改' : '创建题库' }}
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
