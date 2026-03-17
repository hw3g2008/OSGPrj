<template>
  <div v-if="modelValue" class="interview-bank-modal">
    <div class="interview-bank-modal__backdrop" @click="close" />
    <div class="interview-bank-modal__panel">
      <header class="interview-bank-modal__hero">
        <span class="interview-bank-modal__eyebrow">Interview Bank</span>
        <h3>{{ mode === 'edit' ? '编辑题库' : '新增题库' }}</h3>
        <p>维护真人面试问题集锦，按阶段和类型分类管理。</p>
      </header>

      <div class="interview-bank-modal__grid">
        <label class="interview-bank-modal__field">
          <span>题库名称</span>
          <input v-model.trim="form.interviewBankName" type="text" placeholder="题库名称">
        </label>

        <label class="interview-bank-modal__field">
          <span>面试阶段</span>
          <select v-model="form.interviewStage">
            <option v-for="option in interviewStageOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="interview-bank-modal__field">
          <span>类型</span>
          <select v-model="form.interviewType">
            <option v-for="option in interviewTypeOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="interview-bank-modal__field">
          <span>行业</span>
          <select v-model="form.industryName">
            <option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="interview-bank-modal__field">
          <span>题目数</span>
          <input v-model.number="form.questionCount" type="number" min="1" placeholder="题目数">
        </label>

        <label class="interview-bank-modal__field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </label>
      </div>

      <footer class="interview-bank-modal__footer">
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
import type {
  InterviewBankRow,
  InterviewIndustry,
  InterviewStage,
  InterviewType,
  SaveInterviewBankPayload
} from '@osg/shared/api/admin/interviewBank'

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

<style scoped lang="scss">
.interview-bank-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.interview-bank-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.interview-bank-modal__panel {
  position: relative;
  z-index: 1;
  width: min(720px, calc(100vw - 32px));
  margin: 56px auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.interview-bank-modal__hero {
  padding: 24px;
  color: #eff6ff;
  background: linear-gradient(135deg, #0f766e, #2563eb);
}

.interview-bank-modal__hero h3,
.interview-bank-modal__hero p {
  margin: 0;
}

.interview-bank-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.interview-bank-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 24px;
}

.interview-bank-modal__field {
  display: grid;
  gap: 8px;
}

.interview-bank-modal__field input,
.interview-bank-modal__field select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.interview-bank-modal__footer {
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
  background: #0f766e;
  color: #fff;
}
</style>
