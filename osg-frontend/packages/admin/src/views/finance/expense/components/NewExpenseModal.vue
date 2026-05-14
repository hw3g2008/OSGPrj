<template>
  <OverlaySurfaceModal
    surface-id="modal-new-expense"
    :open="modelValue"
    width="600px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-cash-plus" aria-hidden="true" />
        <span>{{ $t('new_expense') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="`${$t('mentor')} ID`">
            <a-input-number v-model:value="form.mentorId" :min="1" :placeholder="$t('mentor')" style="width:100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('mentor')">
            <a-input v-model:value="form.mentorName" :placeholder="$t('mentor_name')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('expense_type')">
            <a-select v-model:value="form.expenseType">
              <a-select-option v-for="type in expenseTypes" :key="type" :value="type">{{ type }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('amount')">
            <a-input v-model:value="form.expenseAmount" :placeholder="$t('amount')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('date')">
            <a-input v-model:value="form.expenseDate" type="date" :placeholder="$t('date')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('attachment')">
            <a-input v-model:value="form.attachmentUrl" :placeholder="$t('attachment')" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item :label="$t('description')">
            <a-textarea v-model:value="form.description" :rows="4" :placeholder="$t('description')" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="close">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">{{ $t('create_expense') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CreateExpensePayload, ExpenseType } from '@osg/shared/api/admin/expense'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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
