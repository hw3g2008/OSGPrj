<template>
  <OverlaySurfaceModal
    :open="visible"
    width="960px"
    :surface-id="surfaceId"
    :body-class="'staff-form-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="staff-form-modal__header">
        <div v-if="isEditing" class="staff-form-modal__avatar">{{ avatarText }}</div>
        <span class="staff-form-modal__title-text">
          <span v-if="!isEditing" class="mdi mdi-account-plus" aria-hidden="true" style="margin-right:8px"></span>
          {{ isEditing ? `编辑导师 - ${staff?.staffName || ''}` : '新增导师' }}
        </span>
      </div>
    </template>

    <div class="staff-form-modal__grid">
    <!-- Section 1: 核心信息 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--primary">核心信息</div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="姓名">
              <a-input
                ref="staffNameInputRef"
                v-model:value="form.staffName"
                placeholder="请输入英文名"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱">
              <a-input v-model:value="form.email" placeholder="请输入邮箱" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="类型">
              <a-select v-model:value="form.staffType" placeholder="请选择">
                <a-select-option value="mentor">导师</a-select-option>
                <a-select-option value="lead_mentor">班主任</a-select-option>
                <a-select-option value="assistant">助教</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="性别">
              <a-select v-model:value="form.gender" placeholder="请选择">
                <a-select-option value="0">男</a-select-option>
                <a-select-option value="1">女</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 2: 联系方式 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--green">
        <span class="mdi mdi-phone" aria-hidden="true" /> 联系方式
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="手机号">
              <div class="phone-input-group">
                <a-select
                  v-model:value="form.phoneCountryCode"
                  :options="phoneCountryOptions"
                  class="phone-input-group__code"
                  :show-search="true"
                  :filter-option="filterPhoneCountryOption"
                />
                <a-input
                  v-model:value="form.phone"
                  class="phone-input-group__number"
                  placeholder="请输入手机号"
                />
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信">
              <a-input v-model:value="form.wechatId" placeholder="请输入微信号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区">
              <a-select
                v-model:value="form.region"
                :options="regionItems"
                :field-names="{ label: 'label', value: 'value' }"
                placeholder="请选择"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="城市">
              <a-select
                v-model:value="form.city"
                :options="filteredCityOptions"
                :field-names="{ label: 'label', value: 'value' }"
                :placeholder="form.region ? '请选择' : '请先选择地区'"
                :disabled="!form.region"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 3: 专业方向 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--amber">
        <span class="mdi mdi-target" aria-hidden="true" /> 专业方向
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="主攻方向">
              <MultiSelect
                v-model:value="form.majorDirections"
                :options="majorItems"
                placeholder="请选择，可多选"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="子方向">
              <MultiSelect
                v-model:value="form.subDirections"
                :options="filteredSubOptions"
                :placeholder="form.majorDirections.length ? '请选择，可多选' : '请先选择主攻方向'"
                :disabled="!form.majorDirections.length"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="可授课程类型">
              <MultiSelect
                v-model:value="form.courseTypes"
                :options="courseItems"
                placeholder="请选择，可多选"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="擅长">
              <MultiSelect
                v-model:value="form.specialties"
                :options="specialtyItems"
                placeholder="请选择，可多选"
                :max-tag-count="0"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="课时单价">
              <a-input-number v-model:value="form.hourlyRate" :min="0" placeholder="请输入课时单价" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <!-- Section 4: 职业背景 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--purple">
        <span class="mdi mdi-briefcase" aria-hidden="true" /> 职业背景
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="行业">
              <MultiSelect
                v-model:value="form.selectedIndustries"
                :options="industryItems"
                placeholder="请选择行业"
                :max-tag-count="0"
                @change="onIndustryChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="任职公司">
              <MultiSelect
                v-model:value="form.companies"
                :options="filteredCompanyOptions"
                :placeholder="form.selectedIndustries.length ? '请选择公司' : '请先选择行业'"
                :disabled="!form.selectedIndustries.length"
                :max-tag-count="0"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="staff-form-modal__section" v-if="isSuperAdmin">
      <div class="staff-form-modal__badge staff-form-modal__badge--orange">
        <span class="mdi mdi-star" aria-hidden="true" /> 内部评估
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="评级">
              <a-select
                v-model:value="form.rating"
                :options="ratingItems"
                :field-names="{ label: 'label', value: 'value' }"
                placeholder="请选择评级"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>

    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--blue">
        <span class="mdi mdi-shield-account" aria-hidden="true" /> 账号信息
      </div>
      <a-form layout="vertical">
        <a-row :gutter="[20, 0]">
          <a-col :span="12">
            <a-form-item label="登录账号">
              <a-input v-model:value="form.loginAccount" placeholder="请输入登录账号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="初始密码">
              <a-input v-model:value="form.initialPassword" placeholder="请输入初始密码" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </section>
    </div>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditing ? '保存修改' : '确定添加' }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { MultiSelect } from '@osg/shared/components'
