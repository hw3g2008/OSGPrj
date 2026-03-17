<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="reject-student-position-modal"
    width="520px"
    :body-class="'reject-position-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="reject-position-modal__title">
        <span class="mdi mdi-close-octagon-outline" aria-hidden="true"></span>
        <span>拒绝岗位申请</span>
      </span>
    </template>

    <div class="reject-position-modal__warning">
      <strong>{{ position?.studentName || '当前学生' }}</strong>
      <span>拒绝后，该岗位不会加入公共岗位库，学生将收到审核结果通知。</span>
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
          <span class="reject-position-modal__label">
            拒绝原因
            <span class="reject-position-modal__required">*</span>
          </span>
        </template>
        <a-select
          v-model:value="formState.reason"
          :options="reasonOptions"
          placeholder="请选择拒绝原因"
        />
      </a-form-item>

      <a-form-item name="note">
        <template #label>
          <span class="reject-position-modal__label">补充说明</span>
        </template>
        <a-textarea
          v-model:value="formState.note"
          :rows="3"
          :maxlength="120"
          placeholder="可选，补充本次拒绝说明"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="permission-button permission-button--danger" @click="handleSubmit">
        确认拒绝
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { RejectStudentPositionPayload, StudentPositionListItem } from '@osg/shared/api/admin/studentPosition'

const props = defineProps<{
  visible: boolean
  position?: StudentPositionListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: RejectStudentPositionPayload]
}>()

const formRef = ref()
const formState = reactive({
  reason: undefined as string | undefined,
  note: ''
})

const reasonOptions = [
  { label: '岗位链接无法访问', value: '岗位链接无法访问' },
  { label: '公司官网无此岗位', value: '公司官网无此岗位' },
  { label: '信息与官方不符', value: '信息与官方不符' },
  { label: '与现有岗位重复', value: '与现有岗位重复' },
  { label: '其他', value: '其他' }
]

const rules = {
  reason: [{ required: true, message: '请选择拒绝原因', trigger: 'change' }]
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formState.reason = undefined
      formState.note = ''
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  emit('submit', {
    reason: formState.reason as string,
    note: formState.note.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.reject-position-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.reject-position-modal__warning {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(252, 165, 165, 0.5);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(254, 226, 226, 0.88), rgba(255, 247, 237, 0.96));
  color: #7f1d1d;
}

.reject-position-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reject-position-modal__required {
  color: #dc2626;
}
</style>
