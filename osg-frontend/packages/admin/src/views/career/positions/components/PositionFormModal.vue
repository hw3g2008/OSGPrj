<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="680px"
    :max-height="'86vh'"
    :shell-class="'position-form-modal__shell'"
    :body-class="'position-form-modal__body'"
    :footer-class="'position-form-modal__footer-shell'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="position-form-modal__title">
        <span class="position-form-modal__title-mark">
          <span :class="['mdi', isEditing ? 'mdi-briefcase-edit' : 'mdi-briefcase-plus']" aria-hidden="true"></span>
        </span>
        <span>{{ isEditing ? '编辑岗位' : '新增岗位' }}</span>
      </div>
    </template>

    <div class="position-form-modal__content">
      <section class="position-form-modal__section">
        <h4><i class="mdi mdi-briefcase" aria-hidden="true"></i>基本信息</h4>
        <div class="position-form-modal__grid">
          <fieldset class="position-form-modal__field" data-field-name="岗位分类">
            <span>岗位分类 <em>*</em></span>
            <select v-model="form.positionCategory" class="position-form-modal__control">
              <option value="">请选择</option>
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="岗位名称">
            <span>岗位名称 <em>*</em></span>
            <input v-model="form.positionName" type="text" class="position-form-modal__control" placeholder="如 Summer Analyst" />
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="部门">
            <span>部门</span>
            <input v-model="form.department" type="text" class="position-form-modal__control" placeholder="如 Investment Banking Division" />
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="项目时间">
            <span>项目时间 <em>*</em></span>
            <select v-model="form.projectYear" class="position-form-modal__control">
              <option value="">请选择</option>
              <option v-for="option in projectYearOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </fieldset>
        </div>

        <fieldset class="position-form-modal__cycle-wrap" data-field-name="招聘周期">
          <span>招聘周期 <em>*</em> <small>(可多选)</small></span>
          <div class="position-form-modal__cycle-list">
            <label
              v-for="option in recruitmentCycleOptions"
              :key="option.value"
              :data-cycle-value="option.value"
              class="position-form-modal__cycle-option"
              :class="{ 'position-form-modal__cycle-option--active': form.recruitmentCycles.includes(option.value) }"
            >
              <input
                :checked="form.recruitmentCycles.includes(option.value)"
                type="checkbox"
                class="position-form-modal__cycle-checkbox"
                @change="toggleCycle(option.value)"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
      </section>

      <section class="position-form-modal__section">
        <h4><i class="mdi mdi-domain" aria-hidden="true"></i>公司信息</h4>
        <div class="position-form-modal__grid">
          <fieldset class="position-form-modal__field" data-field-name="公司名称">
            <span>公司名称 <em>*</em></span>
            <input
              v-model="form.companyName"
              list="position-company-options"
              type="text"
              class="position-form-modal__control"
              placeholder="搜索或输入公司名称"
            />
            <datalist id="position-company-options">
              <option v-for="option in companyOptions" :key="option" :value="option" />
            </datalist>
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="公司类别">
            <span>公司类别</span>
            <select v-model="form.companyType" class="position-form-modal__control">
              <option value="">请选择</option>
              <option v-for="option in companyTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </fieldset>

          <fieldset class="position-form-modal__location-group" data-field-name="大区/城市">
            <div class="position-form-modal__location-grid">
              <fieldset class="position-form-modal__field" data-field-name="大区">
                <span>大区 <em>*</em></span>
                <select v-model="form.region" class="position-form-modal__control">
                  <option value="">请选择</option>
                  <option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </fieldset>

              <fieldset class="position-form-modal__field" data-field-name="城市">
                <span>城市 <em>*</em></span>
                <select v-model="form.city" class="position-form-modal__control">
                  <option value="">{{ form.region ? '请选择' : '请先选择地区' }}</option>
                  <option v-for="option in currentCityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </fieldset>
            </div>
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="公司官网">
            <span>公司官网</span>
            <input v-model="form.companyWebsite" type="url" class="position-form-modal__control" placeholder="https://company.com" />
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="岗位链接">
            <span>岗位链接</span>
            <input v-model="form.positionUrl" type="url" class="position-form-modal__control" placeholder="https://company.com/jobs/..." />
          </fieldset>

          <fieldset class="position-form-modal__field" data-field-name="截止日期">
            <span>截止日期 <small>(选填)</small></span>
            <input
              v-model="form.deadline"
              type="date"
              class="position-form-modal__control"
              data-field-name="截止日期"
              aria-label="截止日期"
            />
          </fieldset>
        </div>
      </section>

      <div class="position-form-modal__display-grid">
        <section class="position-form-modal__section" data-field-name="展示时间">
          <h4><i class="mdi mdi-clock-outline" aria-hidden="true"></i>展示时间</h4>
          <fieldset class="position-form-modal__display-group" data-field-name="开始时间/结束时间">
            <div class="position-form-modal__display-stack">
              <fieldset class="position-form-modal__field" data-field-name="开始时间">
                <span>开始时间 <em>*</em></span>
                <input
                  v-model="form.displayStartTime"
                  type="datetime-local"
                  class="position-form-modal__control"
                  data-field-name="开始时间"
                  aria-label="开始时间"
                />
              </fieldset>
              <fieldset class="position-form-modal__field" data-field-name="结束时间">
                <span>结束时间 <em>*</em></span>
                <input
                  v-model="form.displayEndTime"
                  type="datetime-local"
                  class="position-form-modal__control"
                  data-field-name="结束时间"
                  aria-label="结束时间"
                />
              </fieldset>
            </div>
          </fieldset>
        </section>

        <section class="position-form-modal__section" data-field-name="投递备注">
          <h4><i class="mdi mdi-note-text" aria-hidden="true"></i>投递备注</h4>
        <fieldset class="position-form-modal__field">
          <span class="position-form-modal__sr-only">投递备注</span>
          <textarea
            v-model="form.applicationNote"
            rows="4"
            class="position-form-modal__control position-form-modal__control--textarea"
            placeholder="提醒学生投递时的注意事项..."
          />
        </fieldset>
        </section>
      </div>

      <p class="position-form-modal__hint">
        <i class="mdi mdi-information-outline" aria-hidden="true"></i>
        到达结束时间后自动归档
      </p>

      <section v-if="isEditing" class="position-form-modal__status-bar">
        <div class="position-form-modal__status-copy">
          <i class="mdi mdi-toggle-switch" aria-hidden="true"></i>
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

        <fieldset class="position-form-modal__field position-form-modal__status-field">
          <span>岗位状态</span>
          <select v-model="form.displayStatus" class="position-form-modal__control">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </fieldset>

        <div class="position-form-modal__status-actions">
          <button type="button" class="position-form-modal__status-action" @click="form.displayStatus = 'hidden'">
            <i class="mdi mdi-eye-off" aria-hidden="true"></i> 隐藏
          </button>
          <button type="button" class="position-form-modal__status-action position-form-modal__status-action--success" @click="form.displayStatus = 'visible'">
            <i class="mdi mdi-refresh" aria-hidden="true"></i> 激活
          </button>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="position-form-modal__footer">
        <button type="button" class="position-form-modal__secondary" data-surface-part="cancel-control" @click="handleClose">取消</button>
        <button type="button" class="position-form-modal__primary" @click="handleSubmit">
          <i class="mdi mdi-check" aria-hidden="true"></i>
          {{ isEditing ? '保存岗位' : '新增岗位' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { PositionListItem, PositionMeta, PositionMetaOption, PositionPayload } from '@osg/shared/api/admin/position'

const props = defineProps<{
  visible: boolean
  position?: PositionListItem | null
  defaults?: Partial<PositionPayload> | null
  meta: PositionMeta
  companyOptions: string[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: PositionPayload]
}>()

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
  deadline: '',
  positionUrl: '',
  applicationNote: '',
  recruitmentCycles: [] as string[]
})

