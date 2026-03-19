<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-blacklist-modal"
    width="500px"
    :body-class="'student-blacklist-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-blacklist-modal__title">
        <span class="mdi mdi-account-cancel" aria-hidden="true"></span>
        <span>加入黑名单</span>
      </span>
    </template>

    <div class="student-blacklist-modal__intro">
      <div class="student-blacklist-modal__icon-circle">
        <span class="mdi mdi-account-cancel" aria-hidden="true"></span>
      </div>
      <h3 class="student-blacklist-modal__heading">
        确定将 <strong>{{ studentName || '当前学员' }}</strong> 加入黑名单？
      </h3>
      <p class="student-blacklist-modal__desc">
        加入黑名单后，该学员将<strong>无法查看"求职中心"模块</strong>（包括岗位信息、面试准备等功能）
      </p>
    </div>

    <div class="student-blacklist-modal__form-area">
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
              黑名单原因
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            placeholder="请选择原因"
            :options="reasonOptions"
            @change="handleReasonChange"
          />
        </a-form-item>

        <a-form-item v-if="showOtherInput" name="otherReason">
          <template #label>
            <span class="student-blacklist-modal__label">
              其他原因说明
              <span class="student-blacklist-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.otherReason"
            placeholder="请输入具体原因"
          />
        </a-form-item>

        <a-form-item name="remark">
          <template #label>
            <span class="student-blacklist-modal__label">备注说明</span>
          </template>
          <a-textarea
            v-model:value="formState.remark"
            :rows="2"
            :maxlength="200"
            placeholder="选填，可填写详细说明"
          />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="student-blacklist-modal__confirm-btn" @click="handleSubmit">
        确认加入黑名单
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  visible: boolean
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { reason: string; remark?: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  otherReason: '',
  remark: ''
})

const reasonOptions = [
  { label: '违反服务协议', value: '违反服务协议' },
  { label: '恶意投诉', value: '恶意投诉' },
  { label: '不配合辅导', value: '不配合辅导' },
  { label: '态度恶劣', value: '态度恶劣' },
  { label: '其他原因', value: 'other' }
]

const showOtherInput = computed(() => formState.reason === 'other')

const rules = computed(() => ({
  reason: [{ required: true, message: '请选择原因', trigger: 'change' }],
  otherReason: showOtherInput.value
    ? [{ required: true, message: '请输入具体原因', trigger: 'blur' }]
    : []
}))

const handleReasonChange = () => {
  if (!showOtherInput.value) {
    formState.otherReason = ''
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formState.reason = undefined
      formState.otherReason = ''
      formState.remark = ''
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  const finalReason = formState.reason === 'other'
    ? formState.otherReason.trim()
    : (formState.reason || '')
  emit('submit', {
    reason: finalReason,
    remark: formState.remark.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
:global([data-surface-id="student-blacklist-modal"] [data-surface-part="header"]) {
  background: #FEF3C7;
  border-bottom: none;
}

:global([data-surface-id="student-blacklist-modal"] [data-surface-part="header"] .overlay-surface-modal__close) {
  color: #92400E;
}

.student-blacklist-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #92400E;
}

.student-blacklist-modal__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 24px 16px;
  text-align: center;
}

.student-blacklist-modal__icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  border-radius: 50%;
  font-size: 48px;
  color: #92400E;
}

.student-blacklist-modal__heading {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.student-blacklist-modal__desc {
  margin: 0;
  color: var(--text2);
  font-size: 14px;
}

.student-blacklist-modal__form-area {
  background: #F8FAFC;
  padding: 16px;
  border-radius: 8px;
}

.student-blacklist-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-blacklist-modal__required {
  color: #dc2626;
}

.student-blacklist-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  padding: 8px 16px;
  background: #92400E;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
