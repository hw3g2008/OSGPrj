<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="position-form-modal"
    width="860px"
    :body-class="'position-form-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="position-form-modal__title-wrap">
        <div>
          <span class="position-form-modal__eyebrow">Position Form</span>
          <div class="position-form-modal__title">
            <span :class="['mdi', isEditing ? 'mdi-briefcase-edit' : 'mdi-briefcase-plus']" aria-hidden="true"></span>
            <span>{{ modeTitle }}</span>
          </div>
        </div>
        <span class="position-form-modal__hint">基本信息 + 公司信息 + 展示设置</span>
      </div>
    </template>

    <div class="position-form-modal__sections">
      <section class="position-form-modal__section">
        <header>
          <h3>基本信息</h3>
          <p>岗位分类、岗位名称、部门和招聘周期。</p>
        </header>
        <div class="position-form-modal__grid">
          <label class="position-form-modal__field">
            <span>岗位分类 <em class="position-form-modal__req">*</em></span>
            <select v-model="form.positionCategory" class="position-form-modal__select">
              <option value="">请选择</option>
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="position-form-modal__field">
            <span>岗位名称 <em class="position-form-modal__req">*</em></span>
            <input v-model="form.positionName" type="text" class="position-form-modal__input" placeholder="如 IB Analyst" />
          </label>
          <label class="position-form-modal__field">
            <span>部门</span>
            <input v-model="form.department" type="text" class="position-form-modal__input" placeholder="如 IBD / S&T（选填）" />
          </label>
          <label class="position-form-modal__field">
            <span>项目时间 <em class="position-form-modal__req">*</em></span>
            <select v-model="form.projectYear" class="position-form-modal__select">
              <option value="">请选择</option>
              <option v-for="option in projectYearOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
        <div class="position-form-modal__chips">
          <span class="position-form-modal__chip-label">招聘周期 <em class="position-form-modal__req">*</em> <span class="position-form-modal__chip-hint">(可多选)</span></span>
          <label
            v-for="option in recruitmentCycleOptions"
            :key="option"
            :class="['position-form-modal__chip', { 'position-form-modal__chip--active': selectedCycles.includes(option) }]"
          >
            <input
              type="checkbox"
              :checked="selectedCycles.includes(option)"
              class="position-form-modal__chip-checkbox"
              @change="toggleCycle(option)"
            />
            {{ option }}
          </label>
        </div>
      </section>

      <section class="position-form-modal__section">
        <header>
          <h3>公司信息</h3>
          <p>支持搜索下拉、地区二级联动和官网/岗位链接配置。</p>
        </header>
        <div class="position-form-modal__grid">
          <label class="position-form-modal__field">
            <span>公司名称 <em class="position-form-modal__req">*</em></span>
            <input
              v-model="form.companyName"
              list="position-company-options"
              type="text"
              class="position-form-modal__input"
              placeholder="搜索公司..."
            />
            <datalist id="position-company-options">
              <option v-for="option in companyOptions" :key="option" :value="option" />
            </datalist>
          </label>
          <label class="position-form-modal__field">
            <span>公司类别 <em class="position-form-modal__req">*</em></span>
            <select v-model="form.companyType" class="position-form-modal__select">
              <option value="">请选择</option>
              <option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="position-form-modal__field">
            <span>大区 <em class="position-form-modal__req">*</em></span>
            <select v-model="form.region" class="position-form-modal__select">
              <option value="">请选择</option>
              <option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="position-form-modal__field">
            <span>城市 <em class="position-form-modal__req">*</em></span>
            <select v-model="form.city" class="position-form-modal__select">
              <option value="">{{ form.region ? '请选择' : '请先选择大区' }}</option>
              <option v-for="option in currentCityOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="position-form-modal__field">
            <span>公司官网 <em class="position-form-modal__req">*</em></span>
            <input v-model="form.companyWebsite" type="url" class="position-form-modal__input" placeholder="https://..." />
          </label>
          <label class="position-form-modal__field">
            <span>岗位链接 <em class="position-form-modal__req">*</em></span>
            <input v-model="form.positionUrl" type="url" class="position-form-modal__input" placeholder="https://..." />
          </label>
          <label class="position-form-modal__field">
            <span>截止日期 <span class="position-form-modal__optional">(选填)</span></span>
            <input v-model="form.deadline" type="date" class="position-form-modal__input" />
          </label>
        </div>
      </section>

      <section class="position-form-modal__section">
        <header>
          <h3>展示设置</h3>
          <p>控制岗位展示时间和对学员的投递提示。</p>
        </header>
        <div class="position-form-modal__grid">
          <label class="position-form-modal__field">
            <span>开始时间 <em class="position-form-modal__req">*</em></span>
            <input v-model="form.displayStartTime" type="datetime-local" class="position-form-modal__input" />
          </label>
          <label class="position-form-modal__field">
            <span>结束时间 <em class="position-form-modal__req">*</em></span>
            <input v-model="form.displayEndTime" type="datetime-local" class="position-form-modal__input" />
          </label>
          <label class="position-form-modal__field position-form-modal__field--wide">
            <span>投递备注</span>
            <textarea v-model="form.applicationNote" class="position-form-modal__textarea" rows="4" placeholder="提醒学生投递时的注意事项..."></textarea>
          </label>
        </div>
        <p class="position-form-modal__auto-archive-hint">
          <span class="mdi mdi-information-outline" aria-hidden="true"></span>
          到达结束时间后自动归档
        </p>
      </section>

      <section v-if="isEditing" class="position-form-modal__status-bar">
        <div class="position-form-modal__status-info">
          <span class="mdi mdi-toggle-switch" aria-hidden="true"></span>
          <div>
            <div class="position-form-modal__status-label">
              岗位状态：
              <span :class="['position-form-modal__status-tag', `position-form-modal__status-tag--${form.displayStatus}`]">
                {{ formatDisplayStatus(form.displayStatus) }}
              </span>
            </div>
            <div class="position-form-modal__status-note">隐藏后学员将无法看到此岗位</div>
          </div>
        </div>
        <div class="position-form-modal__status-actions">
          <button type="button" class="position-form-modal__status-btn position-form-modal__status-btn--hide" @click="form.displayStatus = 'hidden'">
            <span class="mdi mdi-eye-off" aria-hidden="true"></span> 隐藏
          </button>
          <button type="button" class="position-form-modal__status-btn position-form-modal__status-btn--activate" @click="form.displayStatus = 'visible'">
            <span class="mdi mdi-refresh" aria-hidden="true"></span> 激活
          </button>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="position-form-modal__footer">
        <button type="button" class="position-form-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="position-form-modal__primary" @click="handleSubmit">
          <span class="mdi mdi-check" aria-hidden="true"></span>
          {{ isEditing ? '保存' : '保存' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { PositionListItem, PositionPayload } from '@osg/shared/api/admin/position'

const props = defineProps<{
  visible: boolean
  position?: PositionListItem | null
  companyOptions: string[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: PositionPayload]
}>()

const categoryOptions = [
  { value: 'summer', label: '暑期实习' },
  { value: 'fulltime', label: '全职招聘' },
  { value: 'offcycle', label: '非常规周期' },
  { value: 'spring', label: '春季实习' },
  { value: 'events', label: '招聘活动' }
]

const industryOptions = ['Investment Bank', 'Consulting', 'Tech', 'PE', 'VC', 'Other']
const recruitmentCycleOptions = [
  '2024 Summer', '2024 Full-time', '2024 Off-cycle',
  '2025 Summer', '2025 Full-time', '2025 Off-cycle',
  '2026 Summer', '2026 Full-time'
]
const projectYearOptions = ['2024', '2025', '2026', '2027']

const regionOptions = [
  { value: 'na', label: '北美' },
  { value: 'eu', label: '欧洲' },
  { value: 'ap', label: '亚太' },
  { value: 'cn', label: '中国大陆' }
]

const cityMap: Record<string, string[]> = {
  na: ['New York', 'San Francisco', 'Chicago', 'Boston'],
  eu: ['London', 'Frankfurt'],
  ap: ['Hong Kong', 'Singapore', 'Tokyo'],
  cn: ['Shanghai', 'Beijing']
}

const form = reactive({
  positionCategory: '',
  positionName: '',
  department: '',
  companyName: '',
  companyType: '',
  companyWebsite: '',
  region: '',
  city: '',
  projectYear: '',
  displayStatus: 'visible',
  displayStartTime: '',
  displayEndTime: '',
  positionUrl: '',
  applicationNote: '',
  deadline: '',
  recruitmentCycles: [] as string[]
})

const isEditing = computed(() => Boolean(props.position?.positionId))
const modeTitle = computed(() => (isEditing.value ? '编辑岗位' : '新增岗位'))
const selectedCycles = computed(() => form.recruitmentCycles)
const currentCityOptions = computed(() => cityMap[form.region] || [])

const formatDisplayStatus = (value: string) => {
  if (value === 'hidden') return '已隐藏'
  if (value === 'expired') return '已过期'
  return '展示中'
}

const toDateTimeLocal = (value?: string) => {
  if (!value) {
    return ''
  }
  return value.slice(0, 16)
}

const toDateValue = (value?: string) => {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

const resetForm = () => {
  const now = new Date()
  const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  form.positionCategory = props.position?.positionCategory || ''
  form.positionName = props.position?.positionName || ''
  form.department = props.position?.department || ''
  form.companyName = props.position?.companyName || ''
  form.companyType = props.position?.companyType || props.position?.industry || ''
  form.companyWebsite = props.position?.companyWebsite || ''
  form.region = props.position?.region || ''
  form.city = props.position?.city || ''
  form.projectYear = props.position?.projectYear || ''
  form.displayStatus = props.position?.displayStatus || 'visible'
  form.displayStartTime = toDateTimeLocal(props.position?.displayStartTime) || now.toISOString().slice(0, 16)
  form.displayEndTime = toDateTimeLocal(props.position?.displayEndTime) || end.toISOString().slice(0, 16)
  form.positionUrl = props.position?.positionUrl || ''
  form.applicationNote = props.position?.applicationNote || ''
  form.deadline = toDateValue(props.position?.deadline)
  form.recruitmentCycles = (props.position?.recruitmentCycle || '').split(',').map(item => item.trim()).filter(Boolean)
}

const toggleCycle = (value: string) => {
  if (form.recruitmentCycles.includes(value)) {
    form.recruitmentCycles = form.recruitmentCycles.filter(item => item !== value)
    return
  }
  form.recruitmentCycles = [...form.recruitmentCycles, value]
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.positionCategory || !form.positionName || !form.companyName || !form.region || !form.city || !form.projectYear || !form.recruitmentCycles.length) {
    message.error('请补全岗位分类、岗位名称、公司、地区、项目时间和招聘周期')
    return
  }
  if (!form.displayStartTime || !form.displayEndTime) {
    message.error('请补全展示时间')
    return
  }

  emit('submit', {
    positionId: props.position?.positionId,
    positionCategory: form.positionCategory,
    industry: form.companyType || 'Other',
    companyName: form.companyName,
    companyType: form.companyType || 'Other',
    companyWebsite: form.companyWebsite || undefined,
    positionName: form.positionName,
    department: form.department || undefined,
    region: form.region,
    city: form.city,
    recruitmentCycle: form.recruitmentCycles.join(','),
    projectYear: form.projectYear,
    displayStatus: form.displayStatus,
    displayStartTime: form.displayStartTime,
    displayEndTime: form.displayEndTime,
    positionUrl: form.positionUrl || undefined,
    applicationNote: form.applicationNote || undefined,
    deadline: form.deadline || undefined
  })
}

watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
  }
}, { immediate: true })

