<template>
  <div v-if="modelValue" class="mark-paid-modal">
    <div class="mark-paid-modal__backdrop" @click="close" />
    <div class="mark-paid-modal__panel">
      <header class="mark-paid-modal__hero">
        <span class="mark-paid-modal__eyebrow">Finance Settlement</span>
        <h3>确认已支付</h3>
        <p>{{ summaryLabel }}</p>
      </header>

      <div class="mark-paid-modal__amount">
        <span>结算金额</span>
        <strong>{{ amount }}</strong>
      </div>

      <label class="mark-paid-modal__field">
        <span>支付日期</span>
        <input v-model="paymentDate" type="date">
      </label>

      <label class="mark-paid-modal__field">
        <span>银行流水号</span>
        <input v-model.trim="bankReferenceNo" type="text" placeholder="选填">
      </label>

      <label class="mark-paid-modal__field">
        <span>备注</span>
        <textarea v-model.trim="remark" rows="3" placeholder="选填" />
      </label>

      <footer class="mark-paid-modal__footer">
        <button type="button" class="ghost-button" @click="close">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">确认已支付</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  summaryLabel: string
  amount: string
  submitting?: boolean
}>(), {
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: { paymentDate: string; bankReferenceNo?: string; remark?: string }): void
}>()

const paymentDate = ref('')
const bankReferenceNo = ref('')
const remark = ref('')

watch(() => props.modelValue, (open) => {
  if (!open) {
    paymentDate.value = ''
    bankReferenceNo.value = ''
    remark.value = ''
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('confirm', {
    paymentDate: paymentDate.value,
    bankReferenceNo: bankReferenceNo.value || undefined,
    remark: remark.value || undefined
  })
}
</script>

<style scoped lang="scss">
.mark-paid-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.mark-paid-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.mark-paid-modal__panel {
  position: relative;
  z-index: 1;
  width: min(520px, calc(100vw - 32px));
  margin: 64px auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.mark-paid-modal__hero {
  padding: 24px;
  color: #ecfdf5;
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.mark-paid-modal__hero h3,
.mark-paid-modal__hero p {
  margin: 0;
}

.mark-paid-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mark-paid-modal__amount,
.mark-paid-modal__field,
.mark-paid-modal__footer {
  display: grid;
  gap: 8px;
  padding: 0 24px;
}

.mark-paid-modal__amount {
  padding-top: 20px;
}

.mark-paid-modal__amount strong {
  color: #1d4ed8;
  font-size: 28px;
}

.mark-paid-modal__field {
  margin-top: 16px;
}

.mark-paid-modal__field input,
.mark-paid-modal__field textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.mark-paid-modal__footer {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding-bottom: 24px;
  margin-top: 20px;
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
  background: #16a34a;
  color: #fff;
}
</style>
