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

    <!-- Section 1: 核心信息 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--primary">核心信息</div>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名">
              <a-input v-model:value="form.staffName" placeholder="请输入英文名" />
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="手机号">
              <a-input v-model:value="form.phone" placeholder="请输入手机号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信">
              <a-input v-model:value="form.wechatId" placeholder="请输入微信号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区">
              <a-select v-model:value="form.region" placeholder="请选择">
                <a-select-option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="城市">
              <a-input v-model:value="form.city" placeholder="请输入城市" />
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="主攻方向">
              <a-select v-model:value="form.majorDirection" placeholder="请选择">
                <a-select-option v-for="option in majorDirectionOptions" :key="option" :value="option">{{ option }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="子方向">
              <a-select v-model:value="form.subDirection" :placeholder="subDirectionOptions.length ? '请选择' : '请先选择主攻方向'">
                <a-select-option v-for="option in subDirectionOptions" :key="option" :value="option">{{ option }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="可授课程类型">
              <a-input v-model:value="form.courseTypes" placeholder="请输入可授课程类型" />
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

    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--blue">
        <span class="mdi mdi-shield-account" aria-hidden="true" /> 账号信息
      </div>
      <a-form layout="vertical">
        <a-row :gutter="16">
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

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditing ? '保存修改' : '确定添加' }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { StaffListItem, StaffPayload } from '@osg/shared/api/admin/staff'

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
const majorDirectionOptions = ['金融', '咨询', '科技', '量化']
const subDirectionMap: Record<string, string[]> = {
  金融: ['IB', 'PE', 'VC', 'S&T', 'AM', 'ER', 'IB 投行'],
  咨询: ['Strategy', 'Operations', 'Transformation'],
  科技: ['Product', 'Data', 'Software', 'AI', 'AI Product'],
  量化: ['Quant Research', 'Quant Trading', 'Quant Dev'],
}
const regionOptions = ['北美', '欧洲', '亚太', '中国大陆']

const form = reactive({
  staffName: '',
  email: '',
  phone: '',
  staffType: '',
  gender: '',
  wechatId: '',
  majorDirection: '',
  subDirection: '',
  region: '',
  city: '',
  courseTypes: '',
  loginAccount: '',
  initialPassword: '',
  hourlyRate: '' as string | number
})

const isEditing = computed(() => Boolean(props.staff?.staffId))
const surfaceId = computed(() => (isEditing.value ? 'modal-edit-staff' : 'modal-add-staff'))
const subDirectionOptions = computed(() => {
  const options = subDirectionMap[form.majorDirection] ?? []
  if (form.subDirection && !options.includes(form.subDirection)) {
    return [...options, form.subDirection]
  }
  return options
})

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
  form.phone = props.staff?.phone || ''
  form.staffType = props.staff?.staffType || ''
  form.gender = (props.staff as Record<string, unknown>)?.gender as string || ''
  form.wechatId = (props.staff as Record<string, unknown>)?.wechatId as string || ''
  form.majorDirection = props.staff?.majorDirection || ''
  form.subDirection = props.staff?.subDirection || ''
  form.region = props.staff?.region || ''
  form.city = props.staff?.city || ''
  form.courseTypes = Array.isArray((props.staff as Record<string, unknown>)?.courseTypes)
    ? ((props.staff as Record<string, unknown>)?.courseTypes as string[]).join(', ')
    : ((props.staff as Record<string, unknown>)?.courseTypes as string) || ''
  form.loginAccount = (props.staff as Record<string, unknown>)?.loginAccount as string || ''
  form.initialPassword = (props.staff as Record<string, unknown>)?.initialPassword as string || ''
  form.hourlyRate = props.staff?.hourlyRate == null ? '' : String(props.staff.hourlyRate)
  syncAccountDefaults()
}

watch(
  () => [props.visible, props.staff] as const,
  ([visible]) => {
    if (visible) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => form.majorDirection,
  (next, prev) => {
    if (!next || !prev || next === prev) {
      return
    }
    if (subDirectionMap[next]?.includes(form.subDirection)) {
      return
    }
    form.subDirection = ''
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
  if (!form.majorDirection) {
    message.error('请选择主攻方向')
    return
  }
  if (!form.region) {
    message.error('请选择地区')
    return
  }
  if (!form.city.trim()) {
    message.error('请填写城市')
    return
  }
  if (!hourlyRateText) {
    message.error('请填写课时单价')
    return
  }

  emit('submit', {
    staffId: props.staff?.staffId,
    staffName: form.staffName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    staffType: form.staffType,
    wechatId: form.wechatId.trim() || undefined,
    majorDirection: form.majorDirection,
    subDirection: form.subDirection.trim() || undefined,
    region: form.region,
    city: form.city.trim(),
    courseTypes: form.courseTypes.trim() || undefined,
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

.staff-form-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: #f8fafc;
}

/* ── Section cards ── */
.staff-form-modal__section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
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
  margin-bottom: 16px;
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

.staff-form-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

</style>
