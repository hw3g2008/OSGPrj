<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-reject-position"
    width="560px"
    :body-class="'student-reject-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="student-reject-modal__title">
        <i class="mdi mdi-close-octagon-outline" aria-hidden="true"></i>
        <span>拒绝岗位</span>
      </div>
    </template>

    <section class="student-reject-modal__hero">
      <strong>{{ position?.studentName || '当前学生' }}</strong>
      <span>拒绝后，该岗位不会加入公共岗位库，学生将收到审核结果通知。</span>
    </section>

    <section class="student-reject-modal__section" data-field-name="拒绝原因">
      <label class="student-reject-modal__label">
        <span>拒绝原因 *</span>
      </label>
      <div class="student-reject-modal__reason-grid" data-field-name="拒绝原因">
        <button
          v-for="option in reasonOptions"
          :key="option.value"
          type="button"
          :class="[
            'student-reject-modal__reason-option',
            { 'student-reject-modal__reason-option--active': formState.reason === option.value }
          ]"
          @click="formState.reason = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section class="student-reject-modal__section" data-field-name="补充说明">
      <label class="student-reject-modal__label">
        <span>补充说明</span>
      </label>
      <textarea
        v-model="formState.note"
        data-field-name="补充说明"
        class="student-reject-modal__textarea"
        rows="4"
        maxlength="120"
        placeholder="可选，补充本次拒绝说明"
      />
      <div class="student-reject-modal__meta">{{ formState.note.length }}/120</div>
    </section>

    <template #footer>
      <div class="student-reject-modal__footer">
        <button
          type="button"
          class="student-reject-modal__button student-reject-modal__button--ghost"
          data-surface-part="cancel-control"
          @click="handleClose"
        >
          取消
        </button>
        <button
          type="button"
          class="student-reject-modal__button student-reject-modal__button--danger"
          data-surface-part="confirm-control"
          @click="handleSubmit"
        >
          确认拒绝
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
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

const formState = reactive({
  reason: '',
  note: ''
})

const reasonOptions = [
  { label: '岗位链接无法访问', value: '岗位链接无法访问' },
  { label: '公司官网无此岗位', value: '公司官网无此岗位' },
  { label: '信息与官方不符', value: '信息与官方不符' },
  { label: '与现有岗位重复', value: '与现有岗位重复' },
  { label: '其他', value: '其他' }
]

watch(
  () => props.visible,
  (open) => {
    if (!open) {
      return
    }
    formState.reason = ''
    formState.note = ''
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!formState.reason) {
    message.warning('请选择拒绝原因')
    return
  }

  emit('submit', {
    reason: formState.reason,
    note: formState.note.trim() || undefined
  })
}
</script>

<style scoped lang="scss">
.student-reject-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
}

.student-reject-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-reject-modal__hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(252, 165, 165, 0.45);
  background: linear-gradient(145deg, rgba(254, 226, 226, 0.92), rgba(255, 247, 237, 0.96));
  color: #7f1d1d;
}

.student-reject-modal__hero strong {
  font-size: 15px;
}

.student-reject-modal__hero span {
  font-size: 13px;
  line-height: 1.6;
}

.student-reject-modal__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.student-reject-modal__label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-reject-modal__reason-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.student-reject-modal__reason-option {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.student-reject-modal__reason-option--active {
  border-color: #ef4444;
  background: #fef2f2;
  color: #b91c1c;
}

.student-reject-modal__textarea {
  width: 100%;
  min-height: 108px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  resize: vertical;
}

.student-reject-modal__meta {
  color: #94a3b8;
  font-size: 12px;
  text-align: right;
}

.student-reject-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.student-reject-modal__button {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.student-reject-modal__button--ghost {
  background: #fff;
  color: #475569;
}

.student-reject-modal__button--danger {
  border-color: #ef4444;
  background: #ef4444;
  color: #fff;
}

@media (max-width: 640px) {
  .student-reject-modal__reason-grid {
    grid-template-columns: 1fr;
  }
}
</style>
