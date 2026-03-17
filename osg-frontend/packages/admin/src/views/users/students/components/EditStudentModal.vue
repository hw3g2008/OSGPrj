<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-edit-modal"
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

    <div class="edit-student-modal__hero">
      <strong>更新学员基础资料</strong>
      <p>这里直接回写真实学员主档，保存后会立即刷新列表中的邮箱、学校和求职方向等字段。</p>
    </div>

    <section class="edit-student-modal__section edit-student-modal__section--primary">
      <header>
        <strong>核心信息</strong>
        <span>英文姓名、性别、邮箱等基础身份字段</span>
      </header>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label>
          <span>英文姓名</span>
          <input v-model="form.studentName" :disabled="submitting">
        </label>
        <label>
          <span>邮箱</span>
          <input v-model="form.email" type="email" :disabled="submitting">
        </label>
        <label>
          <span>状态</span>
          <input :value="formatStatus(student?.accountStatus)" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <header>
        <strong>导师配置</strong>
        <span>班主任与助教信息沿用新增学员结构展示</span>
      </header>
      <div class="edit-student-modal__grid">
        <label>
          <span>班主任</span>
          <input :value="student?.leadMentorName || '待补充'" readonly>
        </label>
        <label>
          <span>助教</span>
          <input value="待补充" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <header>
        <strong>学业信息</strong>
        <span>学校、专业、毕业年份与学习阶段</span>
      </header>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label>
          <span>学校</span>
          <input v-model="form.school" :disabled="submitting">
        </label>
        <label>
          <span>专业</span>
          <input :value="student?.majorDirection || ''" readonly>
        </label>
        <label>
          <span>毕业年份</span>
          <input value="待补充" readonly>
        </label>
      </div>
    </section>

    <section class="edit-student-modal__section">
      <header>
        <strong>求职方向</strong>
        <span>求职地区、目标岗位与主攻方向展示</span>
      </header>
      <div class="edit-student-modal__grid edit-student-modal__grid--three">
        <label>
          <span>主攻方向</span>
          <input v-model="form.majorDirection" :disabled="submitting">
        </label>
        <label>
          <span>目标岗位</span>
          <input v-model="form.targetPosition" :disabled="submitting">
        </label>
        <label>
          <span>求职地区</span>
          <input value="待补充" readonly>
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
  email: '',
  school: '',
  majorDirection: '',
  targetPosition: ''
})

const syncForm = () => {
  form.studentName = props.student?.studentName || ''
  form.email = props.student?.email || ''
  form.school = props.student?.school || ''
  form.majorDirection = props.student?.majorDirection || ''
  form.targetPosition = props.student?.targetPosition || ''
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

:deep(.overlay-surface-modal__header) {
  background: linear-gradient(135deg, #7399c6 0%, #5a7ba3 100%);
  border-bottom: 0;
}

.edit-student-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #f8fafc;
}

.edit-student-modal__hero {
  border-radius: 18px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(115, 153, 198, 0.18) 0%, rgba(90, 123, 163, 0.1) 100%);
  color: #334155;
}

.edit-student-modal__hero strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  font-size: 16px;
}

.edit-student-modal__hero p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.edit-student-modal__section input:disabled {
  cursor: not-allowed;
  background: #f1f5f9;
}

.edit-student-modal__section {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 20px;
  background: #fff;
}

.edit-student-modal__section--primary {
  border-width: 2px;
  border-color: #7399c6;
}

.edit-student-modal__section header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.edit-student-modal__section strong {
  color: #0f172a;
  font-size: 15px;
}

.edit-student-modal__section span {
  color: #64748b;
  font-size: 12px;
}

.edit-student-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.edit-student-modal__grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.edit-student-modal__grid input {
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
  background: linear-gradient(135deg, #7399c6 0%, #5a7ba3 100%);
  color: #fff;
}

@media (max-width: 960px) {
  .edit-student-modal__grid,
  .edit-student-modal__grid--three {
    grid-template-columns: 1fr;
  }

  .edit-student-modal__title-wrap {
    align-items: flex-start;
  }
}
</style>
