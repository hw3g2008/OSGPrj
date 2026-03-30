<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-assign-mentor"
    width="780px"
    :body-class="['job-overview-assign-modal__body', 'assign-mentor-modal__body']"
    @cancel="handleClose"
  >
    <template #title>
      <div class="job-overview-assign-modal__titlebar">
        <div class="job-overview-assign-modal__title">
          <i class="mdi mdi-account-plus-outline" aria-hidden="true"></i>
          <span>分配导师</span>
        </div>
      </div>
    </template>

    <section class="job-overview-assign-modal__hero assign-mentor-modal__hero">
      <div class="job-overview-assign-modal__avatar assign-mentor-modal__avatar">{{ studentInitials }}</div>
      <div class="job-overview-assign-modal__summary assign-mentor-modal__summary">
        <strong>{{ row?.studentName || '待分配学员' }}</strong>
        <span>ID {{ row?.studentId || '--' }}</span>
        <span>{{ row?.companyName || '-' }} / {{ row?.positionName || '-' }}</span>
      </div>
      <div class="job-overview-assign-modal__meta assign-mentor-modal__meta">
        <span class="job-overview-assign-modal__meta-chip assign-mentor-modal__meta-chip">建议分配 {{ requestedCount }} 位导师</span>
        <span class="job-overview-assign-modal__meta-chip job-overview-assign-modal__meta-chip--accent assign-mentor-modal__meta-chip assign-mentor-modal__meta-chip--accent">
          {{ preferredMentorLabel }}
        </span>
      </div>
    </section>

    <section class="job-overview-assign-modal__panel">
      <div class="job-overview-assign-modal__filters">
        <label
          class="job-overview-assign-modal__search"
          data-field-name="导师搜索"
          data-field-name-alias="分配导师弹窗导师搜索"
        >
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <input
            v-model="keyword"
            data-field-name="导师搜索"
            data-field-name-alias="分配导师弹窗导师搜索"
            type="text"
            placeholder="搜索导师姓名..."
          />
        </label>

        <div
          class="job-overview-assign-modal__scope"
          data-field-name="排期状态筛选"
          data-field-name-alias="分配导师弹窗排期状态筛选"
        >
          <button
            v-for="option in scopeOptions"
            :key="option.value"
            type="button"
            :data-field-name="option.label"
            :data-field-name-alias="`分配导师弹窗${option.label}`"
            :class="[
              'job-overview-assign-modal__scope-button',
              { 'job-overview-assign-modal__scope-button--active': scope === option.value }
            ]"
            @click="scope = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div
          class="job-overview-assign-modal__scope"
          data-field-name="主攻方向筛选"
          data-field-name-alias="分配导师弹窗主攻方向筛选"
        >
          <button
            v-for="option in majorDirectionOptions"
            :key="option.value"
            type="button"
            :data-field-name="option.label"
            :data-field-name-alias="`分配导师弹窗${option.label}`"
            :class="[
              'job-overview-assign-modal__scope-button',
              { 'job-overview-assign-modal__scope-button--active': majorDirection === option.value }
            ]"
            @click="majorDirection = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div
        class="job-overview-assign-modal__mentor-list assign-mentor-modal__mentor-list"
        data-field-name="子方向筛选"
        data-field-name-alias="分配导师弹窗子方向筛选"
      >
        <template v-if="filteredMentorOptions.length">
          <label
            v-for="option in filteredMentorOptions"
            :key="option.mentorId"
            :class="[
              'job-overview-assign-modal__mentor assign-mentor-modal__option',
              {
                'job-overview-assign-modal__mentor--selected assign-mentor-modal__option--selected': selectedMentorIds.includes(option.mentorId),
                'job-overview-assign-modal__mentor--preferred assign-mentor-modal__option--preferred': option.preferred
              }
            ]"
          >
            <input
              v-model="selectedMentorIds"
              class="job-overview-assign-modal__checkbox assign-mentor-modal__checkbox"
              :data-field-name="option.mentorName"
              :data-field-name-alias="`分配导师弹窗${option.mentorName}`"
              type="checkbox"
              :value="option.mentorId"
            />

            <div class="job-overview-assign-modal__mentor-avatar">{{ getMentorInitials(option.mentorName) }}</div>

            <div class="job-overview-assign-modal__mentor-copy assign-mentor-modal__option-copy">
              <strong>{{ option.mentorName }}</strong>
              <span>{{ option.hint || '可分配导师' }}</span>
            </div>

            <span v-if="option.preferred" class="job-overview-assign-modal__mentor-flag assign-mentor-modal__preferred-flag">意向导师</span>
          </label>
        </template>
        <div v-else class="job-overview-assign-modal__empty assign-mentor-modal__empty">当前没有可直接分配的导师候选。</div>
      </div>
    </section>

    <section
      class="job-overview-assign-modal__note-field"
      data-field-name="备注"
      data-field-name-alias="分配导师弹窗备注"
    >
      <label class="job-overview-assign-modal__label">备注</label>
      <textarea
        v-model="assignNote"
        data-field-name="备注"
        data-field-name-alias="分配导师弹窗备注"
        class="job-overview-assign-modal__textarea assign-mentor-modal__textarea"
        rows="4"
        maxlength="160"
        placeholder="给导师的特别说明，如学员背景、重点辅导内容等..."
      />
      <div class="job-overview-assign-modal__note-meta assign-mentor-modal__note-meta">
        <span>已选择 {{ selectedMentorIds.length }} 位导师</span>
        <span>{{ assignNote.length }}/160</span>
      </div>
    </section>

    <template #footer>
      <div class="job-overview-assign-modal__footer assign-mentor-modal__footer">
        <button type="button" class="job-overview-assign-modal__button job-overview-assign-modal__button--ghost" @click="handleClose">
          取消
        </button>
        <button
          type="button"
          class="job-overview-assign-modal__button job-overview-assign-modal__button--primary"
          :disabled="submitting || !selectedMentorIds.length"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '确认分配' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { UnassignedJobOverviewRow } from '@osg/shared/api/admin/jobOverview'

interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
  majorDirection?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: UnassignedJobOverviewRow | null
  mentorOptions: AssignMentorOption[]
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { mentorIds: number[]; mentorNames: string[]; assignNote: string }]
}>()

const keyword = ref('')
const scope = ref<'all' | 'preferred' | 'recommended'>('all')
const majorDirection = ref('all')
const selectedMentorIds = ref<number[]>([])
const assignNote = ref('')

const scopeOptions = [
  { value: 'all', label: '全部导师' },
  { value: 'preferred', label: '意向导师' },
  { value: 'recommended', label: '班主任推荐' }
] as const

const majorDirectionOptions = computed(() => {
  const values = new Set<string>()
  props.mentorOptions.forEach((option) => {
    const direction = resolveMajorDirection(option)
    if (direction) {
      values.add(direction)
    }
  })

  return [
    { value: 'all', label: '全部方向' },
    ...[...values].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')).map((value) => ({
      value,
      label: value
    }))
  ]
})

const studentInitials = computed(() => {
  const value = props.row?.studentName || '学员'
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || '暂无学员意向导师')

const filteredMentorOptions = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return props.mentorOptions.filter((option) => {
    if (scope.value === 'preferred' && !option.preferred) {
      return false
    }
    if (scope.value === 'recommended' && option.hint !== '班主任推荐') {
      return false
    }
    if (majorDirection.value !== 'all' && resolveMajorDirection(option) !== majorDirection.value) {
      return false
    }
    if (!normalizedKeyword) {
      return true
    }
    return option.mentorName.toLowerCase().includes(normalizedKeyword)
      || String(option.hint || '').toLowerCase().includes(normalizedKeyword)
  })
})

watch(
  () => [props.visible, props.mentorOptions, props.row?.requestedMentorCount] as const,
  ([visible]) => {
    if (!visible) {
      keyword.value = ''
      scope.value = 'all'
      majorDirection.value = 'all'
      selectedMentorIds.value = []
      assignNote.value = ''
      return
    }

    keyword.value = ''
    scope.value = 'all'
    majorDirection.value = 'all'
    selectedMentorIds.value = props.mentorOptions
      .filter((option) => option.preferred)
      .slice(0, requestedCount.value)
      .map((option) => option.mentorId)
    assignNote.value = ''
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!selectedMentorIds.value.length) {
    message.warning('请至少选择1位导师')
    return
  }

  const selectedOptions = props.mentorOptions.filter((option) => selectedMentorIds.value.includes(option.mentorId))
  emit('submit', {
    mentorIds: selectedOptions.map((option) => option.mentorId),
    mentorNames: selectedOptions.map((option) => option.mentorName),
    assignNote: assignNote.value.trim()
  })
}

