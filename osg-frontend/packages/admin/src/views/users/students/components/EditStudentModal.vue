<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-new"
    width="880px"
    :body-class="'student-form-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="student-form-modal__title">
        <span class="mdi mdi-account-edit student-form-modal__title-icon" aria-hidden="true"></span>
        <span>编辑学员</span>
      </span>
    </template>

    <a-form
      :model="form"
      layout="vertical"
      :required-mark="false"
    >
      <!-- ══ Part 1: 基本信息 ══ -->
      <div class="student-form-modal__part-title student-form-modal__part-title--blue">
        <div class="student-form-modal__part-title-heading">
          <i class="mdi mdi-account-circle" aria-hidden="true"></i>
          <strong>{{ student?.studentName || '学员资料' }}</strong>
        </div>
        <p>ID {{ student?.studentId ?? '-' }} · {{ formatStatus(student?.accountStatus) }}</p>
      </div>

      <!-- ① 核心信息 -->
      <section class="student-form-modal__section student-form-modal__section--highlight">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--primary">核心信息</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="英文姓名">
            <template #label>
              <span class="student-form-modal__label">英文姓名</span>
            </template>
            <a-input v-model:value="form.studentName" :disabled="submitting" placeholder="例如 Emily Zhang" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="性别">
            <template #label>
              <span class="student-form-modal__label">性别</span>
            </template>
            <a-select v-model:value="form.gender" :disabled="submitting" :options="genderOptions" placeholder="请选择" />
          </a-form-item>

          <a-form-item class="student-form-modal__field--wide" data-field-name="邮箱">
            <template #label>
              <span class="student-form-modal__label">邮箱</span>
            </template>
            <a-input v-model:value="form.email" :disabled="submitting" placeholder="学员邮箱" allow-clear />
          </a-form-item>
        </div>
      </section>

      <!-- ② 导师配置 -->
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> 导师配置
          </span>
          <span class="student-form-modal__section-desc">可多选</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="班主任">
            <template #label>
              <span class="student-form-modal__label">班主任</span>
            </template>
            <MultiSelect
              v-model:value="form.leadMentorIds"
              :filter-option="false"
              :loading="staffLoading"
              :disabled="submitting"
              :options="mentorSelectOptions"
              placeholder="输入姓名搜索班主任"
              @search="handleStaffSearch"
            />
          </a-form-item>

          <a-form-item data-field-name="助教">
            <template #label>
              <span class="student-form-modal__label">助教</span>
            </template>
            <MultiSelect
              v-model:value="form.assistantIds"
              :filter-option="false"
              :loading="staffLoading"
              :disabled="submitting"
              :options="assistantSelectOptions"
              placeholder="输入姓名搜索助教"
              @search="handleStaffSearch"
            />
          </a-form-item>
        </div>
      </section>

      <!-- ③ 学业信息 -->
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--blue">
            <i class="mdi mdi-school" aria-hidden="true"></i> 学业信息
          </span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="学校">
            <template #label>
              <span class="student-form-modal__label">学校</span>
            </template>
            <MultiSelect
              v-model:value="form.school"
              :options="schoolOptions"
              :disabled="submitting"
              placeholder="可多选学校（读研/双学位等）"
            />
          </a-form-item>

          <a-form-item data-field-name="专业">
            <template #label>
              <span class="student-form-modal__label">专业</span>
            </template>
            <a-input v-model:value="form.major" :disabled="submitting" placeholder="例如 Finance" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="毕业年月">
            <template #label>
              <span class="student-form-modal__label">毕业年月</span>
            </template>
            <a-date-picker
              v-model:value="graduationMonthValue"
              picker="month"
              format="YYYY-MM"
              value-format="YYYY-MM"
              :disabled="submitting"
              :disabled-date="disabledGraduationMonth"
              placeholder="请选择毕业年月"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item data-field-name="高中">
            <template #label>
              <span class="student-form-modal__label">高中</span>
            </template>
            <a-input v-model:value="form.highSchool" :disabled="submitting" placeholder="选填" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="学业状态">
            <template #label>
              <span class="student-form-modal__label">学业状态</span>
            </template>
            <a-radio-group v-model:value="form.studyPlan" class="student-form-modal__radio-group" :disabled="submitting">
              <a-radio-button value="normal">正常毕业</a-radio-button>
              <a-radio-button value="postgraduate">读研</a-radio-button>
              <a-radio-button value="deferred">延毕</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item data-field-name="签证">
            <template #label>
              <span class="student-form-modal__label">签证</span>
            </template>
            <a-select
              v-model:value="form.visaStatus"
              :disabled="submitting"
              :options="visaStatusOptions"
              placeholder="请选择签证状态"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>

      <!-- ④ 求职方向 -->
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> 求职方向
          </span>
          <span class="student-form-modal__section-desc">可多选，子方向根据主攻方向联动显示</span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="求职地区">
            <template #label>
              <span class="student-form-modal__label">求职地区</span>
            </template>
            <MultiSelect
              v-model:value="form.targetRegion"
              :options="regionOptions"
              :disabled="submitting"
              placeholder="可多选求职地区"
            />
          </a-form-item>

          <a-form-item data-field-name="招聘周期" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">招聘周期</span>
            </template>
            <a-checkbox-group
              v-model:value="form.recruitmentCycle"
              :options="recruitmentCycleOptions"
              :disabled="submitting"
              class="student-form-modal__checkbox-flat"
            />
          </a-form-item>

          <a-form-item data-field-name="主攻方向">
            <template #label>
              <span class="student-form-modal__label">主攻方向</span>
            </template>
            <MultiSelect
              v-model:value="form.majorDirections"
              :options="majorDirOptions"
              :disabled="submitting"
              placeholder="可多选主攻方向"
            />
          </a-form-item>

          <a-form-item data-field-name="子方向">
            <template #label>
              <span class="student-form-modal__label">子方向</span>
            </template>
            <MultiSelect
              v-model:value="form.subDirections"
              :options="subDirOptions"
              :disabled="submitting"
              placeholder="可多选子方向"
            />
          </a-form-item>
        </div>
      </section>

      <!-- ⑤ 联系方式与备注 -->
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> 联系方式与备注
          </span>
        </div>
        <div class="student-form-modal__grid">
          <a-form-item data-field-name="电话">
            <template #label>
              <span class="student-form-modal__label">电话</span>
            </template>
            <div class="phone-input-group">
              <a-select
                v-model:value="form.phoneCountryCode"
                :options="phoneCountryOptions"
                class="phone-input-group__code"
                :disabled="submitting"
                :show-search="true"
                :filter-option="filterPhoneCountryOption"
              />
              <a-input
                v-model:value="form.phone"
                class="phone-input-group__number"
                :disabled="submitting"
                placeholder="选填"
              />
            </div>
          </a-form-item>

          <a-form-item data-field-name="微信">
            <template #label>
              <span class="student-form-modal__label">微信</span>
            </template>
            <a-input v-model:value="form.wechat" :disabled="submitting" placeholder="选填" allow-clear />
          </a-form-item>

          <a-form-item data-field-name="备注" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">备注</span>
            </template>
            <a-textarea
              v-model:value="form.remark"
              :disabled="submitting"
              placeholder="选填，可填写学员补充说明"
              :rows="4"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>

      <!-- ⑥ 合同（视觉对齐新增弹窗）-->
      <section class="student-form-modal__section">
        <div class="student-form-modal__section-header">
          <span class="student-form-modal__section-badge student-form-modal__section-badge--blue">
            <i class="mdi mdi-file-document" aria-hidden="true"></i> 合同
          </span>
          <span class="student-form-modal__section-desc">编辑当前生效合同</span>
        </div>
        <div v-if="!activeContract" class="student-form-modal__attachment-empty">
          该学员暂无生效合同，请在合同模块续签或新建后再编辑。
        </div>
        <div v-else class="student-form-modal__grid">
          <a-form-item data-field-name="币种" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">
                币种
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-radio-group v-model:value="contractForm.currency" :disabled="submitting">
              <a-radio-button value="USD">美元 (USD)</a-radio-button>
              <a-radio-button value="GBP">英镑 (GBP)</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="contractForm.currency === 'GBP'" data-field-name="英镑金额">
            <template #label>
              <span class="student-form-modal__label">
                英镑金额
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.amountGbp"
              :disabled="submitting"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              style="width: 100%"
              placeholder="£ 请输入英镑金额"
            />
          </a-form-item>

          <a-form-item data-field-name="美元金额">
            <template #label>
              <span class="student-form-modal__label">
                {{ contractForm.currency === 'GBP' ? '美元等值金额' : '美元金额' }}
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.amountUsd"
              :disabled="submitting"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              style="width: 100%"
              :placeholder="contractForm.currency === 'GBP' ? '$ 请输入美元等值金额' : '$ 请输入美元金额'"
            />
          </a-form-item>

          <a-form-item data-field-name="课时（小时）">
            <template #label>
              <span class="student-form-modal__label">
                课时（小时）
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="contractForm.totalHours"
              :disabled="submitting"
              :min="1"
              :max="MAX_CONTRACT_HOURS"
              :precision="0"
              :controls="false"
              style="width: 100%"
              placeholder="如 40"
            />
          </a-form-item>

          <a-form-item data-field-name="合同开始日期">
            <template #label>
              <span class="student-form-modal__label">
                合同开始日期
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="contractForm.startDate"
              :disabled="submitting"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              placeholder="请选择合同开始日期"
            />
          </a-form-item>

          <a-form-item data-field-name="合同结束日期">
            <template #label>
              <span class="student-form-modal__label">
                合同结束日期
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-date-picker
              v-model:value="contractForm.endDate"
              :disabled="submitting"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              placeholder="请选择合同结束日期"
            />
          </a-form-item>

          <a-form-item data-field-name="合同附件" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">
                合同附件
                <span class="student-form-modal__required">*</span>
              </span>
            </template>
            <a-upload-dragger
              :action="contractUploadAction"
              :headers="contractUploadHeaders"
              :data="contractUploadData"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg"
              :max-count="1"
              :file-list="contractFileList"
              :before-upload="beforeContractUpload"
              @change="handleContractUploadChange"
            >
              <p class="ant-upload-drag-icon">
                <i class="mdi mdi-cloud-upload" style="font-size: 28px; color: #4f74ff"></i>
              </p>
              <p class="ant-upload-text">
                {{ contractForm.attachmentPath ? '点击或拖拽文件替换附件' : '点击或拖拽文件上传' }}
              </p>
              <p class="ant-upload-hint">仅支持 PDF / PNG / JPG / JPEG，单文件不超过 150MB</p>
            </a-upload-dragger>
          </a-form-item>

          <a-form-item data-field-name="合同备注" class="student-form-modal__field--wide">
            <template #label>
              <span class="student-form-modal__label">备注</span>
            </template>
            <a-textarea
              v-model:value="contractForm.remark"
              :disabled="submitting"
              placeholder="选填，可填写特殊约定等"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </section>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">保存修改</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import type { StudentListItem, UpdateStudentPayload } from '@osg/shared/api/admin/student'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import type { ContractListItem, UpdateContractPayload } from '@osg/shared/api/admin/contract'
