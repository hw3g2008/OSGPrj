<template>
  <div id="page-mock-practice" class="mock-practice-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">
              {{ mockPracticeMeta.pageSummary.titleZh }}
              <span>{{ mockPracticeMeta.pageSummary.titleEn }}</span>
            </h1>
            <p class="page-sub">{{ mockPracticeMeta.pageSummary.subtitle }}</p>
          </div>
        </div>
      </template>

      <div class="practice-grid">
        <a-card
          v-for="entry in mockPracticeMeta.practiceCards"
          :key="entry.id"
          hoverable
          class="practice-card"
          @click="openPracticeModal(entry.id)"
        >
          <div class="practice-card__icon" :style="{ background: entry.gradient }">
            <i class="mdi" :class="practiceCardIcon(entry.id)" aria-hidden="true"></i>
          </div>
          <h3 class="practice-card__title">{{ entry.title }}</h3>
          <p class="practice-card__desc">{{ entry.description }}</p>
          <a-button
            class="practice-card__button"
            :type="entry.buttonType"
            :style="buttonStyleForCard(entry)"
            @click.stop="openPracticeModal(entry.id)"
          >
            {{ entry.cta }}
          </a-button>
        </a-card>
      </div>

      <a-card :title="mockPracticeMeta.practiceSection.recordsTitle" :bordered="false" class="records-card">
        <template #title>
          <span class="records-card__title">
            <i class="mdi mdi-history" aria-hidden="true"></i>
            {{ mockPracticeMeta.practiceSection.recordsTitle }}
          </span>
        </template>
        <div class="records-toolbar">
          <a-input
            v-model:value="practiceFilters.keyword"
            :placeholder="mockPracticeMeta.practiceSection.keywordPlaceholder"
            class="records-toolbar__search"
          />
          <a-select
            v-model:value="practiceFilters.type"
            :placeholder="mockPracticeMeta.practiceSection.typePlaceholder"
            allow-clear
            class="records-toolbar__select"
          >
            <a-select-option
              v-for="option in mockPracticeMeta.practiceFilters.typeOptions"
              :key="`practice-type-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select
            v-model:value="practiceFilters.status"
            :placeholder="mockPracticeMeta.practiceSection.statusPlaceholder"
            allow-clear
            class="records-toolbar__select"
          >
            <a-select-option
              v-for="option in mockPracticeMeta.practiceFilters.statusOptions"
              :key="`practice-status-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select
            v-model:value="practiceFilters.range"
            :placeholder="mockPracticeMeta.practiceSection.rangePlaceholder"
            allow-clear
            class="records-toolbar__select"
          >
            <a-select-option
              v-for="option in mockPracticeMeta.practiceFilters.rangeOptions"
              :key="`practice-range-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-button
            type="text"
            class="records-toolbar__refresh"
            aria-label="刷新"
            @click="resetPracticeFilters"
          >
            <i class="mdi mdi-refresh" aria-hidden="true"></i>
          </a-button>
        </div>

        <a-table
          :columns="practiceColumns"
          :data-source="visiblePracticeRecords"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 1080 }"
          :row-class-name="practiceRowClass"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="record.typeColor" class="type-tag">
                <i class="mdi" :class="practiceTypeIcon(record.typeValue)" aria-hidden="true"></i>
                {{ record.type }}
              </a-tag>
            </template>

            <template v-else-if="column.key === 'mentor'">
              <div class="mentor-cell">
                <div>{{ record.mentor }}</div>
                <span>{{ record.mentorMeta }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'hours'">
              <span class="hours-cell">{{ record.hours }}</span>
            </template>

            <template v-else-if="column.key === 'feedback'">
              <div class="feedback-cell">
                <div>{{ record.feedback }}</div>
                <span>{{ record.feedbackHint }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-button
                v-if="record.statusValue === 'completed'"
                type="link"
                size="small"
                @click="openFeedbackDetail(record)"
              >
                <i class="mdi mdi-comment-check" style="margin-right: 4px"></i>查看反馈
              </a-button>
              <a-button
                v-else
                type="link"
                size="small"
                @click="openApplicationDetail(record)"
              >
                <i class="mdi mdi-eye" style="margin-right: 4px"></i>查看申请
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>

    </OsgPageContainer>

    <a-modal
      v-model:open="practiceModalOpen"
      :title="practiceModalTitle"
      :width="560"
      :footer="null"
      :wrap-class-name="`modal-accent ${practiceModalToneClass}`"
      @cancel="closePracticeModal"
    >
      <div class="practice-dialog__summary-card">
        <div class="practice-dialog__summary-badge" :style="{ background: selectedPracticeCard?.gradient }">
          {{ selectedPracticeCard?.badge }}
        </div>
        <div class="practice-dialog__summary-copy">
          <strong>{{ selectedPracticeCard?.title }}</strong>
          <p>{{ selectedPracticeCard?.description }}</p>
        </div>
      </div>

      <div
        class="modal-note"
        :class="`modal-note--${practiceDialogConfig.noteTone}`"
        style="margin: 16px 0"
      >
        <strong>{{ practiceDialogConfig.noteTitle }}</strong>
        <p>{{ practiceDialogConfig.noteText }}</p>
      </div>

      <div v-if="currentPracticeModal === 'mock'" class="modal-stack">
        <section class="practice-dialog__section">
          <div class="practice-dialog__section-label">申请信息</div>
          <a-form layout="vertical">
            <a-form-item label="你为什么要做模拟面试？">
              <a-textarea
                v-model:value="practiceForm.reason"
                :rows="3"
                placeholder="请描述您申请模拟面试的原因，例如：即将参加某公司面试、希望提升面试技巧等..."
              />
            </a-form-item>
            <a-form-item label="需要几位导师？">
              <a-select v-model:value="practiceForm.mentorCount" placeholder="请选择">
                <a-select-option
                  v-for="option in mockPracticeMeta.practiceForm.mentorCountOptions"
                  :key="`mentor-count-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </section>

        <section class="practice-dialog__section">
          <div class="practice-dialog__section-label">导师偏好</div>
          <a-form layout="vertical">
            <a-form-item label="意向导师 (选填)">
              <a-input
                v-model:value="practiceForm.preferredMentor"
                placeholder="如有特别想要的导师，请填写导师姓名"
              />
            </a-form-item>
            <a-form-item label="排除导师 (选填)" class="practice-dialog__form-item-last">
              <a-input
                v-model:value="practiceForm.excludedMentor"
                placeholder="如有不希望分配的导师，请填写导师姓名"
              />
            </a-form-item>
          </a-form>
        </section>
      </div>

      <div v-else class="modal-stack">
        <section class="practice-dialog__section">
          <div class="practice-dialog__section-label">补充说明</div>
          <a-form layout="vertical">
            <a-form-item label="备注说明 (选填)" class="practice-dialog__form-item-last">
              <a-textarea
                v-model:value="practiceForm.remark"
                :rows="4"
                placeholder="如有特殊需求或说明，请在此填写..."
              />
            </a-form-item>
          </a-form>
        </section>
      </div>

      <div class="practice-dialog__footer" style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 12px">
        <a-button @click="closePracticeModal">取消</a-button>
        <a-button
          type="primary"
          :loading="practiceSubmitting"
          @click="submitPracticeRequest"
        >
          提交申请
        </a-button>
      </div>
    </a-modal>

    <a-modal
      v-model:open="applicationDetailOpen"
      title="申请详情"
      :width="540"
      :footer="null"
      wrap-class-name="modal-accent"
      @cancel="closeApplicationDetail"
    >
      <div v-if="selectedRecord" class="application-detail">
        <div class="application-detail__header">
          <div>
            <div class="application-detail__title">{{ selectedRecord.type }}</div>
            <div class="application-detail__sub">申请ID: {{ selectedRecord.id }}</div>
          </div>
          <a-tag :color="selectedRecord.statusColor">{{ selectedRecord.status }}</a-tag>
        </div>

        <div class="application-detail__grid">
          <div class="application-detail__field">
            <div class="application-detail__field-label">申请时间</div>
            <div class="application-detail__field-value">{{ selectedRecord.appliedAt || '-' }}</div>
          </div>
          <div class="application-detail__field">
            <div class="application-detail__field-label">预约时间</div>
            <div class="application-detail__field-value">{{ selectedRecord.scheduledAt || '待安排' }}</div>
          </div>
          <div class="application-detail__field">
            <div class="application-detail__field-label">分配导师</div>
            <div class="application-detail__field-value">
              {{ selectedRecord.assignedMentors || selectedRecord.mentor || '待分配' }}
            </div>
          </div>
          <div class="application-detail__field">
            <div class="application-detail__field-label">导师数量</div>
            <div class="application-detail__field-value">
              {{ selectedRecord.mentorCount ? `${selectedRecord.mentorCount}位` : '-' }}
            </div>
          </div>
        </div>

        <div class="application-detail__reason">
          <div class="application-detail__field-label">申请内容</div>
          <p>{{ selectedRecord.requestReason || selectedRecord.content || '暂无补充说明。' }}</p>
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <a-button @click="closeApplicationDetail">关闭</a-button>
      </div>
    </a-modal>

    <a-modal
      v-model:open="feedbackDetailOpen"
      title="导师反馈"
      :width="640"
      :footer="null"
      wrap-class-name="modal-accent modal-accent--green"
      @cancel="closeFeedbackDetail"
    >
      <div v-if="selectedRecord" class="feedback-detail">
        <div class="feedback-detail__header">
          <div>
            <div class="feedback-detail__title">{{ selectedRecord.type }}</div>
            <div class="feedback-detail__sub">
              {{ selectedRecord.appliedAt || '-' }}
              <template v-if="selectedRecord.mentor"> · 导师：{{ selectedRecord.mentor }}</template>
            </div>
          </div>
          <a-tag :color="selectedRecord.statusColor">{{ selectedRecord.status }}</a-tag>
        </div>

        <div v-if="typeof selectedRecord.feedbackRating === 'number'" class="feedback-detail__rating">
          <div class="feedback-detail__rating-score">
            <strong>{{ selectedRecord.feedbackRating }}</strong>
            <span>/ {{ selectedRecord.feedbackRatingMax || 5 }} 分</span>
          </div>
          <div class="feedback-detail__rating-divider"></div>
          <div class="feedback-detail__rating-copy">
            <div class="feedback-detail__rating-label">{{ selectedRecord.feedbackRatingLabel || '已评分' }}</div>
            <div class="feedback-detail__rating-hint">{{ selectedRecord.feedbackHint }}</div>
          </div>
        </div>

        <section v-if="selectedRecord.feedbackDetail || selectedRecord.feedback" class="feedback-detail__section">
          <div class="feedback-detail__section-title">
            <i class="mdi mdi-comment-text" aria-hidden="true"></i>详细反馈
          </div>
          <p>{{ selectedRecord.feedbackDetail || selectedRecord.feedback }}</p>
        </section>

        <section v-if="selectedRecord.feedbackImprovements" class="feedback-detail__section feedback-detail__section--amber">
          <div class="feedback-detail__section-title">
            <i class="mdi mdi-lightbulb" aria-hidden="true"></i>改进建议
          </div>
          <p style="white-space: pre-line">{{ selectedRecord.feedbackImprovements }}</p>
        </section>

        <div v-if="selectedRecord.mentorRecommendation" class="feedback-detail__recommendation">
          <i class="mdi mdi-check-circle" aria-hidden="true"></i>
          <span>{{ selectedRecord.mentorRecommendation }}</span>
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <a-button @click="closeFeedbackDetail">关闭</a-button>
      </div>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentMockPracticeMeta,
  createStudentPracticeRequest,
  getStudentMockPracticeOverview,
  type StudentMockPracticeCard,
  type StudentMockPracticeMeta,
  type StudentPracticeRecord
} from '@osg/shared/api'

type PracticeModalKey = string

const practiceColumns = [
  { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '申请内容', dataIndex: 'content', key: 'content', width: 180 },
  { title: '申请时间', dataIndex: 'appliedAt', key: 'appliedAt', width: 140 },
  { title: '导师', dataIndex: 'mentor', key: 'mentor', width: 180 },
  { title: '已上课时', dataIndex: 'hours', key: 'hours', width: 110 },
  { title: '课程反馈', dataIndex: 'feedback', key: 'feedback', width: 220 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const }
]

const practiceFilters = ref({
  keyword: '',
  type: undefined as string | undefined,
  status: undefined as string | undefined,
  range: undefined as string | undefined
})

const practiceModalOpen = ref(false)
const currentPracticeModal = ref<PracticeModalKey | null>(null)
const practiceSubmitting = ref(false)
const practiceRecords = ref<StudentPracticeRecord[]>([])
const applicationDetailOpen = ref(false)
const feedbackDetailOpen = ref(false)
const selectedRecord = ref<StudentPracticeRecord | null>(null)

const openApplicationDetail = (record: StudentPracticeRecord) => {
  selectedRecord.value = record
  applicationDetailOpen.value = true
}

const closeApplicationDetail = () => {
  applicationDetailOpen.value = false
  selectedRecord.value = null
}

const openFeedbackDetail = (record: StudentPracticeRecord) => {
  selectedRecord.value = record
  feedbackDetailOpen.value = true
}

const closeFeedbackDetail = () => {
  feedbackDetailOpen.value = false
  selectedRecord.value = null
}
const mockPracticeMeta = ref<StudentMockPracticeMeta>({
  pageSummary: {
    titleZh: '',
    titleEn: '',
    subtitle: ''
  },
  practiceSection: {
    recordsTitle: '',
    keywordPlaceholder: '',
    typePlaceholder: '',
    statusPlaceholder: '',
    rangePlaceholder: ''
  },
  practiceCards: [],
  practiceFilters: {
    typeOptions: [],
    statusOptions: [],
    rangeOptions: []
  },
  practiceForm: {
    mentorCountOptions: []
  },
  requestSection: {
    titleZh: '',
    titleEn: '',
    subtitle: '',
    heroTitle: '',
    heroSubtitle: '',
    actionButtonText: '',
    tableTitle: '',
    keywordPlaceholder: '',
    typePlaceholder: '',
    statusPlaceholder: '',
    modalTitle: ''
  },
  requestTabs: [],
  requestFilters: {
    typeOptions: [],
    statusOptions: []
  },
  requestCourseOptions: [],
  requestForm: {
    companyOptions: [],
    jobStatusOptions: []
  }
})

const practiceForm = ref({
  reason: '',
  mentorCount: undefined as string | undefined,
  preferredMentor: '',
  excludedMentor: '',
  remark: ''
})

const selectedPracticeCard = computed<StudentMockPracticeCard | null>(() =>
  mockPracticeMeta.value.practiceCards.find((entry) => entry.id === currentPracticeModal.value) ?? null
)

const practiceModalTitle = computed(() => {
  return selectedPracticeCard.value?.modalTitle ?? ''
})

const practiceDialogConfig = computed(() => {
  if (currentPracticeModal.value === 'networking') {
    return {
      icon: 'mdi-account-group',
      subtitle: '由班主任统一分配导师并安排软技能考核',
      noteTone: 'amber',
      noteTitle: '测试说明',
      noteText: '人际关系测试将由班主任直接分配导师，测试内容包括邮件沟通、电话礼仪、自我介绍等职场软技能。',
      actionClass: 'practice-dialog__submit practice-dialog__submit--amber'
    }
  }

  if (currentPracticeModal.value === 'midterm') {
    return {
      icon: 'mdi-school',
      subtitle: '阶段性知识检测将结合当前学习进度安排考核',
      noteTone: 'violet',
      noteTitle: '考试说明',
      noteText: '期中考试是阶段性知识检测，由班主任直接分配导师进行考核，考核内容根据您的学习进度而定。',
      actionClass: 'practice-dialog__submit practice-dialog__submit--violet'
    }
  }

  return {
    icon: 'mdi-account-voice',
    subtitle: '提交申请后，班主任会尽快协助安排合适导师',
    noteTone: 'blue',
    noteTitle: '安排说明',
    noteText: '模拟面试会根据您的目标公司、轮次和准备状态安排导师，请尽量补充完整背景信息以便更精准地分配。',
    actionClass: 'practice-dialog__submit practice-dialog__submit--blue'
  }
})

const visiblePracticeRecords = computed(() => {
  const keyword = practiceFilters.value.keyword.trim().toLowerCase()

  return practiceRecords.value.filter((record) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [record.type, record.content, record.mentor].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    const matchesType =
      !practiceFilters.value.type || record.typeValue === practiceFilters.value.type
    const matchesStatus =
      matchesPracticeStatus(record.statusValue, practiceFilters.value.status)
    const matchesRange = isWithinSelectedRange(record.submittedAtValue, practiceFilters.value.range)

    return matchesKeyword && matchesType && matchesStatus && matchesRange
  })
})

