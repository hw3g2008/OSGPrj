<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-add-student"
    width="960px"
    :body-class="'add-student-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="add-student-modal__title">
        <span class="mdi mdi-account-plus" aria-hidden="true"></span>
        <span>新增学员</span>
      </span>
    </template>

    <div class="add-student-modal__hero">
      <div>
        <strong>{{ activeStep === 1 ? 'Step 1 · 基本信息' : 'Step 2 · 合同信息' }}</strong>
        <p>
          {{ activeStep === 1
            ? '先录入学员的核心身份与学业背景，完成后再进入合同信息。'
            : '补充首份合同的金额、课时与起止日期，确认后即可进入提交阶段。'
          }}
        </p>
      </div>
      <span class="add-student-modal__hero-badge">2 步流程</span>
    </div>

    <div class="add-student-modal__steps" aria-label="新增学员步骤">
      <div
        v-for="step in steps"
        :key="step.key"
        :class="['add-student-modal__step', { 'add-student-modal__step--active': step.key === activeStep }]"
      >
        <span class="add-student-modal__step-index">{{ step.index }}</span>
        <div>
          <strong>{{ step.label }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <div v-if="activeStep === 1" class="add-student-modal__grid">
        <a-form-item name="studentName" data-field-name="英文姓名">
          <template #label>
            <span class="add-student-modal__label">
              英文姓名
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.studentName"
            placeholder="例如 Emily Zhang"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="gender" data-field-name="性别">
          <template #label>
            <span class="add-student-modal__label">
              性别
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.gender"
            placeholder="请选择性别"
            :options="genderOptions"
          />
        </a-form-item>

        <a-form-item class="add-student-modal__field--wide" name="email" data-field-name="邮箱">
          <template #label>
            <span class="add-student-modal__label">
              邮箱
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input
            v-model:value="formState.email"
            placeholder="学生邮箱将自动作为登录账号"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="phone" data-field-name="电话">
          <template #label>
            <span class="add-student-modal__label">电话</span>
          </template>
          <a-input
            v-model:value="formState.phone"
            placeholder="请输入联系电话"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="wechat" data-field-name="微信">
          <template #label>
            <span class="add-student-modal__label">微信</span>
          </template>
          <a-input
            v-model:value="formState.wechat"
            placeholder="请输入微信号"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="school" data-field-name="学校">
          <template #label>
            <span class="add-student-modal__label">学校</span>
          </template>
          <a-input
            v-model:value="formState.school"
            placeholder="例如 University of Manchester"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="major" data-field-name="专业">
          <template #label>
            <span class="add-student-modal__label">专业</span>
          </template>
          <a-input
            v-model:value="formState.major"
            placeholder="例如 Finance / Economics"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="graduationYear" data-field-name="毕业年份">
          <template #label>
            <span class="add-student-modal__label">毕业年份</span>
          </template>
          <a-select
            v-model:value="formState.graduationYear"
            placeholder="请选择毕业年份"
            :options="graduationYearOptions"
            show-search
          />
        </a-form-item>

        <a-form-item class="add-student-modal__field--wide" name="studyPlan" data-field-name="读研延毕">
          <template #label>
            <span class="add-student-modal__label">读研延毕</span>
          </template>
          <a-radio-group v-model:value="formState.studyPlan" class="add-student-modal__radio-group">
            <a-radio-button value="normal">正常毕业</a-radio-button>
            <a-radio-button value="postgraduate">读研</a-radio-button>
            <a-radio-button value="deferred">延毕</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item name="visaStatus" data-field-name="签证">
          <template #label>
            <span class="add-student-modal__label">签证</span>
          </template>
          <a-select
            v-model:value="formState.visaStatus"
            placeholder="请选择签证状态"
            :options="visaStatusOptions"
          />
        </a-form-item>

        <div class="add-student-modal__field--wide">
          <div class="add-student-modal__section-badge add-student-modal__section-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> 求职方向
          </div>
          <span class="add-student-modal__section-desc">地区、招聘周期、主攻方向与子方向</span>
        </div>

        <a-form-item name="targetRegion" data-field-name="求职地区">
          <template #label>
            <span class="add-student-modal__label">
              求职地区
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.targetRegion"
            placeholder="请选择求职地区"
            :options="targetRegionOptions"
          />
        </a-form-item>

        <a-form-item name="recruitmentCycle" data-field-name="招聘周期">
          <template #label>
            <span class="add-student-modal__label">
              招聘周期
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-select
            v-model:value="formState.recruitmentCycle"
            mode="multiple"
            placeholder="可多选"
            :options="recruitmentCycleOptions"
          />
        </a-form-item>

        <div class="add-student-modal__field--wide">
          <DirectionCascade
            :major-directions="formState.majorDirections"
            :sub-direction="formState.subDirection"
            @update:major-directions="handleMajorDirectionsChange"
            @update:sub-direction="formState.subDirection = $event"
          />
        </div>

        <div class="add-student-modal__field--wide">
          <div class="add-student-modal__section-badge add-student-modal__section-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> 辅导归属
          </div>
          <span class="add-student-modal__section-desc">班主任与助教均支持搜索后多选</span>
        </div>

        <a-form-item name="leadMentorIds" data-field-name="班主任">
          <template #label>
            <span class="add-student-modal__label">班主任</span>
          </template>
          <a-select
            v-model:value="formState.leadMentorIds"
            mode="multiple"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :options="mentorSelectOptions"
            placeholder="输入姓名搜索班主任"
            @search="handleStaffSearch"
          />
        </a-form-item>

        <a-form-item name="assistantIds" data-field-name="助教">
          <template #label>
            <span class="add-student-modal__label">助教</span>
          </template>
          <a-select
            v-model:value="formState.assistantIds"
            mode="multiple"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :options="assistantSelectOptions"
            placeholder="输入姓名搜索助教"
            @search="handleStaffSearch"
          />
        </a-form-item>
      </div>

      <div v-else class="add-student-modal__contract-grid">
        <div class="add-student-modal__contract-summary">
          <strong>首份合同信息</strong>
          <span>金额、学习时长和起止日期将随新增学员一起创建。</span>
        </div>

        <a-form-item name="contractAmount" data-field-name="合同金额">
          <template #label>
            <span class="add-student-modal__label">
              合同金额
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input-number
            v-model:value="formState.contractAmount"
            class="add-student-modal__number"
            :min="0"
            :precision="2"
            :controls="false"
            placeholder="请输入合同金额"
          />
        </a-form-item>

        <a-form-item name="totalHours" data-field-name="学习时长（小时）">
          <template #label>
            <span class="add-student-modal__label">
              学习时长（小时）
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input-number
            v-model:value="formState.totalHours"
            class="add-student-modal__number"
            :min="1"
            :precision="0"
            :controls="false"
            placeholder="请输入学习时长"
          />
        </a-form-item>

        <a-form-item name="startDate" data-field-name="合同开始日期">
          <template #label>
            <span class="add-student-modal__label">
              合同开始日期
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input v-model:value="formState.startDate" type="date" />
        </a-form-item>

        <a-form-item name="endDate" data-field-name="合同结束日期">
          <template #label>
            <span class="add-student-modal__label">
              合同结束日期
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input v-model:value="formState.endDate" type="date" />
        </a-form-item>

        <a-form-item name="initialPassword" data-field-name="初始密码">
          <template #label>
            <span class="add-student-modal__label">初始密码</span>
          </template>
          <a-input
            :value="formState.initialPassword"
            readonly
            placeholder="系统自动生成，提交后显示"
          />
        </a-form-item>

        <a-form-item name="contractAttachment" data-field-name="合同附件" class="add-student-modal__field--wide">
          <template #label>
            <span class="add-student-modal__label">合同附件</span>
          </template>
          <a-input
            v-model:value="formState.contractAttachment"
            placeholder="请输入合同附件链接或文件名（选填）"
            allow-clear
          />
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <button
        type="button"
        class="permission-button permission-button--outline"
        :disabled="submitting"
        @click="activeStep === 1 ? handleClose() : handleBack()"
      >
        {{ activeStep === 1 ? '取消' : '返回上一步' }}
      </button>
      <button
        type="button"
        class="permission-button permission-button--primary"
        :disabled="submitting"
        @click="handlePrimaryAction"
      >
        {{ activeStep === 1 ? '下一步' : (submitting ? '提交中...' : '提交学员') }}
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { getStaffOptions, type StaffOption } from '@osg/shared/api/admin/staff'
import DirectionCascade from './DirectionCascade.vue'

interface AddStudentBasicInfo {
  studentName: string
  gender?: string
  email: string
  phone?: string
  wechat?: string
  school: string
  major: string
  graduationYear?: number
  studyPlan: 'normal' | 'postgraduate' | 'deferred'
  visaStatus?: string
  targetRegion?: string
  recruitmentCycle: string[]
  majorDirections: string[]
  subDirection?: string
  leadMentorIds: number[]
  assistantIds: number[]
  contractAmount?: number
  totalHours?: number
  startDate?: string
  endDate?: string
  initialPassword?: string
  contractAttachment?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  currentStep?: 1 | 2
  submitting?: boolean
  initialValue?: Partial<AddStudentBasicInfo>
}>(), {
  currentStep: 1,
  submitting: false,
  initialValue: undefined
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  next: [payload: AddStudentBasicInfo]
  submit: [payload: AddStudentBasicInfo]
}>()

const formRef = ref()
const staffOptions = ref<StaffOption[]>([])
const staffLoading = ref(false)
const activeStep = ref<1 | 2>(props.currentStep)
const currentYear = new Date().getFullYear()
const steps = [
  { key: 1 as const, index: '01', label: '基本信息', description: '身份、邮箱与学业背景' },
  { key: 2 as const, index: '02', label: '合同信息', description: '金额、课时与起止日期' }
] as const

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他 / 未知', value: 'unknown' }
]

const graduationYearOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const value = currentYear - 4 + index
    return {
      label: `${value}`,
      value
    }
  }).reverse()
)

const visaStatusOptions = [
  { label: '待确认', value: 'pending' },
  { label: '需要签证', value: 'required' },
  { label: '无需签证', value: 'not_required' }
]

const mentorSelectOptions = computed(() =>
  staffOptions.value.length
    ? staffOptions.value
    : [{ label: '班主任', value: -1 }]
)

const assistantSelectOptions = computed(() =>
  staffOptions.value.length
    ? staffOptions.value
    : [{ label: '助教', value: -2 }]
)

const targetRegionOptions = [
  { label: '北美', value: 'North America' },
  { label: '英国', value: 'United Kingdom' },
  { label: '香港', value: 'Hong Kong' },
  { label: '新加坡', value: 'Singapore' },
  { label: '中国大陆', value: 'Mainland China' }
]

const recruitmentCycleOptions = [
  { label: '2025 春招', value: '2025 Spring' },
  { label: '2025 秋招', value: '2025 Autumn' },
  { label: '2026 春招', value: '2026 Spring' },
  { label: '2026 秋招', value: '2026 Autumn' },
  { label: 'Off-cycle', value: 'Off-cycle' }
]

const formState = reactive<AddStudentBasicInfo>({
  studentName: '',
  gender: undefined,
  email: '',
  phone: undefined,
  wechat: undefined,
  school: '',
  major: '',
  graduationYear: undefined,
  studyPlan: 'normal',
  visaStatus: undefined,
  targetRegion: undefined,
  recruitmentCycle: [],
  majorDirections: [],
  subDirection: undefined,
  leadMentorIds: [],
  assistantIds: [],
  contractAmount: undefined,
  totalHours: undefined,
  startDate: undefined,
  endDate: undefined,
  initialPassword: undefined,
  contractAttachment: undefined
})