const isEditing = computed(() => Boolean(props.position?.positionId))
const isCompanyScopedCreate = computed(() => !isEditing.value && Boolean(props.defaults?.companyName))
const surfaceId = computed(() => {
  if (isEditing.value) return 'modal-edit-position'
  if (isCompanyScopedCreate.value) return 'modal-new-position-company'
  return 'modal-new-position'
})
const categoryOptions = computed(() => props.meta.categories || [])
const companyTypeOptions = computed(() => props.meta.companyTypes || [])
const recruitmentCycleOptions = computed(() => props.meta.recruitmentCycles || [])
const projectYearOptions = computed(() => props.meta.projectYears || [])
const regionOptions = computed(() => props.meta.regions || [])
const statusOptions = computed(() => props.meta.displayStatuses || [])
const currentCityOptions = computed<PositionMetaOption[]>(() => props.meta.citiesByRegion?.[form.region] || [])
const displayStatusMap = computed(() => new Map(statusOptions.value.map((option) => [option.value, option.label])))

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

const normalizeCycles = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const resetForm = () => {
  const seed = props.position || props.defaults || {}
  const now = new Date()
  const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  form.positionCategory = seed.positionCategory || ''
  form.positionName = seed.positionName || ''
  form.department = seed.department || ''
  form.companyName = seed.companyName || ''
  form.companyType = seed.companyType || seed.industry || ''
  form.companyWebsite = seed.companyWebsite || ''
  form.region = seed.region || ''
  form.city = seed.city || ''
  form.projectYear = seed.projectYear || ''
  form.displayStatus = seed.displayStatus || 'visible'
  form.displayStartTime = toDateTimeLocal(seed.displayStartTime) || now.toISOString().slice(0, 16)
  form.displayEndTime = toDateTimeLocal(seed.displayEndTime) || end.toISOString().slice(0, 16)
  form.deadline = toDateValue(seed.deadline)
  form.positionUrl = seed.positionUrl || ''
  form.applicationNote = seed.applicationNote || ''
  form.recruitmentCycles = normalizeCycles(seed.recruitmentCycle)
}

