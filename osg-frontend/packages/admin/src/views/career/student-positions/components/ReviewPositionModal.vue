<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-position"
    width="860px"
    :body-class="'student-review-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-briefcase-plus-outline" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <section class="student-review-modal__hero">
      <div class="student-review-modal__avatar">{{ submitterInitials }}</div>
      <div class="student-review-modal__hero-copy">
        <strong>{{ position?.studentName || '未命名学生' }}</strong>
        <span>ID {{ position?.studentId || '--' }}</span>
        <span>{{ submittedLabel }}</span>
      </div>
      <div class="student-review-modal__hero-meta">
        <span :class="['student-review-modal__status', `student-review-modal__status--${statusTone}`]">{{ statusLabel }}</span>
        <span v-if="position?.hasCoachingRequest === 'yes'" class="student-review-modal__coaching">有辅导申请</span>
      </div>
    </section>

    <!-- RULE-D RD-002 合并/新增分支选择 -->
    <section v-if="isPending" class="student-review-modal__mode" data-surface-part="review-mode">
      <a-radio-group v-model:value="reviewMode" button-style="solid">
        <a-radio-button value="create">新增公共岗位</a-radio-button>
        <a-radio-button value="merge">合并到已有岗位</a-radio-button>
      </a-radio-group>
      <a-alert
        v-if="reviewMode === 'create' && duplicateHintPositionId"
        type="warning"
        show-icon
        class="student-review-modal__dup-hint"
        message="检测到已有相同公司+岗位记录"
      >
        <template #description>
          <span>已有岗位 ID #{{ duplicateHintPositionId }}。建议</span>
          <a-button type="link" size="small" @click="switchToMergeWithHint">切换到「合并到已有岗位」</a-button>
        </template>
      </a-alert>
    </section>

    <!-- RULE-D RD-002 合并模式：搜索 + 选定已有公共岗位 -->
    <section v-if="isPending && reviewMode === 'merge'" class="student-review-modal__merge">
      <fieldset class="student-review-modal__field" data-field-name="合并目标岗位">
        <span>合并到已有岗位 *</span>
        <a-select
          v-model:value="mergeToPositionId"
          show-search
          placeholder="按公司或岗位名搜索"
          style="width: 100%"
          :filter-option="false"
          :options="mergeOptions"
          :loading="mergeLoading"
          @search="handleMergeSearch"
        />
      </fieldset>
      <div v-if="selectedMergeOption" class="student-review-modal__merge-summary">
        <div><strong>{{ selectedMergeOption.companyName }}</strong> · {{ selectedMergeOption.positionName }}</div>
        <div class="student-review-modal__merge-meta">
          <span v-if="selectedMergeOption.region">{{ selectedMergeOption.region }}</span>
          <span v-if="selectedMergeOption.city">· {{ selectedMergeOption.city }}</span>
          <span v-if="selectedMergeOption.recruitmentCycle">· {{ selectedMergeOption.recruitmentCycle }}</span>
        </div>
      </div>
    </section>

    <div v-show="reviewMode === 'create'" class="student-review-modal__sections">
      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <span class="mdi mdi-briefcase-variant-outline" aria-hidden="true"></span>
            <span>基本信息</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <fieldset class="student-review-modal__field" data-field-name="岗位分类">
            <span>岗位分类</span>
            <a-select v-model:value="form.positionCategory" placeholder="请选择" allow-clear :disabled="!isPending">
              <a-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <label class="student-review-modal__field" data-field-name="岗位名称">
            <span>岗位名称</span>
            <a-input v-model:value="form.positionName" placeholder="如 Summer Analyst" :disabled="!isPending" />
          </label>

          <fieldset class="student-review-modal__field" data-field-name="部门">
            <span>部门</span>
            <a-select v-model:value="form.department" placeholder="请选择" allow-clear show-search :disabled="!isPending">
              <a-select-option v-for="option in departmentOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="student-review-modal__field" data-field-name="项目时间">
            <span>项目时间</span>
            <a-select v-model:value="form.projectYear" placeholder="请选择" allow-clear :disabled="!isPending">
              <a-select-option v-for="option in projectYearOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <label class="student-review-modal__field student-review-modal__field--wide" data-field-name="行业">
            <span>行业</span>
            <a-input v-model:value="form.industry" placeholder="如 Bulge Bracket / Buyside / Consulting" :disabled="!isPending" />
          </label>

          <fieldset class="student-review-modal__field" data-field-name="截止日期">
            <span>截止日期</span>
            <a-date-picker
              v-model:value="form.deadline"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              placeholder="选择截止时间"
              style="width: 100%"
              :disabled="!isPending"
            />
          </fieldset>
        </div>

        <fieldset class="student-review-modal__chip-group" data-field-name="招聘周期">
          <span class="student-review-modal__chip-label">招聘周期</span>
          <a-button
            v-for="option in recruitmentCycleOptions"
            :key="option.value"
            :type="selectedCycles.includes(option.value) ? 'primary' : 'default'"
            size="small"
            :disabled="!isPending"
            @click="toggleCycle(option.value)"
          >
            {{ option.label }}
          </a-button>
        </fieldset>
      </section>

      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <span class="mdi mdi-domain" aria-hidden="true"></span>
            <span>公司信息</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <label class="student-review-modal__field" data-field-name="公司名称">
            <span>公司名称</span>
            <a-input v-model:value="form.companyName" placeholder="公司名称" :disabled="!isPending" />
          </label>

          <fieldset class="student-review-modal__field" data-field-name="公司类别">
            <span>公司类别</span>
            <a-select v-model:value="form.companyType" placeholder="请选择" allow-clear :disabled="!isPending">
              <a-select-option v-for="option in companyTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="student-review-modal__field" data-field-name="大区">
            <span>岗位地区</span>
            <a-select v-model:value="form.region" placeholder="请选择" allow-clear :disabled="!isPending" @change="onRegionChange">
              <a-select-option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <fieldset class="student-review-modal__field" data-field-name="城市">
            <span>城市</span>
            <a-select
              v-model:value="form.city"
              :placeholder="form.region ? '请选择' : '请先选择岗位地区'"
              allow-clear
              show-search
              :disabled="!isPending || !form.region"
            >
              <a-select-option v-for="option in cityOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <label class="student-review-modal__field" data-field-name="公司官网">
            <span>公司官网</span>
            <a-input v-model:value="form.companyWebsite" placeholder="https://company.com" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" data-field-name="岗位链接">
            <span>岗位链接 *</span>
            <a-input v-model:value="form.positionUrl" placeholder="https://company.com/jobs/..." :disabled="!isPending" />
          </label>
        </div>
      </section>
    </div>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">取消</a-button>
      <a-button
        v-if="isPending"
        danger
        data-surface-part="reject-control"
        data-surface-trigger="modal-reject-position"
        :data-surface-sample-key="props.position ? `student-position-${props.position.studentPositionId}` : 'student-position'"
        @click="handleRejectRequest"
      >
        拒绝岗位
      </a-button>
      <a-button
        v-if="isPending"
        type="primary"
        data-surface-part="confirm-control"
        @click="handleSubmit"
      >
        保存并通过
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { OverlaySurfaceModal } from '@osg/shared/components'
import {
  searchPublicPositionsForMerge,
  type PublicPositionSearchItem,
  type ReviewStudentPositionPayload,
  type StudentPositionListItem,
} from '@osg/shared/api/admin/studentPosition'
import type { PositionMeta, PositionMetaOption } from '@osg/shared/api/admin/position'

