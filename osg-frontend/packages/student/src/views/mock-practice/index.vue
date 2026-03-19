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
            {{ entry.badge }}
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
        </div>

        <a-table
          :columns="practiceColumns"
          :data-source="visiblePracticeRecords"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 1080 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="record.typeColor">{{ record.type }}</a-tag>
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
          </template>
        </a-table>
      </a-card>

      <section class="request-section">
        <div class="request-header">
          <div>
            <h2 class="request-header__title">
              {{ mockPracticeMeta.requestSection.titleZh }} / {{ mockPracticeMeta.requestSection.titleEn }}
            </h2>
            <p class="request-header__subtitle">{{ mockPracticeMeta.requestSection.subtitle }}</p>
          </div>
        </div>

        <div class="action-hero">
          <div class="action-hero__copy">
            <h3>{{ mockPracticeMeta.requestSection.heroTitle }}</h3>
            <p>{{ mockPracticeMeta.requestSection.heroSubtitle }}</p>
          </div>
          <a-button type="primary" size="large" @click="openRequestModal">
            {{ mockPracticeMeta.requestSection.actionButtonText }}
          </a-button>
        </div>

        <a-card :title="mockPracticeMeta.requestSection.tableTitle" :bordered="false" class="request-card">
          <a-tabs v-model:activeKey="activeRequestTab" class="request-tabs">
            <a-tab-pane
              v-for="tab in mockPracticeMeta.requestTabs"
              :key="tab.key"
              :tab="`${tab.label} ${tab.count}`"
            />
          </a-tabs>

          <div class="request-toolbar">
            <a-input
              v-model:value="requestFilters.keyword"
              :placeholder="mockPracticeMeta.requestSection.keywordPlaceholder"
              class="request-toolbar__search"
            />
            <a-select
              v-model:value="requestFilters.type"
              :placeholder="mockPracticeMeta.requestSection.typePlaceholder"
              allow-clear
              class="request-toolbar__select"
            >
              <a-select-option
                v-for="option in mockPracticeMeta.requestFilters.typeOptions"
                :key="`request-type-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
            <a-select
              v-model:value="requestFilters.status"
              :placeholder="mockPracticeMeta.requestSection.statusPlaceholder"
              allow-clear
              class="request-toolbar__select"
            >
              <a-select-option
                v-for="option in mockPracticeMeta.requestFilters.statusOptions"
                :key="`request-status-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>

          <a-table
            :columns="requestColumns"
            :data-source="visibleRequestRecords"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 920 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="record.typeColor">{{ record.type }}</a-tag>
              </template>

              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.statusColor">{{ record.status }}</a-tag>
              </template>

              <template v-else-if="column.key === 'actions'">
                <a-button size="small">查看</a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </section>
    </OsgPageContainer>

    <a-modal
      v-model:open="practiceModalOpen"
      :title="practiceModalTitle"
      ok-text="提交申请"
      cancel-text="取消"
      @ok="submitPracticeRequest"
      @cancel="closePracticeModal"
    >
      <div v-if="currentPracticeModal === 'mock'" class="modal-stack">
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
          <a-form-item label="意向导师 (选填)">
            <a-input
              v-model:value="practiceForm.preferredMentor"
              placeholder="如有特别想要的导师，请填写导师姓名"
            />
          </a-form-item>
          <a-form-item label="排除导师 (选填)">
            <a-input
              v-model:value="practiceForm.excludedMentor"
              placeholder="如有不希望分配的导师，请填写导师姓名"
            />
          </a-form-item>
        </a-form>
      </div>

      <div v-else-if="currentPracticeModal === 'networking'" class="modal-stack">
        <div class="modal-note modal-note--amber">
          <strong>测试说明</strong>
          <p>人际关系测试将由班主任直接分配导师，测试内容包括邮件沟通、电话礼仪、自我介绍等职场软技能。</p>
        </div>
        <a-form layout="vertical">
          <a-form-item label="备注说明 (选填)">
            <a-textarea
              v-model:value="practiceForm.remark"
              :rows="3"
              placeholder="如有特殊需求或说明，请在此填写..."
            />
          </a-form-item>
        </a-form>
      </div>

      <div v-else-if="currentPracticeModal === 'midterm'" class="modal-stack">
        <div class="modal-note modal-note--violet">
          <strong>考试说明</strong>
          <p>期中考试是阶段性知识检测，由班主任直接分配导师进行考核，考核内容根据您的学习进度而定。</p>
        </div>
        <a-form layout="vertical">
          <a-form-item label="备注说明 (选填)">
            <a-textarea
              v-model:value="practiceForm.remark"
              :rows="3"
              placeholder="如有特殊需求或说明，请在此填写..."
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <a-modal
      v-model:open="requestModalOpen"
      :title="mockPracticeMeta.requestSection.modalTitle"
      ok-text="提交申请"
      cancel-text="取消"
      width="720px"
      @ok="submitRequest"
      @cancel="closeRequestModal"
    >
      <div class="modal-stack">
        <div class="request-course-grid">
          <button
            v-for="option in mockPracticeMeta.requestCourseOptions"
            :key="option.value"
            type="button"
            class="course-type-option"
            :class="{ 'course-type-option--active': requestForm.courseType === option.value }"
            @click="requestForm.courseType = option.value"
          >
            <span class="course-type-option__badge" :style="{ background: option.gradient }">
              {{ option.badge }}
            </span>
            <span>{{ option.label }}</span>
          </button>
        </div>

        <a-form layout="vertical">
          <a-form-item label="目标公司">
            <a-select v-model:value="requestForm.company" placeholder="请选择公司">
              <a-select-option
                v-for="option in mockPracticeMeta.requestForm.companyOptions"
                :key="`request-company-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="当前状态">
            <a-select v-model:value="requestForm.status" placeholder="请选择状态">
              <a-select-option
                v-for="option in mockPracticeMeta.requestForm.jobStatusOptions"
                :key="`request-job-status-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="备注说明">
            <a-textarea
              v-model:value="requestForm.remark"
              :rows="3"
              placeholder="如有其他需求请在此说明"
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  createStudentClassRequest,
  getStudentMockPracticeMeta,
  createStudentPracticeRequest,
  getStudentMockPracticeOverview,
  type StudentMockPracticeCard,
  type StudentMockPracticeMeta,
  type StudentClassRequestRecord,
  type StudentPracticeRecord
} from '@osg/shared/api'