watch(() => form.region, () => {
  if (form.city && !currentCityOptions.value.includes(form.city)) {
    form.city = ''
  }
})
</script>

<style scoped lang="scss">
.position-form-modal__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.position-form-modal__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7a8ea8;
}

.position-form-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.position-form-modal__hint {
  color: #5b6f88;
  font-size: 13px;
}

.position-form-modal__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.position-form-modal__section {
  border: 1px solid #e7edf5;
  border-radius: 20px;
  padding: 20px;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
}

.position-form-modal__section header h3 {
  margin: 0;
  font-size: 16px;
  color: #10213a;
}

.position-form-modal__section header p {
  margin: 6px 0 0;
  color: #6a7f98;
  font-size: 13px;
}

.position-form-modal__grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.position-form-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #26415e;
  font-size: 13px;
}

.position-form-modal__field--wide {
  grid-column: 1 / -1;
}

.position-form-modal__req {
  color: #ef4444;
  font-style: normal;
}

.position-form-modal__optional {
  font-size: 11px;
  color: #64748b;
  font-weight: 400;
}

.position-form-modal__input,
.position-form-modal__select,
.position-form-modal__textarea {
  border: 1px solid #d6dfeb;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 14px;
  color: #10213a;
  background: #fff;
}

.position-form-modal__textarea {
  resize: none;
}