import { getAdminDictOptions } from '@/api/adminDict'
import { http } from '@osg/shared/utils/request'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { MultiSelect } from '@osg/shared/components'
import { splitPhone, joinPhone, MAX_AMOUNT, MAX_AMOUNT_MESSAGE, MAX_CONTRACT_HOURS, MAX_CONTRACT_HOURS_MESSAGE } from '@osg/shared/utils'
import { getToken } from '@osg/shared/utils/storage'
import { useDictFacade } from '@osg/shared/composables'

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
  submit: [
    payload: UpdateStudentPayload,
    contractPatch?: { contractId: number; payload: UpdateContractPayload }
  ]
}>()

const genderOptions = [
  { label: '男', value: '0' },
  { label: '女', value: '1' }
]

const form = reactive({
  studentName: '',
  gender: '' as string,
  email: '',
  school: [] as string[],
  majorDirections: [] as string[],
  subDirections: [] as string[],
  major: '',
  graduationYear: '' as string | number,
  highSchool: '',
  studyPlan: 'normal' as 'normal' | 'postgraduate' | 'deferred',
  visaStatus: '' as string | undefined,
  targetRegion: [] as string[],
  recruitmentCycle: [] as string[],
  phone: '',
  phoneCountryCode: '+1',
  wechat: '',
  remark: '',
  leadMentorIds: [] as number[],
  assistantIds: [] as number[],
})