const props = defineProps<{
  visible: boolean
  position?: StudentPositionListItem | null
  meta?: PositionMeta | null
  duplicateHintPositionId?: number | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: ReviewStudentPositionPayload]
  requestReject: []
}>()

// RULE-D RD-002 合并/新增模式
const reviewMode = ref<'create' | 'merge'>('create')
const mergeToPositionId = ref<number | undefined>(undefined)
const mergeLoading = ref(false)
const mergeCandidates = ref<PublicPositionSearchItem[]>([])
const mergeOptions = computed(() =>
  mergeCandidates.value.map((item) => ({
    value: item.positionId,
    label: `${item.companyName} · ${item.positionName}${item.city ? ' · ' + item.city : ''}`,
  }))
)
const selectedMergeOption = computed(() =>
  mergeCandidates.value.find((item) => item.positionId === mergeToPositionId.value) || null
)

let mergeSearchHandle: ReturnType<typeof setTimeout> | null = null

const handleMergeSearch = (keyword: string) => {
  if (mergeSearchHandle) {
    clearTimeout(mergeSearchHandle)
  }
  const text = keyword.trim()
  if (!text) {
    mergeCandidates.value = []
    return
  }
  mergeSearchHandle = setTimeout(async () => {
    mergeLoading.value = true
    try {
      const res = await searchPublicPositionsForMerge(text)
      mergeCandidates.value = res.rows || []
    } finally {
      mergeLoading.value = false
    }
  }, 250)
}