const getMentorInitials = (value: string) => value.slice(0, 2).toUpperCase()

const resolveMajorDirection = (option: AssignMentorOption) => {
  if (option.majorDirection) {
    return option.majorDirection.trim()
  }

  const [direction] = String(option.hint || '')
    .split('/')
    .map((item) => item.trim())
  return direction || ''
}
</script>

<style scoped lang="scss">
.job-overview-assign-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.job-overview-assign-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
}

.job-overview-assign-modal__hero,
.assign-mentor-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
}

.job-overview-assign-modal__avatar,
.assign-mentor-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.job-overview-assign-modal__summary,
.assign-mentor-modal__summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.job-overview-assign-modal__summary strong {
  color: #0f172a;
  font-size: 16px;
}

.job-overview-assign-modal__summary span {
  color: #64748b;
  font-size: 12px;
}

.job-overview-assign-modal__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.job-overview-assign-modal__meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-assign-modal__meta-chip--accent {
  background: #eef2ff;
  color: #4f46e5;
}

.job-overview-assign-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-overview-assign-modal__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.job-overview-assign-modal__search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 180px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
}

.job-overview-assign-modal__search .mdi {
  color: #94a3b8;
  font-size: 14px;
}

.job-overview-assign-modal__search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
}

.job-overview-assign-modal__scope {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.job-overview-assign-modal__scope-button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-assign-modal__scope-button--active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4f46e5;
}

.job-overview-assign-modal__summary-chip {
  margin-left: auto;
  color: #64748b;
  font-size: 12px;
}

.job-overview-assign-modal__summary-chip strong {
  color: #4f46e5;
}

.job-overview-assign-modal__mentor-list,
.assign-mentor-modal__mentor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-overview-assign-modal__mentor,
.assign-mentor-modal__option {
  position: relative;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #fff;
}

.job-overview-assign-modal__mentor--selected,
.assign-mentor-modal__option--selected {
  border-color: #6366f1;
  background: #f8faff;
}

.job-overview-assign-modal__mentor--preferred,
.assign-mentor-modal__option--preferred {
  background: linear-gradient(145deg, rgba(238, 242, 255, 0.92), rgba(248, 250, 252, 0.96));
}

.job-overview-assign-modal__checkbox,
.assign-mentor-modal__checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
}

.job-overview-assign-modal__mentor-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #6366f1;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.job-overview-assign-modal__mentor-copy strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.job-overview-assign-modal__mentor-copy span {
  color: #64748b;
  font-size: 12px;
}

.job-overview-assign-modal__mentor-flag,
.assign-mentor-modal__preferred-flag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-assign-modal__note-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-overview-assign-modal__label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-assign-modal__textarea,
.assign-mentor-modal__textarea {
  width: 100%;
  min-height: 112px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  resize: vertical;
}

.job-overview-assign-modal__note-meta,
.assign-mentor-modal__note-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.job-overview-assign-modal__empty,
.assign-mentor-modal__empty {
  padding: 18px;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.job-overview-assign-modal__footer,
.assign-mentor-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.job-overview-assign-modal__button {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.job-overview-assign-modal__button--ghost {
  background: #fff;
  color: #475569;
}

.job-overview-assign-modal__button--primary {
  border-color: #6366f1;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}

@media (max-width: 860px) {
  .job-overview-assign-modal__hero,
  .assign-mentor-modal__hero {
    grid-template-columns: 1fr;
  }

  .job-overview-assign-modal__meta {
    align-items: flex-start;
  }

  .job-overview-assign-modal__summary-chip {
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .job-overview-assign-modal__mentor,
  .assign-mentor-modal__option {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .job-overview-assign-modal__mentor-flag,
  .assign-mentor-modal__preferred-flag {
    grid-column: span 2;
    justify-self: start;
  }
}
</style>