const { items: countryCodeItems, load: loadCountryCode } = useDictFacade('osg_country_code')
const phoneCountryOptions = computed(() => {
  const items = countryCodeItems.value
    .map((item) => ({
      value: item.extra?.callingCode || '',
      label: `${item.extra?.callingCode ?? ''} ${item.label}`.trim(),
    }))
    .filter((opt) => opt.value)
  return items.length ? items : [{ value: '+1', label: '+1 美国/加拿大' }]
})
const filterPhoneCountryOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true
  return option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword)
}

const staffOptions = ref<StaffListItem[]>([])
const staffLoading = ref(false)

const schoolOptions = ref<{ label: string; value: string }[]>([])
const majorDirOptions = ref<{ label: string; value: string }[]>([])
const allSubDirItems = ref<{ label: string; value: string; parentValue?: string }[]>([])
const subDirOptions = computed(() => {
  if (!form.majorDirections.length) return []
  return allSubDirItems.value.filter(
    item => item.parentValue && form.majorDirections.includes(item.parentValue)
  )
})
const regionOptions = ref<{ label: string; value: string }[]>([])
const recruitmentCycleOptions = ref<{ label: string; value: string }[]>([])
const visaStatusOptions = ref<{ label: string; value: string }[]>([])

const graduationMonthValue = ref<string | null>(null)

