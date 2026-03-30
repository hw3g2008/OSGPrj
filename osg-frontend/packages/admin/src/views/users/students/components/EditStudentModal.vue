<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-new"
    width="960px"
    :body-class="'edit-student-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="edit-student-modal__title-wrap">
        <div class="edit-student-modal__avatar">
          {{ avatarText }}
        </div>
        <div>
          <span class="edit-student-modal__eyebrow">Edit Student</span>
          <div class="edit-student-modal__title">编辑学员 - {{ student?.studentName || '待选择学员' }}</div>
          <p class="edit-student-modal__subtitle">
            ID: {{ student?.studentId ?? '-' }} · {{ formatStatus(student?.accountStatus) }}
          </p>
        </div>
      </div>
    </template>

    <section class="edit-student-modal__section edit-student-modal__section--primary">
      <div class="edit-student-modal__badge edit-student-modal__badge--primary">核心信息</div>
      <div class="edit-student-modal__grid edit-student-modal__grid--four">
        <label data-field-name="英文姓名">
          <span>英文姓名</span>
          <input v-model="form.studentName" :disabled="submitting">
        </label>
        <label data-field-name="性别">
          <span>性别</span>
          <select v-model="form.gender" :disabled="submitting">
            <option value="">请选择</option>
            <option value="0">男</option>
            <option value="1">女</option>
          </select>
        </label>
        <label data-field-name="邮箱">
          <span>邮箱</span>
          <input v-model="form.email" type="email" :disabled="submitting">
        </label>
        <label data-field-name="账号状态">
          <span>账号状态</span>
          <input :value="formatStatus(student?.accountStatus)" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--indigo">
        <i class="mdi mdi-account-group" aria-hidden="true"></i> 导师配置
      </div>
      <div class="edit-student-modal__grid">
        <label data-field-name="班主任">
          <span>班主任</span>
          <input :value="student?.leadMentorName || '待补充'" readonly>
        </label>
        <label data-field-name="助教">
          <span>助教</span>
          <input value="待补充" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--blue">
        <i class="mdi mdi-school" aria-hidden="true"></i> 学业信息
      </div>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label data-field-name="学校">
          <span>学校</span>
          <input v-model="form.school" :disabled="submitting">
        </label>
        <label data-field-name="专业">
          <span>专业</span>
          <input :value="student?.majorDirection || ''" readonly>
        </label>
        <label data-field-name="毕业年份">
          <span>毕业年份</span>
          <input value="待补充" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--amber">
        <i class="mdi mdi-target" aria-hidden="true"></i> 求职方向
      </div>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label data-field-name="主攻方向">
          <span>主攻方向</span>
          <input v-model="form.majorDirection" :disabled="submitting">
        </label>
        <label data-field-name="子方向">
          <span>子方向</span>
          <input v-model="form.targetPosition" :disabled="submitting">
        </label>
        <label data-field-name="求职地区">
          <span>求职地区</span>
          <input value="待补充" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <div class="edit-student-modal__badge edit-student-modal__badge--green">
        <i class="mdi mdi-phone" aria-hidden="true"></i> 联系方式与备注
      </div>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label data-field-name="电话">
          <span>电话</span>
          <input v-model="form.phone" :disabled="submitting" placeholder="选填">
        </label>
        <label data-field-name="微信">
          <span>微信</span>
          <input v-model="form.wechat" :disabled="submitting" placeholder="选填">
        </label>
        <label data-field-name="备注">
          <span>备注</span>
          <input v-model="form.remark" :disabled="submitting" placeholder="选填">
        </label>
      </div>
    </section>

    <template #footer>
      <button
        type="button"
        class="edit-student-modal__footer-button edit-student-modal__footer-button--ghost"
        @click="handleClose"
      >
        取消
      </button>
      <button
        type="button"
        class="edit-student-modal__footer-button edit-student-modal__footer-button--primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '保存中...' : '保存修改' }}
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { StudentListItem, UpdateStudentPayload } from '@osg/shared/api/admin/student'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  student?: StudentListItem | null
  submitting?: boolean
}>(), {
  student: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: UpdateStudentPayload]
}>()

