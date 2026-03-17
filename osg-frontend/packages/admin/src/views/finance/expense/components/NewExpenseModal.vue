<template>
  <div v-if="modelValue" class="expense-modal">
    <div class="expense-modal__backdrop" @click="close" />
    <div class="expense-modal__panel">
      <header class="expense-modal__hero">
        <span class="expense-modal__eyebrow">Finance Expense</span>
        <h3>新建报销</h3>
        <p>录入导师报销申请并进入审核流。</p>
      </header>

      <div class="expense-modal__grid">
        <label class="expense-modal__field">
          <span>导师 ID</span>
          <input v-model.number="form.mentorId" type="number" min="1" placeholder="导师">
        </label>

        <label class="expense-modal__field">
          <span>导师</span>
          <input v-model.trim="form.mentorName" type="text" placeholder="导师姓名">
        </label>

        <label class="expense-modal__field">
          <span>报销类型</span>
          <select v-model="form.expenseType">
            <option v-for="type in expenseTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label class="expense-modal__field">
          <span>金额</span>
          <input v-model.trim="form.expenseAmount" type="number" min="0" step="0.1" placeholder="金额">
        </label>

        <label class="expense-modal__field">
          <span>日期</span>
          <input v-model="form.expenseDate" type="date">
        </label>

        <label class="expense-modal__field">
          <span>附件</span>
          <input v-model.trim="form.attachmentUrl" type="text" placeholder="附件">
        </label>
      </div>

      <label class="expense-modal__field expense-modal__field--full">
        <span>说明</span>
        <textarea v-model.trim="form.description" rows="4" placeholder="说明" />
      </label>

      <footer class="expense-modal__footer">
        <button type="button" class="ghost-button" @click="close">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">创建报销</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CreateExpensePayload, ExpenseType } from '@osg/shared/api/admin/expense'

const expenseTypes: ExpenseType[] = [
  'Mentor Referral',
  'Student Referral',
  'Transportation',
  'Materials',
  'Other'
]

const props = withDefaults(defineProps<{
  modelValue: boolean
  submitting?: boolean
}>(), {
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: CreateExpensePayload): void
}>()

const initialForm = (): CreateExpensePayload => ({
  mentorId: 0,
  mentorName: '',
  expenseType: 'Mentor Referral',
  expenseAmount: '',
  expenseDate: '',
  description: '',
  attachmentUrl: ''
})

const form = reactive<CreateExpensePayload>(initialForm())

watch(() => props.modelValue, (open) => {
  if (!open) {
    Object.assign(form, initialForm())
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('confirm', {
    mentorId: Number(form.mentorId),
    mentorName: form.mentorName,
    expenseType: form.expenseType,
    expenseAmount: form.expenseAmount,
    expenseDate: form.expenseDate,
    description: form.description,
    attachmentUrl: form.attachmentUrl || undefined
  })
}
</script>

<style scoped lang="scss">
.expense-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.expense-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.expense-modal__panel {
  position: relative;
  z-index: 1;
  width: min(720px, calc(100vw - 32px));
  margin: 48px auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.expense-modal__hero {
  padding: 24px;
  color: #eef2ff;
  background: linear-gradient(135deg, #dc2626, #f59e0b);
}

.expense-modal__hero h3,
.expense-modal__hero p {
  margin: 0;
}

.expense-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.expense-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 24px 24px 0;
}

.expense-modal__field {
  display: grid;
  gap: 8px;
}

.expense-modal__field--full {
  padding: 16px 24px 0;
}

.expense-modal__field input,
.expense-modal__field select,
.expense-modal__field textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.expense-modal__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 24px;
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
  background: #dc2626;
  color: #fff;
}
</style>