.position-form-modal__chips {
  margin-top: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.position-form-modal__chip-label {
  font-size: 13px;
  color: #5b6f88;
}

.position-form-modal__chip-hint {
  font-size: 11px;
  color: #64748b;
  font-weight: 400;
}

.position-form-modal__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d6dfeb;
  border-radius: 999px;
  padding: 8px 14px;
  background: #fff;
  color: #26415e;
  cursor: pointer;
  font-size: 12px;
}

.position-form-modal__chip--active {
  border-color: #205493;
  background: #205493;
  color: #fff;
}

.position-form-modal__chip-checkbox {
  width: 14px;
  height: 14px;
}

.position-form-modal__auto-archive-hint {
  margin: 12px 0 0;
  text-align: center;
  font-size: 11px;
  color: #64748b;
}

.position-form-modal__status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 20px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.position-form-modal__status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.position-form-modal__status-info > .mdi {
  font-size: 20px;
  color: #92400e;
}

.position-form-modal__status-label {
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

.position-form-modal__status-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

.position-form-modal__status-tag--visible {
  background: #dcfce7;
  color: #166534;
}

.position-form-modal__status-tag--hidden {
  background: #f3f4f6;
  color: #6b7280;
}

.position-form-modal__status-tag--expired {
  background: #fee2e2;
  color: #991b1b;
}

.position-form-modal__status-note {
  font-size: 11px;
  color: #92400e;
  margin-top: 2px;
}

.position-form-modal__status-actions {
  display: flex;
  gap: 8px;
}

.position-form-modal__status-btn {
  border: 1px solid;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.position-form-modal__status-btn--hide {
  border-color: #f59e0b;
  color: #92400e;
}

.position-form-modal__status-btn--activate {
  border-color: #22c55e;
  color: #22c55e;
}

.position-form-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.position-form-modal__secondary,
.position-form-modal__primary {
  border: none;
  border-radius: 14px;
  min-height: 42px;
  padding: 0 18px;
  font-weight: 600;
  cursor: pointer;
}

.position-form-modal__secondary {
  background: #edf2f7;
  color: #203449;
}

.position-form-modal__primary {
  background: linear-gradient(135deg, #1d4e89 0%, #3875b7 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 768px) {
  .position-form-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
