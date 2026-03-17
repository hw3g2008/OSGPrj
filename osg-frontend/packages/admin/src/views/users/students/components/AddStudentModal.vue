<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-add-modal"
    width="760px"
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
        <a-form-item name="studentName">
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

        <a-form-item name="gender">
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

        <a-form-item class="add-student-modal__field--wide" name="email">
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

        <a-form-item name="school">
          <template #label>
            <span class="add-student-modal__label">学校</span>
          </template>
          <a-input
            v-model:value="formState.school"
            placeholder="例如 University of Manchester"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="major">
          <template #label>
            <span class="add-student-modal__label">专业</span>
          </template>
          <a-input
            v-model:value="formState.major"
            placeholder="例如 Finance / Economics"
            allow-clear
          />
        </a-form-item>

        <a-form-item name="graduationYear">
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

        <a-form-item class="add-student-modal__field--wide" name="studyPlan">
          <template #label>
            <span class="add-student-modal__label">是否读研 / 延毕</span>
          </template>
          <a-radio-group v-model:value="formState.studyPlan" class="add-student-modal__radio-group">
            <a-radio-button value="normal">正常毕业</a-radio-button>
            <a-radio-button value="postgraduate">读研</a-radio-button>
            <a-radio-button value="deferred">延毕</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <div class="add-student-modal__field--wide add-student-modal__section">
          <div class="add-student-modal__section-head">
            <strong>求职方向</strong>
            <span>地区、招聘周期、主攻方向与子方向</span>
          </div>
        </div>

        <a-form-item name="targetRegion">
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

        <a-form-item name="recruitmentCycle">
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

        <div class="add-student-modal__field--wide add-student-modal__section">
          <div class="add-student-modal__section-head">
            <strong>辅导归属</strong>
            <span>班主任与助教均支持搜索后多选</span>
          </div>
        </div>

        <a-form-item name="leadMentorIds">
          <template #label>
            <span class="add-student-modal__label">班主任</span>
          </template>
          <a-select
            v-model:value="formState.leadMentorIds"
            mode="multiple"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :options="staffOptions"
            placeholder="输入姓名搜索班主任"
            @search="handleStaffSearch"
          />
        </a-form-item>

        <a-form-item name="assistantIds">
          <template #label>
            <span class="add-student-modal__label">助教</span>
          </template>
          <a-select
            v-model:value="formState.assistantIds"
            mode="multiple"
            show-search
            :filter-option="false"
            :loading="staffLoading"
            :options="staffOptions"
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

        <a-form-item name="contractAmount">
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

        <a-form-item name="totalHours">
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

        <a-form-item name="startDate">
          <template #label>
            <span class="add-student-modal__label">
              开始日期
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input v-model:value="formState.startDate" type="date" />
        </a-form-item>

        <a-form-item name="endDate">
          <template #label>
            <span class="add-student-modal__label">
              结束日期
              <span class="add-student-modal__required">*</span>
            </span>
          </template>
          <a-input v-model:value="formState.endDate" type="date" />
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
  school: string
  major: string
  graduationYear?: number
  studyPlan: 'normal' | 'postgraduate' | 'deferred'
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
  school: '',
  major: '',
  graduationYear: undefined,
  studyPlan: 'normal',
  targetRegion: undefined,
  recruitmentCycle: [],
  majorDirections: [],
  subDirection: undefined,
  leadMentorIds: [],
  assistantIds: [],
  contractAmount: undefined,
  totalHours: undefined,
  startDate: undefined,
  endDate: undefined
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
  formState.school = props.initialValue?.school ?? ''
  formState.major = props.initialValue?.major ?? ''
  formState.graduationYear = props.initialValue?.graduationYear
  formState.studyPlan = props.initialValue?.studyPlan ?? 'normal'
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
  school: formState.school.trim(),
  major: formState.major.trim(),
  graduationYear: formState.graduationYear,
  studyPlan: formState.studyPlan,
  targetRegion: formState.targetRegion,
  recruitmentCycle: [...formState.recruitmentCycle],
  majorDirections: [...formState.majorDirections],
  subDirection: formState.subDirection,
  leadMentorIds: [...formState.leadMentorIds],
  assistantIds: [...formState.assistantIds],
  contractAmount: formState.contractAmount,
  totalHours: formState.totalHours,
  startDate: formState.startDate,
  endDate: formState.endDate
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
.add-student-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

.add-student-modal__section {
  margin-top: 4px;
}

.add-student-modal__section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px 0;
  color: #0f172a;

  strong {
    font-size: 15px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
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
</style>