const toggleCycle = (value: string) => {
  if (form.recruitmentCycles.includes(value)) {
    form.recruitmentCycles = form.recruitmentCycles.filter((item) => item !== value)
    return
  }
  form.recruitmentCycles = [...form.recruitmentCycles, value]
}

const formatDisplayStatus = (value: string) => {
  return displayStatusMap.value.get(value) || '展示中'
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!form.positionCategory || !form.positionName || !form.companyName || !form.region || !form.city || !form.projectYear) {
    message.error('请补全岗位分类、岗位名称、公司、地区和项目时间')
    return
  }
  if (!form.recruitmentCycles.length) {
    message.error('请至少选择一个招聘周期')
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
    companyType: form.companyType || undefined,
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
    deadline: form.deadline || undefined,
    positionUrl: form.positionUrl || undefined,
    applicationNote: form.applicationNote || undefined
  })
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => form.region,
  () => {
    if (form.city && !currentCityOptions.value.some((option) => option.value === form.city)) {
      form.city = ''
    }
  }
)
</script>

<style scoped lang="scss">
:deep(.position-form-modal__shell) {
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

:deep(.position-form-modal__shell .overlay-surface-modal__header) {
  gap: 14px;
  padding: 22px 30px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}

:deep(.position-form-modal__shell .overlay-surface-modal__title) {
  width: 100%;
}

:deep(.position-form-modal__shell .overlay-surface-modal__close) {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #f5f7fb;
  color: #64748b;
}

:deep(.position-form-modal__shell .overlay-surface-modal__close:hover) {
  background: #edf2ff;
  color: #5b6ef5;
}

:deep(.overlay-surface-modal__body.position-form-modal__body) {
  padding: 20px 20px 0;
  background: #fff;
}

:deep(.overlay-surface-modal__footer.position-form-modal__footer-shell) {
  padding: 0 20px 20px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.position-form-modal__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #20304a;
}

.position-form-modal__title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(180deg, #eef2ff 0%, #f7f8ff 100%);
  color: #27344d;
  flex-shrink: 0;
}

.position-form-modal__title-mark > .mdi {
  font-size: 18px;
}

.position-form-modal__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.position-form-modal__section {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #fbfcff 100%);
}

.position-form-modal__section h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  color: #5b6ef5;
}