watch(graduationMonthValue, (next) => {
  if (!next) {
    form.graduationYear = ''
    return
  }
  form.graduationYear = typeof next === 'string'
    ? next.slice(0, 4)
    : String((next as Dayjs).year())
})

const disabledGraduationMonth = (current?: Dayjs) => {
  if (!current) return false
  const today = dayjs().startOf('month')
  const max = today.add(3, 'year').endOf('month')
  return current.isBefore(today) || current.isAfter(max)
}

watch(() => form.majorDirections, (next) => {
  const validParents = new Set(next)
  form.subDirections = form.subDirections.filter(sub => {
    const item = allSubDirItems.value.find(i => i.value === sub)
    return item?.parentValue && validParents.has(item.parentValue)
  })
})

const loadDictOptions = async () => {
  const [schools, majors, subs, regions, cycles, visas] = await Promise.all([
    getAdminDictOptions('osg_school'),
    getAdminDictOptions('osg_major_direction'),
    getAdminDictOptions('osg_sub_direction'),
    getAdminDictOptions('osg_region'),
    getAdminDictOptions('osg_recruit_cycle'),
    getAdminDictOptions('osg_visa_status'),
  ])
  schoolOptions.value = schools.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  majorDirOptions.value = majors.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  allSubDirItems.value = subs.map(d => ({ label: d.dictLabel, value: d.dictValue, parentValue: d.parentValue }))
  regionOptions.value = regions.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  recruitmentCycleOptions.value = cycles.map(d => ({ label: d.dictLabel, value: d.dictValue }))
  visaStatusOptions.value = visas.map(d => ({ label: d.dictLabel, value: d.dictValue }))
}

const mentorSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'lead_mentor' && item.staffId != null)
  .map((item) => ({ label: item.staffName, value: item.staffId })))

const assistantSelectOptions = computed(() => staffOptions.value
  .filter((item) => item.staffType === 'assistant' && item.staffId != null)
  .map((item) => ({ label: item.staffName, value: item.staffId })))

const mergeCurrentOption = (
  staffType: 'lead_mentor' | 'assistant',
  staffId?: number,
  label?: string
) => {
  if (staffId == null) return
  if (staffOptions.value.some((item) => item.staffId === staffId)) return
  staffOptions.value = [
    ...staffOptions.value,
    {
      staffId,
      staffName: label || `${staffType === 'lead_mentor' ? '班主任' : '助教'} ${staffId}`,
      staffType,
    },
  ]
}