const rules = {
  studentName: [{ required: true, message: '请输入英文姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email' as const, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  targetRegion: [{ required: true, message: '请选择求职地区', trigger: 'change' }],
  recruitmentCycle: [{ required: true, type: 'array' as const, min: 1, message: '请至少选择一个招聘周期', trigger: 'change' }],
  contractAmount: [{ required: true, message: '请输入合同金额', trigger: 'change' }],
  totalHours: [{ required: true, message: '请输入学习时长', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
}

const resetForm = () => {
  formState.studentName = props.initialValue?.studentName ?? ''
  formState.gender = props.initialValue?.gender
  formState.email = props.initialValue?.email ?? ''
  formState.phone = props.initialValue?.phone
  formState.wechat = props.initialValue?.wechat
  formState.school = props.initialValue?.school ?? ''
  formState.major = props.initialValue?.major ?? ''
  formState.graduationYear = props.initialValue?.graduationYear
  formState.studyPlan = props.initialValue?.studyPlan ?? 'normal'
  formState.visaStatus = props.initialValue?.visaStatus
  formState.targetRegion = props.initialValue?.targetRegion
  formState.recruitmentCycle = props.initialValue?.recruitmentCycle ?? []
  formState.majorDirections = props.initialValue?.majorDirections ?? []
  formState.subDirection = props.initialValue?.subDirection
  formState.leadMentorIds = props.initialValue?.leadMentorIds ?? []
  formState.assistantIds = props.initialValue?.assistantIds ?? []
  formState.contractAmount = props.initialValue?.contractAmount
  formState.totalHours = props.initialValue?.totalHours
  formState.startDate = props.initialValue?.startDate
  formState.endDate = props.initialValue?.endDate
  formState.initialPassword = props.initialValue?.initialPassword
  formState.contractAttachment = props.initialValue?.contractAttachment
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      activeStep.value = 1
      resetForm()
      await loadStaffOptions()
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const loadStaffOptions = async (keyword = '') => {
  try {
    staffLoading.value = true
    staffOptions.value = await getStaffOptions(keyword)
  } catch (_error) {
    message.error('加载导师列表失败')
  } finally {
    staffLoading.value = false
  }
}

const handleMajorDirectionsChange = (value: string[]) => {
  formState.majorDirections = value
}

const handleStaffSearch = async (value: string) => {
  await loadStaffOptions(value)
}

const createPayload = (): AddStudentBasicInfo => ({
  studentName: formState.studentName.trim(),
  gender: formState.gender,
  email: formState.email.trim(),
  phone: formState.phone,
  wechat: formState.wechat,
  school: formState.school.trim(),
  major: formState.major.trim(),
  graduationYear: formState.graduationYear,
  studyPlan: formState.studyPlan,
  visaStatus: formState.visaStatus,
  targetRegion: formState.targetRegion,
  recruitmentCycle: [...formState.recruitmentCycle],
  majorDirections: [...formState.majorDirections],
  subDirection: formState.subDirection,
  leadMentorIds: [...formState.leadMentorIds],
  assistantIds: [...formState.assistantIds],
  contractAmount: formState.contractAmount,
  totalHours: formState.totalHours,
  startDate: formState.startDate,
  endDate: formState.endDate,
  initialPassword: formState.initialPassword,
  contractAttachment: formState.contractAttachment
})

const validateStepOne = async () => {
  await formRef.value?.validate(['studentName', 'gender', 'email', 'targetRegion', 'recruitmentCycle'])
  if (!formState.majorDirections.length) {
    message.error('请至少选择一个主攻方向')
    return false
  }
  if (!formState.subDirection) {
    message.error('请选择子方向')
    return false
  }
  return true
}

const handleBack = () => {
  activeStep.value = 1
}

const handlePrimaryAction = async () => {
  if (activeStep.value === 1) {
    const valid = await validateStepOne()
    if (!valid) {
      return
    }
    const payload = createPayload()
    activeStep.value = 2
    emit('next', payload)
    return
  }

  await formRef.value?.validate(['contractAmount', 'totalHours', 'startDate', 'endDate'])
  emit('submit', createPayload())
}
</script>

<style scoped lang="scss">
/* ── Header (override OverlaySurfaceModal header) ── */
:global([data-surface-id="modal-add-student"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="modal-add-student"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.add-student-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.add-student-modal__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 45%),
    linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(255, 251, 235, 0.96));
  color: #1e3a8a;

  p {
    margin: 6px 0 0;
    color: #475569;
    font-size: 14px;
  }
}

.add-student-modal__hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(30, 64, 175, 0.08);
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.add-student-modal__steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.add-student-modal__step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  background: #f8fafc;
  color: #64748b;

  strong {
    display: block;
    color: #334155;
    font-size: 14px;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.5;
  }
}

.add-student-modal__step--active {
  border-color: #93c5fd;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.98));
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);

  strong {
    color: #1d4ed8;
  }
}

.add-student-modal__step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: #e2e8f0;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.add-student-modal__step--active .add-student-modal__step-index {
  background: linear-gradient(135deg, #2563eb, #38bdf8);
  color: #fff;
}

.add-student-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
}

.add-student-modal__contract-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
}