import type { StaffListItem, StaffPayload } from '@osg/shared/api/admin/staff'
import {
  splitPhone,
  joinPhone,
} from '@osg/shared/utils'
import { useDictFacade, useIndustryMeta, type DictFacadeOption } from '@osg/shared/composables'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.permissions.includes('*:*:*'))

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: courseItems, load: loadCourse } = useDictFacade('osg_course_type')
const { items: countryCodeItems, load: loadCountryCode } = useDictFacade('osg_country_code')
const { items: specialtyItems, load: loadSpecialty } = useDictFacade('osg_specialty')
const { items: ratingItems, load: loadRating } = useDictFacade('osg_rating')
const { items: industryItems, load: loadIndustry } = useIndustryMeta()

const loadAllDicts = () => {
  void loadRegion()
  void loadCity()
  void loadMajor()
  void loadSub()
  void loadCourse()
  void loadCountryCode()
  void loadSpecialty()
  void loadRating()
  void loadIndustry()
}

/** 把后端逗号分隔的字典 value 串解析为数组（兼容历史中文 label：原样保留） */
const splitCsv = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (typeof val === 'string' && val.trim()) return val.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

const props = defineProps<{
  visible: boolean
  staff?: StaffListItem | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: StaffPayload]
}>()

const DEFAULT_INITIAL_PASSWORD = 'Osg@2026'

/** 国际电话区号下拉选项（从字典加载，支持客户编辑） */
const phoneCountryOptions = computed(() => {
  // dict_value 已包含 + 前缀（如 "+86"），直接拼接 label
  const items = countryCodeItems.value.map((item) => ({
    value: item.value,
    label: `${item.value} ${item.label}`,
  }))
  // 第一项为占位提示
  return [{ value: '', label: '请选择区号' }, ...items]
})

const filterPhoneCountryOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true
  return option.label.toLowerCase().includes(keyword) || option.value.toLowerCase().includes(keyword)
}

const staffNameInputRef = ref<{ focus?: () => void } | null>(null)

const form = reactive({
  staffName: '',
  email: '',
  phone: '',
  phoneCountryCode: '', // 默认"请选择区号"
  staffType: undefined as string | undefined,
  gender: undefined as string | undefined,
  wechatId: '',
  majorDirections: [] as string[],
  subDirections: [] as string[],
  region: undefined as string | undefined,
  city: undefined as string | undefined,
  courseTypes: [] as string[],
  specialties: [] as string[],
  selectedIndustries: [] as string[],
  companies: [] as string[],
  rating: undefined as string | undefined,
  loginAccount: '',
  initialPassword: '',
  hourlyRate: '' as string | number
})

const isEditing = computed(() => Boolean(props.staff?.staffId))
const surfaceId = computed(() => (isEditing.value ? 'modal-edit-staff' : 'modal-add-staff'))

/** 城市按选中的 region 过滤；未选 region 时为空 */
const filteredCityOptions = computed(() => {
  if (!form.region) return []
  return cityItems.value.filter((c) => c.parentValue === form.region)
})

/** 子方向按已选主攻方向（多个）联合过滤 */
const filteredSubOptions = computed(() => {
  if (!form.majorDirections.length) return []
  return subItems.value.filter((s) => s.parentValue && form.majorDirections.includes(s.parentValue))
})

/** 行业 → 公司联动：当前选中行业对应的公司列表 */
const filteredCompanyOptions = computed(() => {
  if (!form.selectedIndustries.length) return []
  return industryItems.value.filter((c) => c.parentValue && form.selectedIndustries.includes(c.parentValue))
})

/** 行业变化 → 清空公司选项（保留已选但不在新行业内的公司会被过滤） */
const onIndustryChange = () => {
  form.companies = form.companies.filter((v) =>
    industryItems.value.some((c) => c.value === v && form.selectedIndustries.includes(c.parentValue ?? ''))
  )
}

const avatarText = computed(() => {
  const name = props.staff?.staffName?.trim()
  if (!name) return 'ST'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
})

const syncAccountDefaults = () => {
  if (isEditing.value) {
    return
  }
  form.loginAccount = form.email.trim()
  form.initialPassword = DEFAULT_INITIAL_PASSWORD
}