const seedStaffOptionsFromStudent = (student?: StudentListItem | null) => {
  if (!student) return
  const leadIds = student.leadMentorIds?.length ? student.leadMentorIds : (student.leadMentorId != null ? [student.leadMentorId] : [])
  const leadNames = student.leadMentorNames?.length ? student.leadMentorNames : (student.leadMentorName ? [student.leadMentorName] : [])
  leadIds.forEach((id, idx) => mergeCurrentOption('lead_mentor', id, leadNames[idx]))
  const asstIds = student.assistantIds?.length ? student.assistantIds : (student.assistantId != null ? [student.assistantId] : [])
  const asstNames = student.assistantNames?.length ? student.assistantNames : (student.assistantName ? [student.assistantName] : [])
  asstIds.forEach((id, idx) => mergeCurrentOption('assistant', id, asstNames[idx]))
}

const toExtraStudentFields = (student?: StudentListItem | null) => (student ?? {}) as unknown as {
  gender?: string
  phone?: string
  wechat?: string
  remark?: string
  highSchool?: string
  studyPlan?: 'normal' | 'postgraduate' | 'deferred'
  visaStatus?: string
  major?: string
  recruitmentCycle?: string
  recruitmentCycles?: string[]
  majorDirections?: string[]
  subDirections?: string[]
  subDirection?: string
  graduationYear?: number | string
}

const splitCsv = (value?: string) => (value ? value.split(',').map(v => v.trim()).filter(Boolean) : [])

// ── 合同区域 state（编辑学员的最新一份合同）──
// 策略：按 contractId DESC 取最新一份。
// 当前业务下所有合同 contractStatus 都是 'active'，"取最新" 与 "取 active" 等价；
// 但 contractId 排序更稳定：多 active 脏数据时稳定取最新那条；未来出现非 active status 时也能正确展示。
// 变量名保留 activeContract（语义：当前要编辑的合同），后端仍强制 active 才能写入（安全兜底）。
const activeContract = ref<ContractListItem | null>(null)

const contractForm = reactive({
  currency: 'USD' as 'USD' | 'GBP',
  amountUsd: undefined as number | undefined,
  amountGbp: undefined as number | undefined,
  totalHours: undefined as number | undefined,
  startDate: '' as string,
  endDate: '' as string,
  attachmentPath: '' as string,
  remark: '' as string,
})

const contractUploadAction = '/api/admin/contract/upload'
const contractUploadHeaders = computed(() => ({ Authorization: `Bearer ${getToken() || ''}` }))
// 上传时携带 contractId，复用后端 /admin/contract/upload?contractId= 同步绑定到合同
const contractUploadData = computed(() => {
  const cid = activeContract.value?.contractId
  return cid != null ? { contractId: String(cid) } : {}
})

// 附件展示列表（对齐 AddStudentModal 的 a-upload-dragger file-list 语义）
type ContractFileItem = { uid: string; name: string; status: 'done'; url: string }
const contractFileList = ref<ContractFileItem[]>([])

const buildFileListFromPath = (path: string): ContractFileItem[] => {
  if (!path) return []
  const segs = path.split('/')
  const name = segs[segs.length - 1] || path
  return [{ uid: `contract-${Date.now()}`, name, status: 'done', url: path }]
}

const MAX_CONTRACT_UPLOAD_MB = 150
const MAX_CONTRACT_UPLOAD_BYTES = MAX_CONTRACT_UPLOAD_MB * 1024 * 1024
const ALLOWED_CONTRACT_EXTS = /\.(pdf|png|jpe?g)$/i

const resetContractForm = () => {
  contractForm.currency = 'USD'
  contractForm.amountUsd = undefined
  contractForm.amountGbp = undefined
  contractForm.totalHours = undefined
  contractForm.startDate = ''
  contractForm.endDate = ''
  contractForm.attachmentPath = ''
  contractForm.remark = ''
  contractFileList.value = []
}

const syncContractForm = (contract: ContractListItem) => {
  const currencyUpper = (contract.currency || '').toUpperCase()
  contractForm.currency = currencyUpper === 'GBP' ? 'GBP' : 'USD'
  contractForm.amountUsd = contract.amountUsd ?? (contractForm.currency === 'USD' ? contract.contractAmount : undefined)
  contractForm.amountGbp = contract.amountGbp ?? (contractForm.currency === 'GBP' ? contract.contractAmount : undefined)
  contractForm.totalHours = contract.totalHours
  contractForm.startDate = (contract.startDate || '').slice(0, 10)
  contractForm.endDate = (contract.endDate || '').slice(0, 10)
  contractForm.attachmentPath = contract.attachmentPath || ''
  contractForm.remark = (contract as unknown as { remark?: string }).remark || ''
  contractFileList.value = buildFileListFromPath(contractForm.attachmentPath)
}