const form = reactive({
  studentName: '',
  gender: '',
  email: '',
  school: '',
  majorDirection: '',
  targetPosition: '',
  phone: '',
  wechat: '',
  remark: ''
})

const syncForm = () => {
  form.studentName = props.student?.studentName || ''
  form.gender = (props.student as Record<string, unknown>)?.gender as string || ''
  form.email = props.student?.email || ''
  form.school = props.student?.school || ''
  form.majorDirection = props.student?.majorDirection || ''
  form.targetPosition = props.student?.targetPosition || ''
  form.phone = (props.student as Record<string, unknown>)?.phone as string || ''
  form.wechat = (props.student as Record<string, unknown>)?.wechat as string || ''
  form.remark = (props.student as Record<string, unknown>)?.remark as string || ''
}

watch(
  () => [props.visible, props.student] as const,
  ([visible]) => {
    if (visible) {
      syncForm()
    }
  },
  { immediate: true }
)

const avatarText = computed(() => {
  const name = props.student?.studentName?.trim()
  if (!name) {
    return 'ST'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!props.student?.studentId) {
    message.error('未找到学员信息')
    return
  }
  if (!form.email.trim()) {
    message.error('请填写邮箱')
    return
  }
  if (!form.school.trim()) {
    message.error('请填写学校')
    return
  }

  emit('submit', {
    studentId: props.student.studentId,
    studentName: form.studentName.trim() || props.student.studentName,
    email: form.email.trim(),
    school: form.school.trim(),
    majorDirection: form.majorDirection.trim() || undefined,
    subDirection: form.targetPosition.trim() || undefined
  })
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1':
      return '冻结'
    case '2':
      return '已结束'
    case '3':
      return '退费'
    default:
      return '正常'
  }
}
</script>

<style scoped lang="scss">
/* ── Header (override OverlaySurfaceModal header) ── */
:global([data-surface-id="modal-edit-student-new"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="modal-edit-student-new"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.edit-student-modal__title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-student-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.edit-student-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.edit-student-modal__title {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.edit-student-modal__subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 13px;
}

.edit-student-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #f8fafc;
}

.edit-student-modal__section input:disabled,
.edit-student-modal__section select:disabled {
  cursor: not-allowed;
  background: #f1f5f9;
}

.edit-student-modal__section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
}

.edit-student-modal__section--primary {
  border-width: 2px;
  border-color: var(--primary, #6366F1);
}

/* ── Section badges ── */
.edit-student-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
}

.edit-student-modal__badge--primary {
  background: var(--primary, #6366F1);
  color: #fff;
}

.edit-student-modal__badge--indigo {
  background: #E0E7FF;
  color: #4338CA;
}

.edit-student-modal__badge--blue {
  background: #E8F0F8;
  color: var(--primary, #6366F1);
}

.edit-student-modal__badge--amber {
  background: #FEF3C7;
  color: #92400E;
}

.edit-student-modal__badge--green {
  background: #DCFCE7;
  color: #166534;
}

.edit-student-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.edit-student-modal__grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.edit-student-modal__grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.edit-student-modal__grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-student-modal__grid label span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.edit-student-modal__grid input,
.edit-student-modal__grid select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 11px 12px;
  background: #f8fafc;
  color: #0f172a;
}

.edit-student-modal__footer-button {
  min-width: 112px;
  border: 0;
  border-radius: 999px;
  padding: 11px 20px;
  font-weight: 600;
  cursor: pointer;
}

.edit-student-modal__footer-button--ghost {
  background: #e2e8f0;
  color: #334155;
}

.edit-student-modal__footer-button--primary {
  background: linear-gradient(135deg, var(--primary, #6366F1) 0%, var(--primary-dark, #4F46E5) 100%);
  color: #fff;
}

@media (max-width: 960px) {
  .edit-student-modal__grid,
  .edit-student-modal__grid--three,
  .edit-student-modal__grid--four {
    grid-template-columns: 1fr;
  }

  .edit-student-modal__title-wrap {
    align-items: flex-start;
  }
}
</style>
