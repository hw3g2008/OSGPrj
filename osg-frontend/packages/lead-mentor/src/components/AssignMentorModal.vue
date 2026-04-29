<template>
  <a-config-provider :auto-insert-space-in-button="false">
    <a-modal
      :open="modelValue && !!preview"
      :width="720"
      :footer="null"
      :closable="false"
      :body-style="bodyStyle"
      :wrap-class-name="wrapClassName"
      :mask-closable="true"
      destroy-on-close
      centered
      @cancel="closeModal"
    >
      <div
        class="assign-mentor-shell"
        data-surface-id="modal-assign-mentor"
        role="dialog"
        :aria-labelledby="titleId"
      >
        <span class="assign-mentor-anchor" data-surface-part="shell" aria-hidden="true" />

        <header class="assign-mentor-header" data-surface-part="header">
          <span :id="titleId" class="assign-mentor-title">
            <i class="mdi mdi-account-star" aria-hidden="true" />
            为学员匹配辅导导师
          </span>
          <a-button
            type="text"
            class="assign-mentor-close"
            data-surface-part="close-control"
            aria-label="关闭导师匹配弹层"
            @click="closeModal"
          >
            <template #icon><CloseOutlined /></template>
          </a-button>
        </header>

        <section v-if="preview" class="assign-mentor-body" data-surface-part="body">
          <a-card :bordered="false" class="student-card">
            <a-row :gutter="[16, 12]" align="middle">
              <a-col flex="56px">
                <a-avatar :size="48" :style="{ background: '#8b5cf6' }">
                  {{ initial(preview.studentName) }}
                </a-avatar>
              </a-col>
              <a-col flex="auto">
                <div class="student-card__name">
                  {{ preview.studentName }}
                  <span class="student-card__meta">(ID: {{ preview.studentId }})</span>
                </div>
                <div class="student-card__sub">
                  {{ preview.companyName }} · {{ preview.positionName }}
                </div>
              </a-col>
            </a-row>

            <a-divider class="student-card__divider" />

            <a-row :gutter="[16, 12]" class="student-grid">
              <a-col :xs="24" :sm="8">
                <span class="student-grid__label">面试阶段</span>
                <strong>{{ preview.interviewStage }}</strong>
              </a-col>
              <a-col :xs="24" :sm="8">
                <span class="student-grid__label">面试时间</span>
                <strong>{{ preview.interviewTime }}</strong>
              </a-col>
              <a-col :xs="24" :sm="8">
                <span class="student-grid__label">需求导师</span>
                <strong class="student-grid__accent">{{ preview.mentorDemand }}</strong>
              </a-col>
              <a-col :xs="24" :sm="12">
                <span class="student-grid__label">意向导师</span>
                <strong class="student-grid__success">{{ preview.preferredMentor }}</strong>
              </a-col>
              <a-col :xs="24" :sm="12">
                <span class="student-grid__label">排除导师</span>
                <strong class="student-grid__danger">{{ preview.excludedMentor }}</strong>
              </a-col>
            </a-row>
          </a-card>

          <div class="form-group">
            <div class="form-label">筛选导师</div>
            <a-row :gutter="[12, 12]" class="filter-row">
              <a-col :xs="24" :sm="12" :md="6">
                <a-select
                  v-model:value="filters.scheduleStatus"
                  placeholder="全部排期状态"
                  allow-clear
                  style="width: 100%;"
                  :options="scheduleStatusOptions"
                />
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-select
                  v-model:value="filters.majorDirection"
                  placeholder="全部主攻方向"
                  allow-clear
                  style="width: 100%;"
                  :options="majorDirectionOptions"
                  @change="handleMajorDirectionChange"
                />
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-select
                  v-model:value="filters.subDirection"
                  placeholder="全部子方向"
                  allow-clear
                  style="width: 100%;"
                  :options="filteredSubDirectionOptions"
                />
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-input
                  v-model:value="filters.keyword"
                  placeholder="搜索导师姓名..."
                  allow-clear
                >
                  <template #prefix><SearchOutlined /></template>
                </a-input>
              </a-col>
            </a-row>
            <div class="filter-hint">
              <FilterOutlined />
              共找到 <strong>{{ filteredMentors.length }}</strong> 位导师
            </div>
          </div>

          <div class="form-group">
            <div class="form-label">
              选择导师
              <span class="form-label__meta">(可多选)</span>
            </div>

            <a-spin :spinning="loadingMentors">
              <a-empty
                v-if="filteredMentors.length === 0 && !loadingMentors"
                description="暂无符合条件的导师"
                class="mentor-empty"
              />
              <a-list v-else class="mentor-list" :data-source="filteredMentors" :split="false">
                <template #renderItem="{ item }">
                  <a-list-item
                    class="mentor-item"
                    :class="{ 'mentor-item--selected': isSelected(item.staffId) }"
                    @click="toggleMentor(item)"
                  >
                    <div class="mentor-item__main">
                      <a-checkbox
                        :checked="isSelected(item.staffId)"
                        @click.stop
                        @change="toggleMentor(item)"
                      />
                      <a-avatar
                        :size="40"
                        :style="{ background: avatarColor(item.staffName) }"
                      >
                        {{ initial(item.staffName) }}
                      </a-avatar>
                      <div class="mentor-item__copy">
                        <div class="mentor-item__name">
                          {{ item.staffName }}
                          <a-tag color="purple" class="mentor-item__badge">
                            {{ formatDirection(item) }}
                          </a-tag>
                        </div>
                        <div class="mentor-item__sub">{{ formatLocation(item) }}</div>
                      </div>
                      <div class="mentor-item__meta">
                        <a-tag :color="scheduleTone(item.scheduleStatus)">
                          {{ scheduleLabel(item.scheduleStatus) }}
                        </a-tag>
                        <div class="mentor-item__hours">学员 {{ item.studentCount ?? 0 }} 人</div>
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </a-spin>

            <div class="selection-hint">
              <InfoCircleOutlined />
              已选择 <strong>{{ selected.length }}</strong> 位导师
            </div>
          </div>

          <div class="form-group form-group--last">
            <div class="form-label">
              备注
              <span class="form-label__meta">(选填)</span>
            </div>
            <a-textarea
              v-model:value="assignNote"
              :rows="2"
              placeholder="给导师的特别说明，如学员背景、重点辅导内容等..."
            />
          </div>
        </section>

        <footer class="assign-mentor-footer">
          <a-button @click="closeModal">取消</a-button>
          <a-button type="primary" class="assign-mentor-action" @click="handleConfirm">
            <template #icon><CheckOutlined /></template>
            确认匹配
          </a-button>
        </footer>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Avatar as AAvatar,
  Button as AButton,
  Card as ACard,
  Checkbox as ACheckbox,
  Col as ACol,
  ConfigProvider as AConfigProvider,
  Divider as ADivider,
  Empty as AEmpty,
  Input as AInput,
  List as AList,
  ListItem as AListItem,
  Modal as AModal,
  Row as ARow,
  Select as ASelect,
  Spin as ASpin,
  Tag as ATag,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue'
