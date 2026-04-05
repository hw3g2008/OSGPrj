<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-new"
    width="960px"
    :body-class="'edit-student-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="edit-student-modal__title">
        <span class="mdi mdi-account-edit edit-student-modal__title-icon" aria-hidden="true"></span>
        <span>编辑学员</span>
      </span>
    </template>

    <div class="edit-student-modal__note" data-content-part="supporting-text">
      <span class="mdi mdi-card-account-details-outline edit-student-modal__note-icon" aria-hidden="true"></span>
      <div class="edit-student-modal__note-copy">
        <strong>{{ student?.studentName || '待选择学员' }}</strong>
        <p>ID {{ student?.studentId ?? '-' }} · {{ formatStatus(student?.accountStatus) }} · 可同步更新资料、导师归属与求职方向。</p>
      </div>
    </div>

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
          <a-select
            v-model:value="form.leadMentorId"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :disabled="submitting"
            :options="mentorSelectOptions"
            placeholder="输入姓名搜索班主任"
            allow-clear
            @search="handleStaffSearch"
          />
        </label>
        <label data-field-name="助教">
          <span>助教</span>
          <a-select
            v-model:value="form.assistantId"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :disabled="submitting"
            :options="assistantSelectOptions"
            placeholder="输入姓名搜索助教"
            allow-clear
            @search="handleStaffSearch"
          />
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
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { StudentListItem, UpdateStudentPayload } from '@osg/shared/api/admin/student'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
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
  remark: '',
  leadMentorId: undefined as number | undefined,
  assistantId: undefined as number | undefined,
})

const staffOptions = ref<StaffListItem[]>([])
const staffLoading = ref(false)

const mentorSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'lead_mentor' && item.userId != null)
  .map((item) => ({
    label: item.staffName,
    value: item.userId!,
  })))

const assistantSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'assistant' && item.userId != null)
  .map((item) => ({
    label: item.staffName,
    value: item.userId!,
  })))

const mergeCurrentOption = (staffType: 'lead_mentor' | 'assistant', userId?: number, label?: string) => {
  if (userId == null) {
    return
  }
  const exists = staffOptions.value.some((item) => item.userId === userId)
  if (exists) {
    return
  }
  staffOptions.value = [
    ...staffOptions.value,
    {
      staffId: userId,
      staffName: label || `${staffType === 'lead_mentor' ? '班主任' : '助教'} ${userId}`,
      staffType,
      userId,
    },
  ]
}

const toExtraStudentFields = (student?: StudentListItem | null) => (student ?? {}) as unknown as {
  gender?: string
  phone?: string
  wechat?: string
  remark?: string
}

const syncForm = () => {
  const extraFields = toExtraStudentFields(props.student)
  form.studentName = props.student?.studentName || ''
  form.gender = extraFields.gender || ''
  form.email = props.student?.email || ''
  form.school = props.student?.school || ''
  form.majorDirection = props.student?.majorDirection || ''
  form.targetPosition = props.student?.targetPosition || ''
  form.phone = extraFields.phone || ''
  form.wechat = extraFields.wechat || ''
  form.remark = extraFields.remark || ''
  form.leadMentorId = props.student?.leadMentorId
  form.assistantId = props.student?.assistantId

  mergeCurrentOption('lead_mentor', props.student?.leadMentorId, props.student?.leadMentorName)
  mergeCurrentOption('assistant', props.student?.assistantId, props.student?.assistantName)
}

const loadStaffOptions = async (keyword = '') => {
  try {
    staffLoading.value = true
    const response = await getStaffList({
      pageNum: 1,
      pageSize: 50,
      staffName: keyword || undefined,
    })
    staffOptions.value = response.rows || []
    mergeCurrentOption('lead_mentor', props.student?.leadMentorId, props.student?.leadMentorName)
    mergeCurrentOption('assistant', props.student?.assistantId, props.student?.assistantName)
  } catch (_error) {
    message.error('加载导师列表失败')
  } finally {
    staffLoading.value = false
  }
}

const handleStaffSearch = (keyword: string) => {
  void loadStaffOptions(keyword)
}

watch(
  () => [props.visible, props.student] as const,
  ([visible]) => {
    if (visible) {
      syncForm()
      void loadStaffOptions()
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
    subDirection: form.targetPosition.trim() || undefined,
    leadMentorId: form.leadMentorId,
    assistantId: form.assistantId,
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
:global([data-surface-id="modal-edit-student-new"] [data-surface-part="header"]) {
  background: #fff !important;
  border-bottom: 1px solid rgba(79, 116, 255, 0.1) !important;
}

:global([data-surface-id="modal-edit-student-new"] .overlay-surface-modal__close) {
  background: #f5f7ff !important;
  color: #69758b !important;

  &:hover {
    background: #eef2ff !important;
    color: #4f74ff !important;
  }
}

.edit-student-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.edit-student-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.edit-student-modal__note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
}

.edit-student-modal__note-icon {
  font-size: 18px;
  line-height: 1;
}

.edit-student-modal__note-copy {
  strong {
    display: block;
    color: #3f68ff;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    margin: 4px 0 0;
    color: #546179;
    font-size: 13px;
    line-height: 1.6;
  }
}

.edit-student-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #fff;
}

.edit-student-modal__section {
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 16px;
  padding: 18px;
  background: #fff;
}

.edit-student-modal__section--primary {
  border-color: rgba(79, 116, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(79, 116, 255, 0.06);
}

.edit-student-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
}

.edit-student-modal__section input:disabled,
.edit-student-modal__section select:disabled {
  cursor: not-allowed;
  background: #f1f5f9;
}

.edit-student-modal__badge--primary {
  background: #edf2ff;
  color: #3f68ff;
}

.edit-student-modal__badge--indigo {
  background: #edf2ff;
  color: #3f68ff;
}

.edit-student-modal__badge--blue {
  background: #eef6ff;
  color: #3f68ff;
}

.edit-student-modal__badge--amber {
  background: #fff2db;
  color: #c56a26;
}

.edit-student-modal__badge--green {
  background: #ebfbf2;
  color: #2f8f62;
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
  color: #1a2234;
  font-size: 13px;
  font-weight: 600;
}

.edit-student-modal__grid input,
.edit-student-modal__grid select,
:global(.edit-student-modal__grid .ant-select-selector) {
  width: 100%;
  border: 1px solid rgba(79, 116, 255, 0.12);
  border-radius: 14px;
  padding: 11px 12px;
  background: #f9fbff;
  color: #1a2234;
}

:global(.edit-student-modal__grid .ant-select) {
  width: 100%;
}

:global(.edit-student-modal__grid .ant-select-selector) {
  min-height: 44px;
  box-shadow: none !important;
}

.edit-student-modal__footer-button {
  min-width: 112px;
  border-radius: 14px;
  padding: 11px 20px;
  font-weight: 600;
  cursor: pointer;
}

.edit-student-modal__footer-button--ghost {
  border: 1px solid rgba(26, 34, 52, 0.12);
  background: #fff;
  color: #69758b;
}

.edit-student-modal__footer-button--primary {
  border: 0;
  background: linear-gradient(135deg, #3f68ff, #6788ff);
  color: #fff;
  box-shadow: 0 16px 34px rgba(79, 116, 255, 0.22);
}

@media (max-width: 960px) {
  .edit-student-modal__grid,
  .edit-student-modal__grid--three,
  .edit-student-modal__grid--four {
    grid-template-columns: 1fr;
  }

}
</style>