const loadStudentContract = async (studentId?: number | null) => {
  activeContract.value = null
  resetContractForm()
  if (!studentId) return
  try {
    const res = await http.get<{ contracts: ContractListItem[] }>(`/admin/student/${studentId}/contracts`)
    const contracts = res?.contracts || []
    // 按 contractId DESC 取最新一份（contractId 递增天然反映创建顺序）
    const sorted = [...contracts].sort((a, b) => (b.contractId || 0) - (a.contractId || 0))
    const latest = sorted[0]
    if (latest) {
      activeContract.value = latest
      syncContractForm(latest)
    }
  } catch (_error) {
    activeContract.value = null
  }
}

const beforeContractUpload = (file: File) => {
  if (!ALLOWED_CONTRACT_EXTS.test(file.name || '')) {
    message.error('仅支持 PDF / PNG / JPG / JPEG')
    return false
  }
  if (file.size > MAX_CONTRACT_UPLOAD_BYTES) {
    message.error(`文件超过 ${MAX_CONTRACT_UPLOAD_MB}MB（实际 ${(file.size / 1024 / 1024).toFixed(2)}MB）`)
    return false
  }
  return true
}

const handleContractUploadChange = (info: UploadChangeParam) => {
  if (info.file.status === 'done') {
    const response = info.file.response as { code?: number; msg?: string; attachmentPath?: string; url?: string; fileName?: string } | undefined
    if (response && response.code !== undefined && response.code !== 200) {
      contractForm.attachmentPath = ''
      contractFileList.value = []
      message.error(`上传失败：${response.msg || '后端返回错误'}`)
      return
    }
    const url = response?.attachmentPath || response?.url || response?.fileName || ''
    if (url) {
      contractForm.attachmentPath = url
      contractFileList.value = buildFileListFromPath(url)
      message.success('上传成功')
    }
  } else if (info.file.status === 'error') {
    contractForm.attachmentPath = ''
    contractFileList.value = []
    message.error('上传失败：网络或服务器错误')
  } else if (info.file.status === 'removed') {
    contractForm.attachmentPath = ''
    contractFileList.value = []
  }
}

const buildContractPatch = (): { contractId: number; payload: UpdateContractPayload } | undefined => {
  const orig = activeContract.value
  if (!orig) return undefined

  const patch: UpdateContractPayload = {}
  const origCurrency = (orig.currency || '').toUpperCase() === 'GBP' ? 'GBP' : 'USD'
  if (contractForm.currency !== origCurrency) patch.currency = contractForm.currency
  if (contractForm.amountUsd !== orig.amountUsd) patch.amountUsd = contractForm.amountUsd
  if (contractForm.amountGbp !== orig.amountGbp) patch.amountGbp = contractForm.amountGbp
  // contractAmount 跟随 currency 自动取对应金额
  const newAmount = contractForm.currency === 'USD' ? contractForm.amountUsd : contractForm.amountGbp
  if (newAmount != null && newAmount !== orig.contractAmount) patch.contractAmount = newAmount
  if (contractForm.totalHours != null && contractForm.totalHours !== orig.totalHours) patch.totalHours = contractForm.totalHours
  if (contractForm.startDate && contractForm.startDate !== (orig.startDate || '').slice(0, 10)) patch.startDate = contractForm.startDate
  if (contractForm.endDate && contractForm.endDate !== (orig.endDate || '').slice(0, 10)) patch.endDate = contractForm.endDate
  if (contractForm.attachmentPath !== (orig.attachmentPath || '')) patch.attachmentPath = contractForm.attachmentPath
  const origRemark = (orig as unknown as { remark?: string }).remark || ''
  if (contractForm.remark !== origRemark) patch.remark = contractForm.remark

  return Object.keys(patch).length ? { contractId: orig.contractId, payload: patch } : undefined
}