import {
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  getLeadMentorMentorList,
  type LeadMentorMentorOption,
} from '@osg/shared/api'
import { useDictFacade } from '@osg/shared/composables'

export interface AssignMentorPreview {
  studentName: string
  studentId: string
  companyName: string
  positionName: string
  interviewStage: string
  interviewTime: string
  mentorDemand: string
  preferredMentor: string
  excludedMentor: string
}

export interface AssignMentorConfirmPayload {
  mentorIds: number[]
  mentorNames: string[]
  assignNote: string
}

const props = defineProps<{
  modelValue: boolean
  preview: AssignMentorPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm-match': [payload: AssignMentorConfirmPayload]
}>()

const titleId = 'assign-mentor-modal-title'
const wrapClassName = 'assign-mentor-modal-wrap'
const bodyStyle = { padding: '0' }

const filters = ref({
  scheduleStatus: undefined as string | undefined,
  majorDirection: undefined as string | undefined,
  subDirection: undefined as string | undefined,
  keyword: '',
})
const assignNote = ref('')
const selected = ref<LeadMentorMentorOption[]>([])
const mentors = ref<LeadMentorMentorOption[]>([])
const loadingMentors = ref(false)

const { items: scheduleDictOptions, load: loadScheduleDict } = useDictFacade('osg_schedule_status')
const { items: majorDirectionDictOptions, load: loadMajorDirectionDict } =
  useDictFacade('osg_major_direction')
const { items: subDirectionDictOptions, load: loadSubDirectionDict } =
  useDictFacade('osg_sub_direction')

const scheduleStatusOptions = computed(() =>
  scheduleDictOptions.value.map((item) => ({ value: item.value, label: item.label })),
)
const majorDirectionOptions = computed(() =>
  majorDirectionDictOptions.value.map((item) => ({ value: item.value, label: item.label })),
)
const filteredSubDirectionOptions = computed(() => {
  const parent = filters.value.majorDirection
  return subDirectionDictOptions.value
    .filter((item) => !parent || item.parentValue === parent)
    .map((item) => ({ value: item.value, label: item.label }))
})

const filteredMentors = computed(() => {
  const keyword = filters.value.keyword.trim().toLowerCase()
  if (!keyword) {
    return mentors.value
  }
  return mentors.value.filter((mentor) =>
    (mentor.staffName || '').toLowerCase().includes(keyword),
  )
})

const fetchMentors = async () => {
  loadingMentors.value = true
  try {
    const response = await getLeadMentorMentorList({
      majorDirection: filters.value.majorDirection,
      subDirection: filters.value.subDirection,
      scheduleStatus: filters.value.scheduleStatus,
    })
    mentors.value = Array.isArray(response?.rows) ? response.rows : []
  } catch (_error) {
    mentors.value = []
    message.error('导师列表加载失败')
  } finally {
    loadingMentors.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    selected.value = []
    assignNote.value = ''
    void loadScheduleDict().catch(() => undefined)
    void loadMajorDirectionDict().catch(() => undefined)
    void loadSubDirectionDict().catch(() => undefined)
    void fetchMentors()
  },
  { immediate: true },
)

