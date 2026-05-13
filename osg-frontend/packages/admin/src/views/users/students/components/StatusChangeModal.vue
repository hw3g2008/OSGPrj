<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-status-change-modal"
    width="480px"
    :body-class="'student-status-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-status-modal__title">
        <span class="mdi mdi-account-cog student-status-modal__title-icon" aria-hidden="true"></span>
        <span>修改学员状态</span>
      </span>
    </template>

    <div class="student-status-modal__intro">
      <span class="mdi student-status-modal__intro-icon" :class="actionIcon" aria-hidden="true"></span>
      <div class="student-status-modal__intro-copy">
        <h3 class="student-status-modal__heading">
          确定将 <span class="student-status-modal__name">{{ studentName || '学员姓名' }}</span> 的状态修改为
          <span class="student-status-modal__target-status">{{ targetStatusLabel }}</span>？
        </h3>
        <p class="student-status-modal__desc">{{ modalDescription }}</p>
      </div>
    </div>

    <div v-if="showFormArea" class="student-status-modal__form-area">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        :required-mark="false"
      >
        <a-form-item v-if="requiresReason" name="reason" data-field-name="修改原因">
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
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" @click="handleSubmit">确认修改</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { OverlaySurfaceModal } from '@osg/shared/components'

// 批次 7 + 7.5：unfreeze 与 restore 等价（仅刷 frozen=0，不动 accountStatus）。
// 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.4
type StatusAction = 'freeze' | 'unfreeze' | 'refund' | 'restore' | 'end_contract'

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

const showFormArea = computed(() => requiresReason.value || props.action === 'end_contract')

const targetStatusLabel = computed(() => {
  if (props.action === 'freeze') return '冻结'
  if (props.action === 'unfreeze') return '解冻'
  if (props.action === 'refund') return '退费'
  if (props.action === 'end_contract') return '已结束'
  return '正常'
})

const modalDescription = computed(() => {
  if (props.action === 'freeze') {
    return '冻结后，学员账号将被暂停，无法登录系统。可随时解冻恢复。'
  }
  if (props.action === 'unfreeze') {
    return '解冻后，学员可恢复登录与课消操作；lifecycle 状态保持不变。'
  }
  if (props.action === 'refund') {
    return '退费后，学员账号将被停用，可通过「重新加入」走续签合同流程恢复。'
  }
  if (props.action === 'end_contract') {
    return '结束合同后，学员仍可登录，但无法查看求职信息。导师可继续课消，需续签合同后恢复完整权限。'
  }
  return '恢复后，学员可正常登录和使用系统。'
})

const actionIcon = computed(() => {
  if (props.action === 'freeze') return 'mdi-snowflake'
  if (props.action === 'unfreeze') return 'mdi-snowflake-off'
  if (props.action === 'refund') return 'mdi-cash-refund'
  if (props.action === 'end_contract') return 'mdi-file-document-remove'
  return 'mdi-check-circle'
})

const reasonOptions = computed(() => {
  if (props.action === 'restore' || props.action === 'unfreeze' || props.action === 'end_contract') return []
  if (props.action === 'freeze' || props.action === 'refund') return reasonOptionMap[props.action]
  return []
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
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.student-status-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.student-status-modal__intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
}

.student-status-modal__intro-icon {
  font-size: 18px;
  line-height: 1;
  color: #4f74ff;
}

.student-status-modal__intro-copy {
  flex: 1;
}

.student-status-modal__heading {
  margin: 0;
  color: #1a2234;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
}

.student-status-modal__name {
  color: #3f68ff;
}

.student-status-modal__target-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  margin: 0 4px;
  border-radius: 999px;
  background: rgba(79, 116, 255, 0.12);
  color: #3f68ff;
  font-size: 13px;
  font-weight: 700;
}

.student-status-modal__desc {
  margin: 4px 0 0;
  color: #546179;
  font-size: 13px;
  line-height: 1.6;
}

.student-status-modal__form-area {
  background: #f9fbff;
  padding: 16px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 14px;
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