// 拉详情接口补齐表单回显（list row 不含 highSchool / visaStatus / studyPlan / subDirections / recruitmentCycles 等）
const loadStudentDetail = async (studentId?: number | null) => {
  if (!studentId) return
  try {
    const d = await http.get<{
      schools?: string[]
      major?: string
      graduationYear?: number
      graduationMonth?: string
      highSchool?: string
      visaStatus?: string
      academic?: { studyPlan?: string; highSchool?: string; visaStatus?: string }
      jobDirection?: { targetRegion?: string; recruitmentCycles?: string[]; majorDirections?: string[]; subDirection?: string }
      mentor?: { leadMentorIds?: number[]; leadMentorNames?: string[]; assistantIds?: number[]; assistantNames?: string[] }
      remark?: string
      contact?: { phone?: string; wechat?: string }
      gender?: string
    }>(`/admin/student/${studentId}`)
    if (!d) return

    if (d.schools?.length) form.school = [...d.schools]
    if (d.major) form.major = d.major
    if (d.graduationYear) form.graduationYear = String(d.graduationYear)
    if (d.graduationMonth) graduationMonthValue.value = d.graduationMonth
    else if (d.graduationYear) graduationMonthValue.value = `${d.graduationYear}-06`
    const academic = d.academic || {}
    form.highSchool = d.highSchool || academic.highSchool || form.highSchool
    form.visaStatus = d.visaStatus || academic.visaStatus || form.visaStatus
    if (academic.studyPlan === 'normal' || academic.studyPlan === 'postgraduate' || academic.studyPlan === 'deferred') {
      form.studyPlan = academic.studyPlan
    }
    const job = d.jobDirection || {}
    if (job.majorDirections?.length) form.majorDirections = [...job.majorDirections]
    if (job.subDirection) form.subDirections = job.subDirection.split(',').map(s => s.trim()).filter(Boolean)
    if (job.targetRegion) form.targetRegion = job.targetRegion.split(',').map(s => s.trim()).filter(Boolean)
    if (job.recruitmentCycles?.length) form.recruitmentCycle = [...job.recruitmentCycles]
    if (d.mentor?.leadMentorIds?.length) form.leadMentorIds = [...d.mentor.leadMentorIds]
    if (d.mentor?.assistantIds?.length) form.assistantIds = [...d.mentor.assistantIds]
    if (d.contact?.phone) {
      const parsed = splitPhone(d.contact.phone)
      form.phoneCountryCode = parsed.countryCode
      form.phone = parsed.number
    }
    if (d.contact?.wechat) form.wechat = d.contact.wechat
    if (d.remark) form.remark = d.remark
    if (d.gender) form.gender = d.gender
    // mentor names 灌进 staffOptions 让 MultiSelect 能渲染 label
    d.mentor?.leadMentorIds?.forEach((id, idx) => mergeCurrentOption('lead_mentor', id, d.mentor?.leadMentorNames?.[idx]))
    d.mentor?.assistantIds?.forEach((id, idx) => mergeCurrentOption('assistant', id, d.mentor?.assistantNames?.[idx]))
  } catch (_error) {
    // detail 拉失败时维持 syncForm 已填的内容
  }
}

