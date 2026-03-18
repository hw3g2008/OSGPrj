<template>
  <OverlaySurfaceModal
    :open="visible"
    width="960px"
    surface-id="staff-form-modal"
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
      <div class="staff-form-modal__grid">
        <label class="staff-form-modal__field">
          <span>姓名</span>
          <input v-model="form.staffName" type="text" class="staff-form-modal__input" placeholder="请输入英文名" />
        </label>
        <label class="staff-form-modal__field">
          <span>邮箱</span>
          <input v-model="form.email" type="email" class="staff-form-modal__input" placeholder="请输入邮箱" />
        </label>
        <label class="staff-form-modal__field">
          <span>类型</span>
          <select v-model="form.staffType" class="staff-form-modal__select">
            <option value="">请选择</option>
            <option value="mentor">导师</option>
            <option value="lead_mentor">班主任</option>
          </select>
        </label>
        <label class="staff-form-modal__field">
          <span>性别</span>
          <select v-model="form.gender" class="staff-form-modal__select">
            <option value="">请选择</option>
            <option value="0">男</option>
            <option value="1">女</option>
          </select>
        </label>
      </div>
    </section>

    <!-- Section 2: 联系方式 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--green">
        <i class="mdi mdi-phone" aria-hidden="true"></i> 联系方式
      </div>
      <div class="staff-form-modal__grid">
        <label class="staff-form-modal__field">
          <span>手机号</span>
          <input v-model="form.phone" type="tel" class="staff-form-modal__input" placeholder="请输入手机号" />
        </label>
        <label class="staff-form-modal__field">
          <span>地区</span>
          <select v-model="form.region" class="staff-form-modal__select">
            <option value="">请选择</option>
            <option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="staff-form-modal__field">
          <span>城市</span>
          <input v-model="form.city" type="text" class="staff-form-modal__input" placeholder="请输入城市" />
        </label>
      </div>
    </section>

    <!-- Section 3: 专业方向 -->
    <section class="staff-form-modal__section">
      <div class="staff-form-modal__badge staff-form-modal__badge--amber">
        <i class="mdi mdi-target" aria-hidden="true"></i> 专业方向
      </div>
      <div class="staff-form-modal__grid">
        <label class="staff-form-modal__field">
          <span>主攻方向</span>
          <select v-model="form.majorDirection" class="staff-form-modal__select">
            <option value="">请选择</option>
            <option v-for="option in majorDirectionOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="staff-form-modal__field">
          <span>子方向</span>
          <input v-model="form.subDirection" type="text" class="staff-form-modal__input" placeholder="请输入子方向" />
        </label>
        <label class="staff-form-modal__field">
          <span>课时单价</span>
          <input v-model="form.hourlyRate" type="number" min="0" class="staff-form-modal__input" placeholder="请输入课时单价" />
        </label>
      </div>
    </section>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">取消</button>
      <button
        type="button"
        class="permission-button permission-button--primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '提交中...' : '确认' }}
      </button>
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

const majorDirectionOptions = ['金融', '咨询', '科技', '量化']
const regionOptions = ['北美', '欧洲', '亚太', '中国大陆']

const form = reactive({
  staffName: '',
  email: '',
  phone: '',
  staffType: '',
  gender: '',
  majorDirection: '',
  subDirection: '',
  region: '',
  city: '',
  hourlyRate: '' as string | number
})

const isEditing = computed(() => Boolean(props.staff?.staffId))

const avatarText = computed(() => {
  const name = props.staff?.staffName?.trim()
  if (!name) return 'ST'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
})

const resetForm = () => {
  form.staffName = props.staff?.staffName || ''
  form.email = props.staff?.email || ''
  form.phone = props.staff?.phone || ''
  form.staffType = props.staff?.staffType || ''
  form.gender = (props.staff as Record<string, unknown>)?.gender as string || ''
  form.majorDirection = props.staff?.majorDirection || ''
  form.subDirection = props.staff?.subDirection || ''
  form.region = props.staff?.region || ''
  form.city = props.staff?.city || ''
  form.hourlyRate = props.staff?.hourlyRate == null ? '' : String(props.staff.hourlyRate)
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
    majorDirection: form.majorDirection,
    subDirection: form.subDirection.trim() || undefined,
    region: form.region,
    city: form.city.trim(),
    hourlyRate: Number(hourlyRateText)
  })
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="staff-form-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="staff-form-modal"] .overlay-surface-modal__close) {
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

.staff-form-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.staff-form-modal__input,
.staff-form-modal__select {
  min-height: 42px;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  padding: 0 14px;
  background: #ffffff;
  color: #0f172a;
}

@media (max-width: 768px) {
  .staff-form-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