const PRACTICE_ICON_MAP: Record<string, string> = {
  mock: 'mdi-account-voice',
  networking: 'mdi-account-group',
  midterm: 'mdi-file-document-edit'
}

const practiceCardIcon = (id: string) => PRACTICE_ICON_MAP[id] || 'mdi-clipboard-text-outline'

const practiceTypeIcon = (typeValue: string) =>
  PRACTICE_ICON_MAP[typeValue] || 'mdi-clipboard-text-outline'

const PRACTICE_ROW_TONE: Record<string, string> = {
  mock: 'practice-row--mock',
  networking: 'practice-row--networking',
  midterm: 'practice-row--midterm'
}

const practiceRowClass = (record: StudentPracticeRecord) =>
  PRACTICE_ROW_TONE[record.typeValue] || ''

const PRACTICE_MODAL_TONE: Record<string, string> = {
  mock: '',
  networking: 'modal-accent--orange',
  midterm: 'modal-accent--violet'
}

const practiceModalToneClass = computed(() =>
  PRACTICE_MODAL_TONE[currentPracticeModal.value || 'mock'] ?? ''
)

const buttonStyleForCard = (entry: StudentMockPracticeCard) => {
  if (entry.buttonType === 'default' && entry.buttonColor) {
    return {
      borderColor: entry.buttonColor,
      color: entry.buttonColor
    }
  }
  return undefined
}