type PracticeModalKey = string
type RequestTabKey = 'all' | 'processing' | 'completed'

const practiceColumns = [
  { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '申请内容', dataIndex: 'content', key: 'content', width: 180 },
  { title: '申请时间', dataIndex: 'appliedAt', key: 'appliedAt', width: 140 },
  { title: '导师', dataIndex: 'mentor', key: 'mentor', width: 180 },
  { title: '已上课时', dataIndex: 'hours', key: 'hours', width: 110 },
  { title: '课程反馈', dataIndex: 'feedback', key: 'feedback', width: 220 }
]

const requestColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 140 },
  { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 160 },
  { title: '操作', key: 'actions', width: 100 }
]

const practiceFilters = ref({
  keyword: '',
  type: undefined as string | undefined,
  status: undefined as string | undefined,
  range: undefined as string | undefined
})

const requestFilters = ref({
  keyword: '',
  type: undefined as string | undefined,
  status: undefined as string | undefined
})

const practiceModalOpen = ref(false)
const currentPracticeModal = ref<PracticeModalKey | null>(null)
const requestModalOpen = ref(false)
const activeRequestTab = ref<RequestTabKey>('all')
const practiceSubmitting = ref(false)
const classSubmitting = ref(false)
const practiceRecords = ref<StudentPracticeRecord[]>([])
const requestRecords = ref<StudentClassRequestRecord[]>([])
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
  mentorCount: '2位导师',
  preferredMentor: '',
  excludedMentor: '',
  remark: ''
})

const requestForm = ref({
  courseType: 'interview',
  company: undefined as string | undefined,
  status: undefined as string | undefined,
  remark: ''
})

const selectedPracticeCard = computed<StudentMockPracticeCard | null>(() =>
  mockPracticeMeta.value.practiceCards.find((entry) => entry.id === currentPracticeModal.value) ?? null
)

const practiceModalTitle = computed(() => {
  return selectedPracticeCard.value?.modalTitle ?? ''
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
      !practiceFilters.value.status || record.statusValue === practiceFilters.value.status
    const matchesRange = isWithinSelectedRange(record.submittedAtValue, practiceFilters.value.range)

    return matchesKeyword && matchesType && matchesStatus && matchesRange
  })
})

const visibleRequestRecords = computed(() => {
  const keyword = requestFilters.value.keyword.trim().toLowerCase()

  return requestRecords.value.filter((record) => {
    const matchesTab =
      activeRequestTab.value === 'all' ||
      (activeRequestTab.value === 'processing' && record.statusValue === 'Processing') ||
      (activeRequestTab.value === 'completed' && record.statusValue === 'Completed')
    const matchesKeyword =
      keyword.length === 0 ||
      [record.company, record.type, record.id].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    const matchesType =
      !requestFilters.value.type || record.typeValue === requestFilters.value.type
    const matchesStatus =
      !requestFilters.value.status || record.statusValue === requestFilters.value.status

    return matchesTab && matchesKeyword && matchesType && matchesStatus
  })
})

