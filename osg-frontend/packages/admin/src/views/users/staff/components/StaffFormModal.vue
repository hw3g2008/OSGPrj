<template>
  <OverlaySurfaceModal
    :open="visible"
    width="760px"
    surface-id="staff-form-modal"
    :body-class="'staff-form-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="staff-form-modal__title">
        <span class="mdi mdi-account-edit" aria-hidden="true"></span>
        <span>{{ isEditing ? '编辑导师' : '新增导师' }}</span>
      </span>
    </template>

    <div class="staff-form-modal__intro">
      <strong>{{ isEditing ? '更新导师资料' : '录入导师基础资料并开通账号' }}</strong>
      <span>信息提交后会立即回写导师列表，供运营继续排期与分配学员。</span>
    </div>

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
        <span>手机号</span>
        <input v-model="form.phone" type="tel" class="staff-form-modal__input" placeholder="请输入手机号" />
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
      <label class="staff-form-modal__field staff-form-modal__field--wide">
        <span>课时单价</span>
        <input v-model="form.hourlyRate" type="number" min="0" class="staff-form-modal__input" placeholder="请输入课时单价" />
      </label>
    </div>

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
  majorDirection: '',
  subDirection: '',
  region: '',
  city: '',
  hourlyRate: '' as string | number
})

const isEditing = computed(() => Boolean(props.staff?.staffId))

const resetForm = () => {
  form.staffName = props.staff?.staffName || ''
  form.email = props.staff?.email || ''
  form.phone = props.staff?.phone || ''
  form.staffType = props.staff?.staffType || ''
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
.staff-form-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.staff-form-modal__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.68), rgba(224, 231, 255, 0.52));
  color: #1f2937;
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

.staff-form-modal__field--wide {
  grid-column: 1 / -1;
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