const openPracticeModal = (type: PracticeModalKey) => {
  resetPracticeForm()
  currentPracticeModal.value = type
  practiceModalOpen.value = true
}

const closePracticeModal = () => {
  practiceModalOpen.value = false
  currentPracticeModal.value = null
  resetPracticeForm()
}

const submitPracticeRequest = async () => {
  if (!currentPracticeModal.value || practiceSubmitting.value) {
    return
  }

  const practiceType = currentPracticeModal.value

  if (practiceType === 'mock') {
    if (!practiceForm.value.reason.trim()) {
      message.error('请填写模拟面试申请原因')
      return
    }

    if (!practiceForm.value.mentorCount) {
      message.error('请选择导师数量')
      return
    }
  }

  practiceSubmitting.value = true
  try {
    await createStudentPracticeRequest({
      type: practiceType,
      reason: practiceForm.value.reason,
      mentorCount: practiceForm.value.mentorCount as string,
      preferredMentor: practiceForm.value.preferredMentor,
      excludedMentor: practiceForm.value.excludedMentor,
      remark: practiceForm.value.remark
    })
    practiceModalOpen.value = false
    currentPracticeModal.value = null
    resetPracticeForm()
    await loadPageData()
    if (practiceType === 'mock') {
      message.success('模拟面试申请已提交！班主任将尽快为您安排导师。')
      return
    }

    message.success('申请已提交！班主任将为您分配导师。')
  } catch {
    return
  } finally {
    practiceSubmitting.value = false
  }
}

