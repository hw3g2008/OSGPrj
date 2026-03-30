<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-status-change-modal"
    width="480px"
    :body-class="'student-status-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-status-modal__title">
        <span class="mdi mdi-account-cog" aria-hidden="true"></span>
        <span>修改学员状态</span>
      </span>
    </template>

    <div class="student-status-modal__intro">
      <div class="student-status-modal__icon-circle" :class="`student-status-modal__icon-circle--${action}`">
        <span class="mdi" :class="actionIcon" aria-hidden="true"></span>
      </div>
      <h3 class="student-status-modal__heading">
        确定将 <span class="student-status-modal__name">{{ studentName || '学员姓名' }}</span> 的状态修改为
      </h3>
      <div class="student-status-modal__target-status">{{ targetStatusLabel }}？</div>
      <p class="student-status-modal__desc">{{ modalDescription }}</p>
    </div>

    <div v-if="requiresReason" class="student-status-modal__form-area">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        :required-mark="false"
      >
        <a-form-item name="reason" data-field-name="修改原因">
          <template #label>
            <span class="student-status-modal__label">
              修改原因
              <span class="student-status-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.reason"
            placeholder="请选择原因"
            :options="reasonOptions"
          />
        </a-form-item>

        <a-form-item name="remark" data-field-name="备注说明">
          <template #label>
            <span class="student-status-modal__label">备注说明</span>
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
      <button type="button" class="permission-button permission-button--primary" @click="handleSubmit">
        确认修改
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

type StatusAction = 'freeze' | 'refund' | 'restore'

const props = defineProps<{
  visible: boolean
  action: StatusAction
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { action: StatusAction; reason?: string; remark?: string }]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  remark: ''
})

const reasonOptionMap: Record<'freeze' | 'refund', { label: string; value: string }[]> = {
  freeze: [
    { label: '学员申请暂停', value: '学员申请暂停' },
    { label: '课时用完待续费', value: '课时用完待续费' },
    { label: '违反服务协议', value: '违反服务协议' },
    { label: '学员申请退费', value: '学员申请退费' },
    { label: '其他原因', value: '其他原因' }
  ],
  refund: [
    { label: '学员申请暂停', value: '学员申请暂停' },
    { label: '课时用完待续费', value: '课时用完待续费' },
    { label: '违反服务协议', value: '违反服务协议' },
    { label: '学员申请退费', value: '学员申请退费' },
    { label: '其他原因', value: '其他原因' }
  ]
}

const requiresReason = computed(() => props.action === 'freeze' || props.action === 'refund')

const targetStatusLabel = computed(() => {
  if (props.action === 'freeze') return '冻结'
  if (props.action === 'refund') return '退费'
  return '正常'
})

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return '冻结后，学员账号将被暂停，无法登录系统。可随时恢复正常状态。'
  }
  if (props.action === 'refund') {
    return '退费后，学员账号将被停用。'
  }
  return '恢复后，学员可正常登录和使用系统。'
})

const actionIcon = computed(() => {
  if (props.action === 'freeze') return 'mdi-snowflake'
  if (props.action === 'refund') return 'mdi-cash-refund'
  return 'mdi-check-circle'
})

const reasonOptions = computed(() => {
  if (props.action === 'restore') return []
  return reasonOptionMap[props.action]
})

const rules = computed(() => ({
  reason: requiresReason.value ? [{ required: true, message: '请选择原因', trigger: 'change' }] : []
}))

const resetForm = () => {
  formState.reason = undefined
  formState.remark = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  if (requiresReason.value) {
    await formRef.value?.validate()
  }
  emit('submit', {
    action: props.action,
    reason: formState.reason,
    remark: formState.remark.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.student-status-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.student-status-modal__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  text-align: center;
}

.student-status-modal__icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 50%;
  font-size: 48px;

  &--freeze {
    color: #1E40AF;
  }

  &--refund {
    color: #DC2626;
  }

  &--restore {
    color: #16A34A;
  }
}

.student-status-modal__heading {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.student-status-modal__name {
  color: var(--primary);
}

.student-status-modal__target-status {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
}

.student-status-modal__desc {
  color: var(--text2);
  font-size: 14px;
  margin: 0;
}

.student-status-modal__form-area {
  background: #F8FAFC;
  padding: 16px;
  border-radius: 8px;
  text-align: left;
}

.student-status-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.student-status-modal__required {
  color: #dc2626;
}
</style>
