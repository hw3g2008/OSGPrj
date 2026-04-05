<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-remove-blacklist"
    width="560px"
    :body-class="'contract-remove-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="contract-remove-blacklist-modal__title">
        <span class="mdi mdi-account-arrow-right" aria-hidden="true"></span>
        <span>移出黑名单</span>
      </span>
    </template>

    <div class="contract-remove-blacklist-modal__intro">
      <strong>{{ targetLabel }}</strong>
      <span>填写移出黑名单的原因与备注说明。</span>
    </div>

    <div class="contract-remove-blacklist-modal__field-list">
      <label class="contract-remove-blacklist-modal__field" data-field-name="移出原因">
        <span>移出原因</span>
        <select v-model="form.reason" class="contract-remove-blacklist-modal__control">
          <option value="">请选择移出原因</option>
          <option v-for="option in reasonOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label class="contract-remove-blacklist-modal__field contract-remove-blacklist-modal__field--wide" data-field-name="备注说明">
        <span>备注说明</span>
        <textarea
          v-model="form.remark"
          rows="3"
          class="contract-remove-blacklist-modal__control contract-remove-blacklist-modal__control--textarea"
          placeholder="可填写补充说明"
        />
      </label>
    </div>

    <template #footer>
      <div class="contract-remove-blacklist-modal__footer">
        <button type="button" class="contract-remove-blacklist-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="contract-remove-blacklist-modal__primary" @click="handleSubmit">确认移出</button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ContractListItem } from '@osg/shared/api/admin/contract'

const props = defineProps<{
  visible: boolean
  contract?: ContractListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: []
}>()

const reasonOptions = ['黑名单期满', '误加黑名单', '已完成整改', '其他原因']

const form = reactive({
  reason: '',
  remark: '',
})

const targetLabel = computed(() => {
  if (!props.contract) return '当前合同'
  return `${props.contract.studentName || '当前学员'} · ${props.contract.contractNo || props.contract.contractId}`
})

const resetForm = () => {
  form.reason = ''
  form.remark = ''
}

watch(() => props.visible, (visible) => {
  if (visible) resetForm()
}, { immediate: true })

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.reason) {
    message.error('请选择移出原因')
    return
  }
  if (!form.remark.trim()) {
    message.error('请填写备注说明')
    return
  }
  emit('submitted')
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
:global([data-surface-id="modal-remove-blacklist"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-bottom: none;
}

:global([data-surface-id="modal-remove-blacklist"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.contract-remove-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.contract-remove-blacklist-modal__intro {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
  color: #35506f;
}

.contract-remove-blacklist-modal__intro strong {
  display: block;
  margin-bottom: 4px;
}

.contract-remove-blacklist-modal__field-list {
  display: grid;
  gap: 14px;
}

.contract-remove-blacklist-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #40536d;
  font-size: 13px;
  font-weight: 600;
}

.contract-remove-blacklist-modal__field--wide {
  grid-column: 1 / -1;
}

.contract-remove-blacklist-modal__control {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #d5dfeb;
  background: #fff;
  padding: 0 14px;
  color: #1f3552;
}

.contract-remove-blacklist-modal__control--textarea {
  padding: 12px 14px;
}

.contract-remove-blacklist-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.contract-remove-blacklist-modal__secondary,
.contract-remove-blacklist-modal__primary {
  border: none;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}

.contract-remove-blacklist-modal__secondary {
  background: #f7f9fc;
  color: #1d3552;
  border: 1px solid #d8e1ed;
}

.contract-remove-blacklist-modal__primary {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
}
</style>