const loadPageData = async () => {
  const [overview, meta] = await Promise.all([
    getStudentMockPracticeOverview(),
    getStudentMockPracticeMeta()
  ])
  practiceRecords.value = overview.practiceRecords
  mockPracticeMeta.value = meta
}

const resetPracticeForm = () => {
  practiceForm.value = {
    reason: '',
    mentorCount: undefined,
    preferredMentor: '',
    excludedMentor: '',
    remark: ''
  }
}

const resetPracticeFilters = () => {
  practiceFilters.value = {
    keyword: '',
    type: undefined,
    status: undefined,
    range: undefined
  }
}

const matchesPracticeStatus = (recordStatusValue: string, selectedStatus: string | undefined) => {
  if (!selectedStatus) {
    return true
  }

  if (selectedStatus === 'pending') {
    return recordStatusValue === 'pending'
  }

  if (selectedStatus === 'ongoing') {
    return ['assigned', 'coaching', 'ongoing'].includes(recordStatusValue)
  }

  if (selectedStatus === 'completed') {
    return recordStatusValue === 'completed'
  }

  return recordStatusValue === selectedStatus
}

const parseDateTime = (value: string) => {
  if (!value) {
    return null
  }

  const normalized = value.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const isWithinSelectedRange = (submittedAtValue: string, range: string | undefined) => {
  if (!range || range === 'all') {
    return true
  }

  const submittedAt = parseDateTime(submittedAtValue)
  if (!submittedAt) {
    return true
  }

  const now = new Date()
  const diffMs = now.getTime() - submittedAt.getTime()
  const oneDayMs = 24 * 60 * 60 * 1000

  if (range === 'week') {
    return diffMs <= oneDayMs * 7
  }

  if (range === 'month') {
    return diffMs <= oneDayMs * 31
  }

  return true
}

async function bootstrapPage() {
  try {
    await loadPageData()
    resetPracticeForm()
  } catch {
    return
  }
}

onMounted(() => {
  void bootstrapPage()
})
</script>

<style scoped lang="scss">
.mock-practice-page {
  :deep(.osg-page-container__content) {
    background: transparent;
    padding: 0;
    border-radius: 0;
  }

  .page-subtitle {
    margin: -8px 0 24px;
    color: #6b7280;
    font-size: 14px;
  }

  .practice-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .practice-card {
    border-radius: 20px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 40px rgba(15, 23, 42, 0.12);
    }

    :deep(.ant-card-body) {
      padding: 28px;
      text-align: center;
    }
  }

  .practice-card__icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.08em;

    .mdi {
      font-size: 32px;
      line-height: 1;
    }
  }

  .practice-card__title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
  }

  .practice-card__desc {
    min-height: 40px;
    margin: 0 0 18px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
  }

  .practice-card__button {
    min-width: 144px;
    height: 38px;
    border-radius: 999px;
  }

  .records-card {
    border-radius: 20px;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
  }

  .records-card__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #0f172a;
    font-weight: 600;

    .mdi {
      color: var(--primary);
      font-size: 18px;
    }
  }

  .type-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;

    .mdi {
      font-size: 14px;
    }
  }

  // === 行底色：根据 typeValue 区分（原型 page-mock-practice 行 #F0F9FF / #FFFBEB / #F3E8FF） ===
  :deep(.ant-table-tbody) > tr.practice-row--mock > td {
    background: #f0f9ff;
  }

  :deep(.ant-table-tbody) > tr.practice-row--mock:hover > td {
    background: #e0f2fe;
  }

  :deep(.ant-table-tbody) > tr.practice-row--networking > td {
    background: #fffbeb;
  }

  :deep(.ant-table-tbody) > tr.practice-row--networking:hover > td {
    background: #fef3c7;
  }

  :deep(.ant-table-tbody) > tr.practice-row--midterm > td {
    background: #f3e8ff;
  }

  :deep(.ant-table-tbody) > tr.practice-row--midterm:hover > td {
    background: #e9d5ff;
  }

  .records-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .records-toolbar__search {
    width: 160px;
  }

  .records-toolbar__select {
    width: 140px;
  }

  .mentor-cell,
  .feedback-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;

    span {
      color: #6b7280;
      font-size: 12px;
    }
  }

  .hours-cell {
    font-weight: 600;
    color: #0f6fb6;
  }

  .modal-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .practice-dialog__summary-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px;
    border-radius: 16px;
    background: var(--modal-card-bg);
    border: 1px solid var(--modal-card-border);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .practice-dialog__summary-badge {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(135deg, var(--modal-header-from), var(--modal-header-to));
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  .practice-dialog__summary-copy {
    strong {
      display: block;
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 15px;
    }

    p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  .practice-dialog__section {
    padding: 18px;
    border-radius: 16px;
    background: var(--modal-card-bg);
    border: 1px solid var(--modal-card-border);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .practice-dialog__section-label {
    margin-bottom: 14px;
    color: var(--modal-accent);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .practice-dialog__form-item-last {
    margin-bottom: 0;
  }

  .modal-note {
    border-radius: 16px;
    padding: 16px 18px;
    background: var(--modal-card-bg);
    border: 1px solid var(--modal-card-border);

    strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    p {
      margin: 0;
      line-height: 1.6;
      font-size: 13px;
    }
  }

  .modal-note--blue {
    color: var(--modal-accent);
  }

  .modal-note--amber {
    color: var(--modal-accent);
  }

  .modal-note--violet {
    color: var(--modal-accent);
  }

  .application-detail__header,
  .feedback-detail__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f1f5f9;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .application-detail__title,
  .feedback-detail__title {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
  }

  .application-detail__sub,
  .feedback-detail__sub {
    margin-top: 4px;
    font-size: 12px;
    color: #64748b;
  }

  .application-detail__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .application-detail__field {
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .application-detail__field-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }

  .application-detail__field-value {
    font-weight: 600;
    color: #0f172a;
  }

  .application-detail__reason {
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;

    p {
      margin: 8px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #1e293b;
    }
  }

  .feedback-detail__rating {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;
    padding: 20px;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    border-radius: 12px;
    color: #166534;

    strong {
      font-size: 40px;
      font-weight: 700;
    }

    span {
      font-size: 13px;
    }
  }

  .feedback-detail__rating-divider {
    width: 1px;
    height: 48px;
    background: #86efac;
  }

  .feedback-detail__rating-label {
    font-size: 16px;
    font-weight: 600;
  }

  .feedback-detail__rating-hint {
    margin-top: 4px;
    font-size: 12px;
  }

  .feedback-detail__section {
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 12px;
    background: #fafafa;

    p {
      margin: 8px 0 0;
      font-size: 14px;
      line-height: 1.7;
      color: #1e293b;
    }
  }

  .feedback-detail__section--amber {
    background: #fef3c7;
    border-color: #fde68a;
    color: #92400e;
  }

  .feedback-detail__section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #0f172a;

    .mdi {
      color: inherit;
    }
  }

  .feedback-detail__recommendation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: #dcfce7;
    color: #166534;
    border-radius: 10px;
    font-weight: 600;

    .mdi {
      font-size: 20px;
    }
  }
}

@media (max-width: 1200px) {
  .mock-practice-page {
    .practice-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 768px) {
  .mock-practice-page {
    .practice-dialog__summary-card {
      align-items: flex-start;
    }

    .records-toolbar__search,
    .records-toolbar__select {
      width: 100%;
    }
  }
}
</style>