const defaultMentorCount = computed(() =>
  mockPracticeMeta.value.practiceForm.mentorCountOptions.find((option) => option.value === '2位导师')?.value ??
  mockPracticeMeta.value.practiceForm.mentorCountOptions[0]?.value ??
  '2位导师'
)

const defaultCourseType = computed(() =>
  mockPracticeMeta.value.requestCourseOptions[0]?.value ?? 'interview'
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

const openRequestModal = () => {
  resetRequestForm()
  requestModalOpen.value = true
}

const closeRequestModal = () => {
  requestModalOpen.value = false
  resetRequestForm()
}

const submitPracticeRequest = async () => {
  if (!currentPracticeModal.value || practiceSubmitting.value) {
    return
  }

  practiceSubmitting.value = true
  try {
    await createStudentPracticeRequest({
      type: currentPracticeModal.value,
      reason: practiceForm.value.reason,
      mentorCount: practiceForm.value.mentorCount,
      preferredMentor: practiceForm.value.preferredMentor,
      excludedMentor: practiceForm.value.excludedMentor,
      remark: practiceForm.value.remark
    })
    practiceModalOpen.value = false
    currentPracticeModal.value = null
    resetPracticeForm()
    await loadPageData()
    message.success('申请提交成功')
  } finally {
    practiceSubmitting.value = false
  }
}

const submitRequest = async () => {
  if (classSubmitting.value) {
    return
  }

  if (!requestForm.value.company || !requestForm.value.status) {
    message.error('请完整填写目标公司和当前状态')
    return
  }

  classSubmitting.value = true
  try {
    await createStudentClassRequest({
      courseType: requestForm.value.courseType,
      company: requestForm.value.company,
      status: requestForm.value.status,
      remark: requestForm.value.remark
    })
    requestModalOpen.value = false
    resetRequestForm()
    await loadPageData()
    message.success('课程申请已提交')
  } finally {
    classSubmitting.value = false
  }
}

const loadPageData = async () => {
  const [overview, meta] = await Promise.all([
    getStudentMockPracticeOverview(),
    getStudentMockPracticeMeta()
  ])
  practiceRecords.value = overview.practiceRecords
  requestRecords.value = overview.requestRecords
  mockPracticeMeta.value = meta
}

const resetPracticeForm = () => {
  practiceForm.value = {
    reason: '',
    mentorCount: defaultMentorCount.value,
    preferredMentor: '',
    excludedMentor: '',
    remark: ''
  }
}

const resetRequestForm = () => {
  requestForm.value = {
    courseType: defaultCourseType.value,
    company: undefined,
    status: undefined,
    remark: ''
  }
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

onMounted(() => {
  void loadPageData().then(() => {
    resetPracticeForm()
    resetRequestForm()
  })
})
</script>

<style scoped lang="scss">
.mock-practice-page {
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

  .records-card,
  .request-card {
    border-radius: 20px;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
  }

  .records-toolbar,
  .request-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .records-toolbar__search,
  .request-toolbar__search {
    width: 160px;
  }

  .records-toolbar__select,
  .request-toolbar__select {
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

  .request-section {
    margin-top: 32px;
  }

  .request-header {
    margin-bottom: 16px;
  }

  .request-header__title {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 600;
    color: #0f172a;
  }

  .request-header__subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .action-hero {
    margin-bottom: 20px;
    padding: 24px 28px;
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: linear-gradient(135deg, #eff6ff, #eef2ff);
    border: 1px solid #dbeafe;
  }

  .action-hero__copy {
    h3 {
      margin: 0 0 6px;
      font-size: 22px;
      color: #0f172a;
    }

    p {
      margin: 0;
      color: #475569;
    }
  }

  .request-tabs {
    margin-bottom: 8px;
  }

  .modal-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-note {
    border-radius: 14px;
    padding: 16px;

    strong {
      display: block;
      margin-bottom: 6px;
    }

    p {
      margin: 0;
      line-height: 1.6;
    }
  }

  .modal-note--amber {
    background: #fef3c7;
    color: #92400e;
  }

  .modal-note--violet {
    background: #f3e8ff;
    color: #6d28d9;
  }

  .request-course-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .course-type-option {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 14px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #93c5fd;
      box-shadow: 0 10px 24px rgba(59, 130, 246, 0.1);
    }
  }

  .course-type-option--active {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .course-type-option__badge {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }
}

@media (max-width: 1200px) {
  .mock-practice-page {
    .practice-grid {
      grid-template-columns: 1fr;
    }

    .request-course-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 768px) {
  .mock-practice-page {
    .action-hero {
      padding: 20px;
      align-items: flex-start;
      flex-direction: column;
    }

    .records-toolbar__search,
    .records-toolbar__select,
    .request-toolbar__search,
    .request-toolbar__select {
      width: 100%;
    }
  }
}
</style>