const resetForm = () => {
  form.staffName = props.staff?.staffName || ''
  form.email = props.staff?.email || ''
  const parsedPhone = splitPhone(props.staff?.phone)
  // 编辑时：复用已有区号；新建时：显示"请选择区号"
  form.phoneCountryCode = isEditing.value ? parsedPhone.countryCode : ''
  form.phone = parsedPhone.number
  form.staffType = props.staff?.staffType || undefined
  form.gender = props.staff?.gender || undefined
  form.wechatId = props.staff?.wechatId || ''
  form.majorDirections = splitCsv(props.staff?.majorDirection)
  form.subDirections = splitCsv(props.staff?.subDirection)
  form.region = props.staff?.region || undefined
  form.city = props.staff?.city || undefined
  form.courseTypes = splitCsv(props.staff?.courseTypes)
  form.specialties = splitCsv(props.staff?.specialty)
  // companies: 从 CSV 解析后，尝试推断行业
  form.companies = splitCsv(props.staff?.companies)
  form.selectedIndustries = inferIndustriesFromCompanies(form.companies)
  form.rating = props.staff?.rating || undefined
  form.loginAccount = ''
  form.initialPassword = ''
  form.hourlyRate = props.staff?.hourlyRate == null ? '' : String(props.staff.hourlyRate)
  syncAccountDefaults()
}

/** 根据已选公司反查行业列表（用于编辑回显） */
const inferIndustriesFromCompanies = (companyValues: string[]): string[] => {
  const industries = new Set<string>()
  for (const v of companyValues) {
    const company = industryItems.value.find((c) => c.value === v)
    if (company?.parentValue) {
      industries.add(company.parentValue)
    }
  }
  return Array.from(industries)
}

watch(
  () => [props.visible, props.staff] as const,
  ([visible]) => {
    if (visible) {
      resetForm()
      loadAllDicts()
      nextTick(() => {
        staffNameInputRef.value?.focus?.()
      })
    }
  },
  { immediate: true }
)

/** 主攻方向变化 → 过滤掉不再合法的子方向。
 *  仅清理「字典内已知子方向」中 parent 不匹配的；字典查不到的视为历史数据原样保留，
 *  避免编辑旧导师时把历史的英文缩写（'IB'/'PE' 等）误删。 */
watch(
  () => form.majorDirections,
  (newDirs) => {
    const validParents = new Set(newDirs)
    form.subDirections = form.subDirections.filter((sub) => {
      const item = subItems.value.find((i) => i.value === sub)
      if (!item) return true
      return item.parentValue ? validParents.has(item.parentValue) : true
    })
  }
)

/** 地区变化 → 清空城市（避免脏值）。
 *  `!prev` 时跳过：resetForm 把 region 从 undefined 设到具体值时不应清掉同时被 reset 的 city。 */
watch(
  () => form.region,
  (next, prev) => {
    if (!next || !prev || next === prev) return
    form.city = undefined
  }
)