watch(
  () => [filters.value.scheduleStatus, filters.value.majorDirection, filters.value.subDirection],
  () => {
    if (props.modelValue) {
      void fetchMentors()
    }
  },
)

const handleMajorDirectionChange = () => {
  filters.value.subDirection = undefined
}

const isSelected = (staffId: number) => selected.value.some((item) => item.staffId === staffId)

const toggleMentor = (mentor: LeadMentorMentorOption) => {
  if (isSelected(mentor.staffId)) {
    selected.value = selected.value.filter((item) => item.staffId !== mentor.staffId)
    return
  }
  selected.value = [...selected.value, mentor]
}

const closeModal = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  if (selected.value.length === 0) {
    message.error('请至少选择1位导师')
    return
  }
  emit('confirm-match', {
    mentorIds: selected.value.map((item) => item.staffId),
    mentorNames: selected.value.map((item) => item.staffName),
    assignNote: assignNote.value.trim(),
  })
}

const initial = (name?: string | null) => {
  if (!name) return '?'
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

const avatarColor = (name?: string | null) => {
  const palette = ['#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#0ea5e9']
  const seed = (name || '').charCodeAt(0) || 0
  return palette[seed % palette.length]
}

const formatDirection = (mentor: LeadMentorMentorOption) => {
  const major = lookupLabel(majorDirectionDictOptions.value, mentor.majorDirection)
  const sub = lookupLabel(subDirectionDictOptions.value, mentor.subDirection)
  if (major && sub) return `${major} · ${sub}`
  return major || sub || '方向待补充'
}

const formatLocation = (mentor: LeadMentorMentorOption) => {
  const parts = [mentor.region, mentor.city].filter(Boolean)
  if (parts.length === 0) {
    return '所在地待补充'
  }
  return parts.join(' · ')
}

const lookupLabel = (
  list: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null,
) => {
  if (!value) return ''
  const found = list.find((item) => item.value === value)
  return found ? found.label : value
}

const scheduleLabel = (status?: string) => {
  if (!status) return '未知'
  const dictLabel = lookupLabel(scheduleDictOptions.value, status)
  return dictLabel || status
}

const scheduleTone = (status?: string) => {
  switch (status) {
    case 'available':
      return 'green'
    case 'busy':
      return 'orange'
    case 'normal':
      return 'blue'
    default:
      return 'default'
  }
}
</script>

<style lang="scss">
.assign-mentor-modal-wrap .ant-modal-content {
  border-radius: 16px;
  overflow: hidden;
  padding: 0;
}
.assign-mentor-modal-wrap .ant-modal-body {
  padding: 0;
}
</style>

<style scoped lang="scss">
.assign-mentor-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  max-height: 86vh;
}

.assign-mentor-anchor {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.assign-mentor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  flex-shrink: 0;
}

.assign-mentor-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.assign-mentor-close {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.16) !important;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.assign-mentor-close:hover {
  background: rgba(255, 255, 255, 0.28) !important;
}

.assign-mentor-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.student-card {
  margin-bottom: 20px;
  background: #f5f3ff;
  border-radius: 12px;
}

.student-card :deep(.ant-card-body) {
  padding: 16px;
}

.student-card__divider {
  margin: 12px 0;
  border-color: rgba(139, 92, 246, 0.18);
}

.student-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.student-card__meta {
  margin-left: 6px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
}

.student-card__sub {
  margin-top: 2px;
  font-size: 13px;
  color: #6b7280;
}

.student-grid__label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #6b7280;
}

.student-grid strong {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.student-grid__accent {
  color: #8b5cf6;
}

.student-grid__success {
  color: #22c55e;
}

.student-grid__danger {
  color: #ef4444;
}

.form-group {
  margin-bottom: 20px;
}

.form-group--last {
  margin-bottom: 0;
}

.form-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.form-label__meta {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
}

.filter-row {
  margin-bottom: 8px;
}

.filter-hint,
.selection-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.selection-hint {
  margin-top: 8px;
}

.mentor-list {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.mentor-list :deep(.ant-list-item) {
  padding: 0;
  border: 0;
}

.mentor-item {
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f3f4f6;
}

.mentor-item:last-child {
  border-bottom: 0;
}

.mentor-item:hover {
  background: #faf5ff;
}

.mentor-item--selected {
  background: #f0fdf4;
}

.mentor-item__main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
}

.mentor-item__copy {
  flex: 1;
  min-width: 0;
}

.mentor-item__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.mentor-item__badge {
  font-size: 11px;
  margin-right: 0;
}

.mentor-item__sub {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.mentor-item__meta {
  text-align: right;
  flex-shrink: 0;
  min-width: 88px;
}

.mentor-item__hours {
  margin-top: 4px;
  font-size: 11px;
  color: #6b7280;
}

.mentor-empty {
  padding: 32px 0;
}

.assign-mentor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.assign-mentor-action {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
  border: 0 !important;
}

.assign-mentor-action:hover,
.assign-mentor-action:focus {
  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
}
</style>