const syncForm = () => {
  const extra = toExtraStudentFields(props.student)
  form.studentName = props.student?.studentName || ''
  form.gender = extra.gender || ''
  form.email = props.student?.email || ''
  // student.school 后端返回 CSV，detail.schools[] 为数组；统一切成数组喂 MultiSelect
  const schoolDetail = (props.student as unknown as { schools?: string[] })?.schools
  form.school = schoolDetail?.length
    ? [...schoolDetail]
    : (props.student?.school ? props.student.school.split(',').map(s => s.trim()).filter(Boolean) : [])
  form.major = extra.major || ''
  form.graduationYear = extra.graduationYear ?? ''
  const studentGm = (props.student as unknown as { graduationMonth?: string })?.graduationMonth
  graduationMonthValue.value = studentGm
    || (form.graduationYear ? `${form.graduationYear}-06` : null)
  form.highSchool = extra.highSchool || ''
  form.studyPlan = (extra.studyPlan as typeof form.studyPlan) || 'normal'
  form.visaStatus = extra.visaStatus || undefined

  form.majorDirections = extra.majorDirections?.length
    ? [...extra.majorDirections]
    : splitCsv(props.student?.majorDirection)
  form.subDirections = extra.subDirections?.length
    ? [...extra.subDirections]
    : splitCsv(extra.subDirection)
  form.targetRegion = splitCsv(props.student?.targetRegion)
  form.recruitmentCycle = extra.recruitmentCycles?.length
    ? [...extra.recruitmentCycles]
    : splitCsv(extra.recruitmentCycle)

  form.leadMentorIds = props.student?.leadMentorIds?.length
    ? [...props.student.leadMentorIds]
    : (props.student?.leadMentorId != null ? [props.student.leadMentorId] : [])
  form.assistantIds = props.student?.assistantIds?.length
    ? [...props.student.assistantIds]
    : (props.student?.assistantId != null ? [props.student.assistantId] : [])

  if (extra.phone) {
    const parsed = splitPhone(extra.phone)
    form.phoneCountryCode = parsed.countryCode
    form.phone = parsed.number
  } else {
    form.phoneCountryCode = '+1'
    form.phone = ''
  }
  form.wechat = extra.wechat || ''
  form.remark = extra.remark || ''

  seedStaffOptionsFromStudent(props.student)
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
    seedStaffOptionsFromStudent(props.student)
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
  ([visible, student]) => {
    if (visible) {
      syncForm()
      void loadStaffOptions()
      void loadDictOptions()
      void loadCountryCode()
      void loadStudentContract(student?.studentId)
      void loadStudentDetail(student?.studentId)
    }
  },
  { immediate: true }
)

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
  if (!form.school?.length) {
    message.error('请填写学校')
    return
  }

  // 起止日期联合校验：在 emit 前先在前端拦截，避免一次保存里学员主体已写入但合同失败的不一致
  if (activeContract.value && contractForm.startDate && contractForm.endDate
      && contractForm.endDate < contractForm.startDate) {
    message.error('合同结束日期不能早于开始日期')
    return
  }

  // 金额上限校验（与 a-input-number :max 双保险，防止代码外部赋值）
  if ((contractForm.amountUsd ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if ((contractForm.amountGbp ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if ((contractForm.totalHours ?? 0) > MAX_CONTRACT_HOURS) {
    message.error(MAX_CONTRACT_HOURS_MESSAGE)
    return
  }

  const studentPayload = {
    studentId: props.student.studentId,
    studentName: form.studentName.trim() || props.student.studentName,
    email: form.email.trim(),
    school: form.school,
    major: form.major.trim() || undefined,
    graduationYear: form.graduationYear ? Number(form.graduationYear) || undefined : undefined,
    graduationMonth: graduationMonthValue.value || undefined,
    majorDirections: form.majorDirections.length ? [...form.majorDirections] : undefined,
    subDirections: form.subDirections.length ? [...form.subDirections] : undefined,
    targetRegion: form.targetRegion.length ? [...form.targetRegion] : undefined,
    recruitmentCycle: form.recruitmentCycle.length ? [...form.recruitmentCycle] : undefined,
    highSchool: form.highSchool.trim() || undefined,
    studyPlan: form.studyPlan,
    visaStatus: form.visaStatus || undefined,
    remark: form.remark.trim() || undefined,
    leadMentorIds: form.leadMentorIds.length ? [...form.leadMentorIds] : undefined,
    assistantIds: form.assistantIds.length ? [...form.assistantIds] : undefined,
    phone: joinPhone(form.phoneCountryCode, form.phone),
    wechat: form.wechat.trim() || undefined,
    gender: form.gender || undefined,
  } as UpdateStudentPayload & { phone?: string; wechat?: string; gender?: string }

  const contractPatch = buildContractPatch()
  emit('submit', studentPayload, contractPatch)
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1': return '冻结'
    case '2': return '已结束'
    case '3': return '退费'
    default: return '正常'
  }
}
</script>

<!-- student-form.scss 注入 portal 出去的 body 节点（OverlaySurfaceModal），必须非 scoped -->
<style lang="scss">
@use './student-form.scss';
</style>

<style scoped lang="scss">
.phone-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-input-group__code {
  flex: 0 0 130px;
}

.phone-input-group__number {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