watch(
  () => form.email,
  () => {
    syncAccountDefaults()
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  const hourlyRateText = String(form.hourlyRate ?? '').trim()
  if (!form.staffName.trim()) {
    message.error('请填写导师姓名')
    return
  }
  if (!form.email.trim()) {
    message.error('请填写邮箱')
    return
  }
  if (!form.staffType) {
    message.error('请选择导师类型')
    return
  }
  if (!form.majorDirections.length) {
    message.error('请选择主攻方向')
    return
  }
  if (!form.region) {
    message.error('请选择地区')
    return
  }
  if (!form.city) {
    message.error('请选择城市')
    return
  }
  if (!hourlyRateText) {
    message.error('请填写课时单价')
    return
  }
  // 前端校验：擅长最多 20 项
  if (form.specialties.length > 20) {
    message.error('擅长最多选择 20 项')
    return
  }
  // 前端校验：任职公司最多 10 家
  if (form.companies.length > 10) {
    message.error('任职公司最多选择 10 家')
    return
  }

  emit('submit', {
    staffId: props.staff?.staffId,
    staffName: form.staffName.trim(),
    email: form.email.trim(),
    phone: joinPhone(form.phoneCountryCode, form.phone),
    gender: form.gender || undefined,
    staffType: form.staffType as string,
    wechatId: form.wechatId.trim() || undefined,
    majorDirection: form.majorDirections.join(','),
    subDirection: form.subDirections.length ? form.subDirections.join(',') : undefined,
    region: form.region as string,
    city: form.city as string,
    courseTypes: form.courseTypes.length ? form.courseTypes.join(',') : undefined,
    specialty: form.specialties.length ? form.specialties.join(',') : undefined,
    companies: form.companies.length ? form.companies.join(',') : undefined,
    rating: form.rating,
    loginAccount: form.loginAccount.trim() || undefined,
    initialPassword: form.initialPassword.trim() || undefined,
    hourlyRate: Number(hourlyRateText)
  })
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="modal-add-staff"] [data-surface-part="header"]),
:global([data-surface-id="modal-edit-staff"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="modal-add-staff"] .overlay-surface-modal__close),
:global([data-surface-id="modal-edit-staff"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.staff-form-modal__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.staff-form-modal__avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.staff-form-modal__title-text {
  display: inline-flex;
  align-items: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

/* OverlaySurfaceModal 的 body 是子组件渲染的，本组件 scoped class 选不到它，
   只能依赖 OverlaySurfaceModal 自身 padding。section 间距交给本组件渲染的 grid wrapper 控制。 */

/* ── Section cards ── */
.staff-form-modal__grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.staff-form-modal__section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 22px 24px 4px;
}

/* ── Section badges ── */
.staff-form-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 18px;
}

.staff-form-modal__badge--primary {
  background: var(--primary, #6366F1);
  color: #fff;
}

.staff-form-modal__badge--green {
  background: #DCFCE7;
  color: #166534;
}

.staff-form-modal__badge--amber {
  background: #FEF3C7;
  color: #92400E;
}

.staff-form-modal__badge--blue {
  background: #DBEAFE;
  color: #1E40AF;
}

.staff-form-modal__badge--purple {
  background: #F3E8FF;
  color: #6B21A8;
}

.staff-form-modal__badge--orange {
  background: #FFEDD5;
  color: #9A3412;
}

/* ── 控件纵向节奏 ──
   父组件 OverlaySurfaceModal 里有 `.ant-form-item:last-child { margin-bottom: 0 }`
   而本表单中每个 form-item 在 a-col 里都是唯一子元素，会命中 :last-child；
   `.ant-form-item-label { padding-bottom: 0 }` 同理。需要 !important 才能覆盖。 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-form-item),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-form-item) {
  margin-bottom: 20px !important;
}

:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-form-item-label),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-form-item-label) {
  padding-bottom: 8px !important;
}

/* ── 控件高度统一 44px（含 select 单选/多选、input、input-number、affix-wrapper）──
   父组件 OverlaySurfaceModal 用 :deep 把 selector / picker / input-number 设为 min-height: 48 + padding: 10 14，
   选择器权重 (0,4,1) 比这里 (0,3,1) 高，必须 !important 才能压过去。 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-affix-wrapper),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-affix-wrapper),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-number),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-number),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select .ant-select-selector),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select .ant-select-selector) {
  height: 44px !important;
  min-height: 44px !important;
  box-sizing: border-box;
}

/* 控件横向 padding（input/selector 内文字距左边 14px） */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-affix-wrapper),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-affix-wrapper),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-number),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-number),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select .ant-select-selector),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select .ant-select-selector) {
  padding: 0 14px !important;
}

/* a-select 外层容器去掉自身 padding，避免与 selector 双重叠加 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select) {
  padding: 0 !important;
}

/* select selector / affix-wrapper 用 flex 居中文字（含单选/多选） */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select .ant-select-selector),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select .ant-select-selector),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-affix-wrapper),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-affix-wrapper) {
  display: flex;
  align-items: center;
}

/* 普通 input：靠 line-height 让光标垂直居中 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input) {
  line-height: 40px !important;
}

/* 单选 select 的 selection-item / placeholder / search-input */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-item),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-item),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-placeholder),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-placeholder),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-search-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-single .ant-select-selector .ant-select-selection-search-input) {
  line-height: 40px !important;
  height: 40px !important;
}

/* 多选 select：解除 44px 死锁，按 tag 数量自动换行撑高（min-height 仍保 44 与单选齐高） */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-multiple),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-multiple),
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector) {
  height: auto !important;
  min-height: 44px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

/* 多选 select：placeholder / search input / overflow（标签容器）撑满 selector 高度 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector .ant-select-selection-placeholder),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector .ant-select-selection-placeholder) {
  line-height: 40px !important;
  inset-inline-start: 14px !important;
}

:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector .ant-select-selection-overflow),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selector .ant-select-selection-overflow) {
  line-height: 40px !important;
  align-items: center !important;
}

/* 多选 selection-item（已选标签）vertical 居中、紧凑 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selection-item),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-select-multiple .ant-select-selection-item) {
  height: 28px !important;
  line-height: 26px !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* input-number 内部 input 撑满父容器，光标垂直居中（不改 wrapper 的 inline 显示，保留 handler 区域） */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-number .ant-input-number-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-number .ant-input-number-input) {
  height: 40px !important;
  line-height: 40px !important;
  padding: 0 !important;
}

/* affix-wrapper 内嵌 input 去掉自身 padding 与 line-height 二次叠加 */
:global([data-surface-id="modal-add-staff"] .staff-form-modal__section .ant-input-affix-wrapper > input.ant-input),
:global([data-surface-id="modal-edit-staff"] .staff-form-modal__section .ant-input-affix-wrapper > input.ant-input) {
  height: auto !important;
  line-height: 40px !important;
}

/* ── 手机号：区号 + 号码 分离布局 ── */
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
