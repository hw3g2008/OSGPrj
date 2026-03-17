<template>
  <div v-if="modelValue" class="test-bank-modal">
    <div class="test-bank-modal__backdrop" @click="close" />
    <div class="test-bank-modal__panel">
      <header class="test-bank-modal__hero">
        <span class="test-bank-modal__eyebrow">Online Test Bank</span>
        <h3>{{ mode === 'edit' ? '编辑题库' : '新增题库' }}</h3>
        <p>维护 HireVue、Pymetrics、SHL 等在线测试资源。</p>
      </header>

      <div class="test-bank-modal__grid">
        <label class="test-bank-modal__field">
          <span>题库名称</span>
          <input v-model.trim="form.testBankName" type="text" placeholder="题库名称">
        </label>

        <label class="test-bank-modal__field">
          <span>公司</span>
          <input v-model.trim="form.companyName" type="text" placeholder="公司">
        </label>

        <label class="test-bank-modal__field">
          <span>类型</span>
          <select v-model="form.testType">
            <option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="test-bank-modal__field">
          <span>题目数</span>
          <input v-model.number="form.questionCount" type="number" min="1" placeholder="题目数">
        </label>

        <label class="test-bank-modal__field test-bank-modal__field--full">
          <span>状态</span>
          <select v-model="form.status">
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </label>
      </div>

      <footer class="test-bank-modal__footer">
        <button type="button" class="ghost-button" @click="close">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">
          {{ mode === 'edit' ? '保存修改' : '创建题库' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SaveTestBankPayload, TestBankRow, TestBankType } from '@osg/shared/api/admin/testBank'

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

<style scoped lang="scss">
.test-bank-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.test-bank-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.test-bank-modal__panel {
  position: relative;
  z-index: 1;
  width: min(680px, calc(100vw - 32px));
  margin: 56px auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.test-bank-modal__hero {
  padding: 24px;
  color: #eff6ff;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
}

.test-bank-modal__hero h3,
.test-bank-modal__hero p {
  margin: 0;
}

.test-bank-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.test-bank-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 24px;
}

.test-bank-modal__field {
  display: grid;
  gap: 8px;
}

.test-bank-modal__field--full {
  grid-column: 1 / -1;
}

.test-bank-modal__field input,
.test-bank-modal__field select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.test-bank-modal__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 24px 24px;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #f1f5f9;
  color: #334155;
}

.primary-button {
  background: #2563eb;
  color: #fff;
}
</style>