.position-form-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.position-form-modal__location-group {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.position-form-modal__location-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.position-form-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
  font-size: 13px;
  color: #334155;
}

.position-form-modal__field > span {
  color: #475569;
  font-weight: 600;
}

.position-form-modal__field em {
  color: #ef4444;
  font-style: normal;
}

.position-form-modal__field small {
  color: #94a3b8;
  font-weight: 400;
}

.position-form-modal__control {
  width: 100%;
  border: 1px solid #d7deea;
  border-radius: 12px;
  min-height: 44px;
  padding: 10px 14px;
  background: #fff;
  color: #20304a;
  font-size: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.position-form-modal__control--textarea {
  min-height: 116px;
  resize: none;
}

.position-form-modal__cycle-wrap {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: 0;
  min-inline-size: 0;
  color: #334155;
  font-size: 13px;
}

.position-form-modal__cycle-wrap em {
  color: #ef4444;
  font-style: normal;
}

.position-form-modal__cycle-wrap small {
  color: #94a3b8;
}

.position-form-modal__cycle-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #fff;
}

.position-form-modal__cycle-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  border: 1px solid #d7deea;
  border-radius: 999px;
  padding: 0 14px 0 12px;
  background: #fff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.position-form-modal__cycle-option--active {
  border-color: #6b6ef7;
  background: #eef2ff;
  color: #4f46e5;
}

.position-form-modal__cycle-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #6b6ef7;
}

.position-form-modal__display-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.position-form-modal__display-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.position-form-modal__display-group {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.position-form-modal__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
}

.position-form-modal__status-bar {
  display: grid;
  grid-template-columns: 1.2fr minmax(140px, 180px) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7ff 100%);
}

.position-form-modal__status-copy {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #4f5f78;
}

.position-form-modal__status-copy > .mdi {
  font-size: 18px;
  color: #5b6ef5;
}

.position-form-modal__status-label {
  font-size: 13px;
  font-weight: 600;
}

.position-form-modal__status-note {
  margin-top: 2px;
  font-size: 11px;
}

.position-form-modal__status-tag {
  display: inline-flex;
  margin-left: 4px;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
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

.position-form-modal__status-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #4f5f78;
}

.position-form-modal__status-actions {
  display: flex;
  gap: 8px;
}

.position-form-modal__status-action {
  border: 1px solid #d7deea;
  border-radius: 10px;
  min-height: 38px;
  padding: 0 12px;
  background: #fff;
  color: #4f5f78;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.position-form-modal__status-action--success {
  border-color: #b8e6c8;
  background: #f0fdf4;
  color: #15803d;
}

.position-form-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 22px;
}

.position-form-modal__secondary,
.position-form-modal__primary {
  border-radius: 14px;
  min-height: 48px;
  padding: 0 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.position-form-modal__secondary {
  border: 1px solid #d4deeb;
  background: #fff;
  color: #4a5c78;
}

.position-form-modal__primary {
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #6b6ef7 0%, #7b61ff 100%);
  color: #fff;
}

.position-form-modal__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .position-form-modal__grid,
  .position-form-modal__display-grid,
  .position-form-modal__status-bar {
    grid-template-columns: 1fr;
  }

  :deep(.position-form-modal__shell .overlay-surface-modal__header) {
    padding: 18px 18px 16px;
  }

  :deep(.overlay-surface-modal__body.position-form-modal__body) {
    padding: 16px 16px 0;
  }

  :deep(.overlay-surface-modal__footer.position-form-modal__footer-shell) {
    padding: 0 16px 16px;
  }
}
</style>