const switchToMergeWithHint = () => {
  reviewMode.value = 'merge'
  if (props.duplicateHintPositionId) {
    mergeToPositionId.value = props.duplicateHintPositionId
  }
}

const EMPTY_OPTIONS: PositionMetaOption[] = []
const categoryOptions = computed<PositionMetaOption[]>(() => props.meta?.categories || EMPTY_OPTIONS)
const companyTypeOptions = computed<PositionMetaOption[]>(() => props.meta?.industries || EMPTY_OPTIONS)
const departmentOptions = computed<PositionMetaOption[]>(() => props.meta?.departments || EMPTY_OPTIONS)
const recruitmentCycleOptions = computed<PositionMetaOption[]>(() => props.meta?.recruitmentCycles || EMPTY_OPTIONS)
const projectYearOptions = computed<PositionMetaOption[]>(() => props.meta?.projectYears || EMPTY_OPTIONS)
const regionOptions = computed<PositionMetaOption[]>(() => props.meta?.regions || EMPTY_OPTIONS)
const cityOptions = computed<PositionMetaOption[]>(() => {
  if (!form.region) return EMPTY_OPTIONS
  return props.meta?.citiesByRegion?.[form.region] || EMPTY_OPTIONS
})

const form = reactive({
  positionCategory: undefined as string | undefined,
  industry: '',
  companyName: '',
  companyType: undefined as string | undefined,
  companyWebsite: '',
  positionName: '',
  department: undefined as string | undefined,
  region: undefined as string | undefined,
  city: undefined as string | undefined,
  recruitmentCycle: [] as string[],
  projectYear: undefined as string | undefined,
  deadline: '',
  positionUrl: ''
})

const resetForm = () => {
  form.positionCategory = props.position?.positionCategory || undefined
  form.industry = props.position?.industry || ''
  form.companyName = props.position?.companyName || ''
  form.companyType = props.position?.companyType || undefined
  form.companyWebsite = props.position?.companyWebsite || ''
  form.positionName = props.position?.positionName || ''
  form.department = props.position?.department || undefined
  form.region = props.position?.region || undefined
  form.city = props.position?.city || undefined
  form.recruitmentCycle = (props.position?.recruitmentCycle || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  form.projectYear = props.position?.projectYear || undefined
  form.deadline = toDateTimeLocal(props.position?.deadline)
  form.positionUrl = props.position?.positionUrl || ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      reviewMode.value = 'create'
      mergeToPositionId.value = undefined
      mergeCandidates.value = []
    }
  }
)

const selectedCycles = computed(() => form.recruitmentCycle)
const isPending = computed(() => props.position?.status === 'pending')
const modalTitle = computed(() => (isPending.value ? '学生自添岗位编辑' : '学生自添岗位结果'))

const submitterInitials = computed(() => {
  const value = props.position?.studentName || '学员'
  return value.slice(0, 2).toUpperCase()
})

const submittedLabel = computed(() => {
  if (!props.position?.submittedAt) return '提交时间待补充'
  return `提交于 ${formatDateTime(props.position.submittedAt)}`
})

const statusLabel = computed(() => {
  if (props.position?.status === 'approved') return '已通过'
  if (props.position?.status === 'rejected') return '已拒绝'
  return '待审核'
})