.add-student-modal__contract-summary {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(254, 242, 242, 0.9));
  color: #0f172a;

  span {
    color: #64748b;
    font-size: 13px;
  }
}

.add-student-modal__field--wide {
  grid-column: 1 / -1;
}

/* ── Section badge pills ── */
.add-student-modal__section-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.add-student-modal__section-badge--amber {
  background: #FEF3C7;
  color: #92400E;
}

.add-student-modal__section-badge--indigo {
  background: #E0E7FF;
  color: #4338CA;
}

.add-student-modal__section-desc {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-top: 4px;
  padding-left: 2px;
}

.add-student-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.add-student-modal__required {
  color: #dc2626;
}

.add-student-modal__radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.ant-radio-button-wrapper) {
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    margin-inline-start: 0;
  }

  :deep(.ant-radio-button-wrapper:not(:first-child)::before) {
    display: none;
  }
}

.add-student-modal__number {
  width: 100%;
}

@media (max-width: 720px) {
  .add-student-modal__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .add-student-modal__steps,
  .add-student-modal__grid,
  .add-student-modal__contract-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Footer buttons (scoped, matches classes on #footer slot buttons) ── */
.permission-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 41px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.92;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.permission-button--outline {
  border: 1px solid var(--border, #E2E8F0);
  background: #fff;
  color: var(--text-secondary, #64748B);
}

.permission-button--primary {
  background: var(--primary-gradient, linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%));
  color: #fff;
}
</style>
