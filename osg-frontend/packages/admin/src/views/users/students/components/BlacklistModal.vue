<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-blacklist-modal"
    width="480px"
    :body-class="'student-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-blacklist-modal__title">
        <span class="mdi mdi-alert-decagram" aria-hidden="true"></span>
        <span>加入黑名单</span>
      </span>
    </template>

    <div class="student-blacklist-modal__intro">
      <div class="student-blacklist-modal__icon-circle">
        <span class="mdi mdi-alert-decagram" aria-hidden="true"></span>
      </div>
      <strong>{{ studentName || '当前学员' }}</strong>
      <span>请输入加入黑名单原因，提交后将用于限制求职中心相关访问。</span>
    </div>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item name="reason">
        <template #label>
          <span class="student-blacklist-modal__label">
            加入原因
            <span class="student-blacklist-modal__required">*</span>
          </span>
        </template>
        <a-textarea
          v-model:value="formState.reason"
          :rows="4"
          :maxlength="160"
          placeholder="请输入加入黑名单的业务原因"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="permission-button permission-button--primary" @click="handleSubmit">
        确认加入
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  visible: boolean
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { reason: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: ''
})

const rules = {
  reason: [{ required: true, message: '请输入加入原因', trigger: 'blur' }]
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formState.reason = ''
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  emit('submit', {
    reason: formState.reason.trim()
  })
}
</script>

<style scoped lang="scss">
:global([data-surface-id="student-blacklist-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border-bottom: none;
}

:global([data-surface-id="student-blacklist-modal"] [data-surface-part="header"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.student-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.student-blacklist-modal__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.76), rgba(254, 242, 242, 0.92));
  color: #7f1d1d;
  text-align: center;
}

.student-blacklist-modal__icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 50%;
  font-size: 36px;
  background: #FEF3C7;
  color: #92400E;
}

.student-blacklist-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-blacklist-modal__required {
  color: #dc2626;
}
</style>