const statusTone = computed(() => {
  if (props.position?.status === 'approved') return 'approved'
  if (props.position?.status === 'rejected') return 'rejected'
  return 'pending'
})

const toggleCycle = (value: string) => {
  if (form.recruitmentCycle.includes(value)) {
    form.recruitmentCycle = form.recruitmentCycle.filter((item) => item !== value)
    return
  }
  form.recruitmentCycle = [...form.recruitmentCycle, value]
}

const onRegionChange = () => {
  // 切换地区时，若当前城市不在新地区的字典内则清空
  const next = cityOptions.value
  if (!next.some((opt) => opt.value === form.city)) {
    form.city = undefined
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleRejectRequest = () => {
  emit('requestReject')
}

const handleSubmit = () => {
  // RULE-D RD-002 合并分支：仅传 mergeToPositionId
  if (reviewMode.value === 'merge') {
    if (!mergeToPositionId.value) {
      message.warning('请选择合并目标公共岗位')
      return
    }
    emit('submit', { mergeToPositionId: mergeToPositionId.value })
    return
  }

  // 新增分支：仅 岗位链接 必填，对齐学生端
  const positionUrl = form.positionUrl.trim()
  if (!positionUrl) {
    message.warning('请填写岗位链接')
    return
  }

  const payload: ReviewStudentPositionPayload = {
    positionCategory: form.positionCategory?.trim() || undefined,
    industry: form.industry.trim() || undefined,
    companyName: form.companyName.trim() || undefined,
    companyType: form.companyType?.trim() || undefined,
    companyWebsite: form.companyWebsite.trim() || undefined,
    positionName: form.positionName.trim() || undefined,
    department: form.department?.trim() || undefined,
    region: form.region?.trim() || undefined,
    city: form.city?.trim() || undefined,
    recruitmentCycle: form.recruitmentCycle.join(', ') || undefined,
    projectYear: form.projectYear?.trim() || undefined,
    deadline: normalizeDateTimeLocal(form.deadline),
    positionUrl
  }

  emit('submit', payload)
}

const toDateTimeLocal = (value?: string) => {
  if (!value) return ''
  return value.slice(0, 16)
}

const formatDateTime = (value: string) => value.replace('T', ' ').slice(0, 16)

const normalizeDateTimeLocal = (value: string) => {
  if (!value) return undefined
  if (value.length === 16) return `${value}:00`
  return value
}
</script>

<style scoped lang="scss">
.student-review-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-review-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.student-review-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.student-review-modal__hero-copy,
.student-review-modal__hero-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-review-modal__hero-copy strong {
  color: #0f172a;
  font-size: 15px;
}

.student-review-modal__hero-copy span,
.student-review-modal__hero-meta span {
  color: #64748b;
  font-size: 12px;
}

.student-review-modal__hero-meta {
  align-items: flex-end;
}

.student-review-modal__status,
.student-review-modal__coaching {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.student-review-modal__status--pending {
  background: #fef3c7;
  color: #92400e;
}

.student-review-modal__status--approved {
  background: #dcfce7;
  color: #166534;
}

.student-review-modal__status--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.student-review-modal__coaching {
  background: #eef2ff;
  color: #4f46e5;
}

.student-review-modal__mode,
.student-review-modal__merge {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid #dbe3ee;
  background: #f8fafc;
}

.student-review-modal__dup-hint {
  border-radius: 8px;
}

.student-review-modal__merge-summary {
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.student-review-modal__merge-meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.student-review-modal__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-review-modal__section-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #dbe3ee;
  background: #f8fafc;
}

.student-review-modal__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.student-review-modal__section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 700;
}

.student-review-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.student-review-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.student-review-modal__field--wide {
  grid-column: span 2;
}

.student-review-modal__field span,
.student-review-modal__chip-label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-review-modal__chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

@media (max-width: 900px) {
  .student-review-modal__hero {
    grid-template-columns: 1fr;
  }

  .student-review-modal__hero-meta {
    align-items: flex-start;
  }

  .student-review-modal__grid {
    grid-template-columns: 1fr;
  }

  .student-review-modal__field--wide {
    grid-column: span 1;
  }
}
</style>
