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
          <div :class="['practice-card__icon', `practice-card__icon--${entry.id}`]">
            <i class="mdi" :class="practiceCardIcon(entry.id)" aria-hidden="true"></i>
          </div>
          <h3 class="practice-card__title">{{ entry.title }}</h3>
          <p class="practice-card__desc">{{ entry.description }}</p>
          <a-button
            type="primary"
            :class="['practice-card__button', `practice-card__button--${entry.id}`]"
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
      :width="currentPracticeModal === 'mock' ? 620 : 540"
      :footer="null"
      :closable="false"
      :wrap-class-name="`practice-coach-modal ${practiceModalToneClass} osg-modal-form`"
      @cancel="closePracticeModal"
    >
      <!-- ============= 自定义 Header：克制 + 编辑感 ============= -->
      <header class="coach-modal__header">
        <div class="coach-modal__header-orb" aria-hidden="true"></div>
        <div class="coach-modal__header-content">
          <div class="coach-modal__eyebrow">
            <span class="coach-modal__eyebrow-dot"></span>
            <span class="coach-modal__eyebrow-text">{{ coachHeader.eyebrow }}</span>
          </div>
          <h2 class="coach-modal__title">{{ coachHeader.title }}</h2>
          <p class="coach-modal__subtitle">{{ coachHeader.subtitle }}</p>
        </div>
        <button
          class="coach-modal__close"
          type="button"
          aria-label="关闭"
          @click="closePracticeModal"
        >
          <i class="mdi mdi-close" aria-hidden="true"></i>
        </button>
      </header>

      <!-- ============= 面试测试：4 字段编辑稿样式 ============= -->
      <section v-if="currentPracticeModal === 'mock'" class="coach-modal__body">
        <a-form layout="vertical" class="coach-form">
          <a-form-item required class="coach-form__item">
            <template #label>
              <span class="coach-form__label">
                <span class="coach-form__num">01</span>
                <span class="coach-form__label-text">你为什么要做面试测试？</span>
              </span>
            </template>
            <a-textarea
              v-model:value="practiceForm.reason"
              :rows="3"
              placeholder="即将参加某公司的面试 / 希望提升某类问题的应对..."
              :maxlength="300"
              show-count
            />
            <p class="coach-form__hint">
              <i class="mdi mdi-lightbulb-outline" aria-hidden="true"></i>
              说明公司、岗位与紧迫程度，导师能更精准地为你准备。
            </p>
          </a-form-item>

          <a-form-item required class="coach-form__item">
            <template #label>
              <span class="coach-form__label">
                <span class="coach-form__num">02</span>
                <span class="coach-form__label-text">需要几位导师？</span>
              </span>
            </template>
            <a-select
              v-model:value="practiceForm.mentorCount"
              placeholder="选择参与面试的导师人数"
              size="large"
              class="coach-form__select"
            >
              <a-select-option
                v-for="option in mockPracticeMeta.practiceForm.mentorCountOptions"
                :key="`mentor-count-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <div class="coach-form__divider">
            <span class="coach-form__divider-text">Optional · 偏好</span>
          </div>

          <div class="coach-form__row">
            <a-form-item class="coach-form__item">
              <template #label>
                <span class="coach-form__label">
                  <span class="coach-form__num">03</span>
                  <span class="coach-form__label-text">意向导师</span>
                </span>
              </template>
              <a-input
                v-model:value="practiceForm.preferredMentor"
                placeholder="导师姓名"
                size="large"
              />
            </a-form-item>

            <a-form-item class="coach-form__item">
              <template #label>
                <span class="coach-form__label">
                  <span class="coach-form__num">04</span>
                  <span class="coach-form__label-text">排除导师</span>
                </span>
              </template>
              <a-input
                v-model:value="practiceForm.excludedMentor"
                placeholder="导师姓名"
                size="large"
              />
            </a-form-item>
          </div>
        </a-form>
      </section>

      <!-- ============= 人际关系测试 / 期中考试：说明 + 备注 ============= -->
      <section v-else class="coach-modal__body">
        <aside class="coach-callout">
          <div class="coach-callout__rule" aria-hidden="true"></div>
          <div class="coach-callout__copy">
            <div class="coach-callout__title">{{ practiceDialogConfig.noteTitle }}</div>
            <p class="coach-callout__text">{{ practiceDialogConfig.noteText }}</p>
          </div>
        </aside>

        <a-form layout="vertical" class="coach-form">
          <a-form-item class="coach-form__item">
            <template #label>
              <span class="coach-form__label">
                <span class="coach-form__num">01</span>
                <span class="coach-form__label-text">备注说明</span>
                <span class="coach-form__optional">Optional</span>
              </span>
            </template>
            <a-textarea
              v-model:value="practiceForm.remark"
              :rows="4"
              placeholder="如有特殊需求或时间偏好，写在这里..."
              :maxlength="300"
              show-count
            />
          </a-form-item>
        </a-form>
      </section>

      <!-- ============= Footer：教练语气 microcopy ============= -->
      <footer class="coach-modal__footer">
        <p class="coach-modal__footer-microcopy">
          <i class="mdi mdi-clock-outline" aria-hidden="true"></i>
          {{ coachHeader.microcopy }}
        </p>
        <div class="coach-modal__footer-actions">
          <a-button class="coach-btn coach-btn--ghost" @click="closePracticeModal">
            取消
          </a-button>
          <a-button
            type="primary"
            class="coach-btn coach-btn--submit"
            :loading="practiceSubmitting"
            @click="submitPracticeRequest"
          >
            <span>提交申请</span>
            <i class="mdi mdi-arrow-right coach-btn__arrow" aria-hidden="true"></i>
          </a-button>
        </div>
      </footer>
    </a-modal>

    <!-- ============= 申请详情 Coach Card ============= -->
    <a-modal
      v-model:open="applicationDetailOpen"
      :width="560"
      :footer="null"
      :closable="false"
      wrap-class-name="practice-coach-modal practice-coach-modal--detail osg-modal-form"
      @cancel="closeApplicationDetail"
    >
      <header v-if="selectedRecord" class="coach-modal__header">
        <div class="coach-modal__header-orb" aria-hidden="true"></div>
        <div class="coach-modal__header-content">
          <div class="coach-modal__eyebrow coach-modal__eyebrow--quiet">
            <span class="coach-modal__eyebrow-text">APPLICATION RECORD · #{{ selectedRecord.id }}</span>
          </div>
          <h2 class="coach-modal__title">{{ selectedRecord.type }}</h2>
          <p class="coach-modal__subtitle">
            提交于 {{ selectedRecord.appliedAt || '—' }}
            <span class="coach-modal__status-pill" :data-status="selectedRecord.statusValue">
              {{ selectedRecord.status }}
            </span>
          </p>
        </div>
        <button class="coach-modal__close" type="button" aria-label="关闭" @click="closeApplicationDetail">
          <i class="mdi mdi-close" aria-hidden="true"></i>
        </button>
      </header>

      <section v-if="selectedRecord" class="coach-modal__body">
        <div class="coach-meta">
          <div class="coach-meta__cell">
            <div class="coach-meta__label">申请时间</div>
            <div class="coach-meta__value">{{ selectedRecord.appliedAt || '—' }}</div>
          </div>
          <div class="coach-meta__cell">
            <div class="coach-meta__label">预约时间</div>
            <div class="coach-meta__value coach-meta__value--muted">
              {{ selectedRecord.scheduledAt || '待安排' }}
            </div>
          </div>
          <div class="coach-meta__cell">
            <div class="coach-meta__label">分配导师</div>
            <div class="coach-meta__value">
              {{ selectedRecord.assignedMentors || selectedRecord.mentor || '待分配' }}
            </div>
          </div>
          <div class="coach-meta__cell">
            <div class="coach-meta__label">导师数量</div>
            <div class="coach-meta__value">
              <strong>{{ selectedRecord.mentorCount || '—' }}</strong>
              <span v-if="selectedRecord.mentorCount" class="coach-meta__unit">位</span>
            </div>
          </div>
        </div>

        <article class="coach-quote">
          <div class="coach-quote__label">申请内容</div>
          <div class="coach-quote__rule" aria-hidden="true"></div>
          <p class="coach-quote__text">
            {{ selectedRecord.requestReason || selectedRecord.content || '暂无补充说明。' }}
          </p>
        </article>
      </section>

      <footer class="coach-modal__footer coach-modal__footer--single">
        <div class="coach-modal__footer-actions">
          <a-button class="coach-btn coach-btn--ghost" @click="closeApplicationDetail">关闭</a-button>
        </div>
      </footer>
    </a-modal>

    <!-- ============= 导师反馈 Coach Card ============= -->
    <a-modal
      v-model:open="feedbackDetailOpen"
      :width="640"
      :footer="null"
      :closable="false"
      wrap-class-name="practice-coach-modal practice-coach-modal--feedback osg-modal-form"
      @cancel="closeFeedbackDetail"
    >
      <header v-if="selectedRecord" class="coach-modal__header">
        <div class="coach-modal__header-orb" aria-hidden="true"></div>
        <div class="coach-modal__header-content">
          <div class="coach-modal__eyebrow coach-modal__eyebrow--quiet">
            <span class="coach-modal__eyebrow-text">
              MENTOR FEEDBACK<template v-if="selectedRecord.id"> · #{{ selectedRecord.id }}</template>
            </span>
          </div>
          <h2 class="coach-modal__title">
            <template v-if="selectedRecord.mentor">{{ selectedRecord.mentor }} 的反馈</template>
            <template v-else>导师反馈</template>
          </h2>
          <p class="coach-modal__subtitle">
            {{ selectedRecord.type }}
            <template v-if="selectedRecord.appliedAt"> · 完成于 {{ selectedRecord.appliedAt }}</template>
          </p>
        </div>
        <button class="coach-modal__close" type="button" aria-label="关闭" @click="closeFeedbackDetail">
          <i class="mdi mdi-close" aria-hidden="true"></i>
        </button>
      </header>

      <section v-if="selectedRecord" class="coach-modal__body">
        <!-- Hero rating -->
        <div
          v-if="typeof selectedRecord.feedbackRating === 'number'"
          class="coach-rating"
        >
          <div class="coach-rating__score">
            <span class="coach-rating__num">{{ selectedRecord.feedbackRating }}</span>
            <span class="coach-rating__denom">/ {{ selectedRecord.feedbackRatingMax || 5 }}</span>
          </div>
          <div class="coach-rating__divider" aria-hidden="true"></div>
          <div class="coach-rating__copy">
            <div class="coach-rating__label">{{ selectedRecord.feedbackRatingLabel || '已评分' }}</div>
            <div v-if="selectedRecord.feedbackHint" class="coach-rating__hint">
              {{ selectedRecord.feedbackHint }}
            </div>
          </div>
        </div>

        <!-- 详细反馈 -->
        <article
          v-if="selectedRecord.feedbackDetail || selectedRecord.feedback"
          class="coach-section"
        >
          <div class="coach-section__head">
            <i class="mdi mdi-message-text-outline coach-section__icon" aria-hidden="true"></i>
            <span class="coach-section__title">详细反馈</span>
          </div>
          <p class="coach-section__body">
            {{ selectedRecord.feedbackDetail || selectedRecord.feedback }}
          </p>
        </article>

        <!-- 改进建议 -->
        <article
          v-if="selectedRecord.feedbackImprovements"
          class="coach-section coach-section--amber"
        >
          <div class="coach-section__head">
            <i class="mdi mdi-lightbulb-on-outline coach-section__icon" aria-hidden="true"></i>
            <span class="coach-section__title">改进建议</span>
          </div>
          <p class="coach-section__body coach-section__body--preline">
            {{ selectedRecord.feedbackImprovements }}
          </p>
        </article>

        <!-- 推荐 banner -->
        <div
          v-if="selectedRecord.mentorRecommendation"
          class="coach-recommend"
        >
          <i class="mdi mdi-check-decagram coach-recommend__icon" aria-hidden="true"></i>
          <span class="coach-recommend__text">{{ selectedRecord.mentorRecommendation }}</span>
        </div>
      </section>

      <footer class="coach-modal__footer coach-modal__footer--single">
        <div class="coach-modal__footer-actions">
          <a-button class="coach-btn coach-btn--ghost" @click="closeFeedbackDetail">关闭</a-button>
        </div>
      </footer>
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
    noteText: '面试测试会根据您的目标公司、轮次和准备状态安排导师，请尽量补充完整背景信息以便更精准地分配。',
    actionClass: 'practice-dialog__submit practice-dialog__submit--blue'
  }
})

// Editorial-coaching modal header copy（eyebrow / 标题 / 副标题 / 底部 microcopy）
// 按当前弹窗类型动态生成，兜底 'mock'，避免 selectedPracticeCard 为 null 时 header 空白
const COACH_HEADER_MAP: Record<string, {
  eyebrow: string
  title: string
  subtitle: string
  microcopy: string
}> = {
  mock: {
    eyebrow: 'MENTOR SESSION · 面试测试',
    title: '准备好直面面试官了吗？',
    subtitle: '与资深导师 1 对 1 演练，把每一次模拟都变成真实战场的预演。',
    microcopy: '提交后班主任通常 24 小时内回复并安排导师'
  },
  networking: {
    eyebrow: 'SOFT SKILL CHECK · 人际测试',
    title: '检验你的职场沟通力',
    subtitle: '邮件礼仪、电话表达、自我介绍 —— 软技能决定第一印象。',
    microcopy: '班主任将根据排期为你直接分配测试导师'
  },
  midterm: {
    eyebrow: 'PROGRESS REVIEW · 期中考核',
    title: '阶段性知识盘点',
    subtitle: '基于你当前的学习进度，导师会出一份贴合你节奏的检测题。',
    microcopy: '考核安排会与学习节奏匹配，无需提前准备'
  }
}

const coachHeader = computed(() =>
  COACH_HEADER_MAP[currentPracticeModal.value || 'mock'] ?? COACH_HEADER_MAP.mock
)

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
      message.error('请填写面试测试申请原因')
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
      message.success('面试测试申请已提交！班主任将尽快为您安排导师。')
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
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    box-shadow: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      border-color: var(--primary, #7399c6);
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
    }

    :deep(.ant-card-body) {
      padding: 24px;
      text-align: center;
    }
  }

  .practice-card__icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e6f4ff;
    color: #1677ff;

    .mdi {
      font-size: 28px;
      line-height: 1;
    }
  }

  .practice-card__icon--mock       { background: #e6f4ff; color: #1677ff; }
  .practice-card__icon--networking { background: #fff7e6; color: #fa8c16; }
  .practice-card__icon--midterm    { background: #f9f0ff; color: #722ed1; }

  .practice-card__title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .practice-card__desc {
    min-height: 40px;
    margin: 0 0 16px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
    line-height: 1.6;
  }

  .practice-card__button {
    min-width: 128px;
    height: 32px;
    border-radius: 6px;
  }

  .practice-card__button--mock.ant-btn-primary {
    background: #1677ff;
    border-color: #1677ff;

    &:hover,
    &:focus,
    &:active {
      background: #4096ff;
      border-color: #4096ff;
    }
  }

  .practice-card__button--networking.ant-btn-primary {
    background: #fa8c16;
    border-color: #fa8c16;

    &:hover,
    &:focus,
    &:active {
      background: #ffa940;
      border-color: #ffa940;
    }
  }

  .practice-card__button--midterm.ant-btn-primary {
    background: #722ed1;
    border-color: #722ed1;

    &:hover,
    &:focus,
    &:active {
      background: #9254de;
      border-color: #9254de;
    }
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

  // (申请详情 / 导师反馈 弹窗样式已迁移至底部 unscoped 样式块 .practice-coach-modal--detail / --feedback)
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
    .records-toolbar__search,
    .records-toolbar__select {
      width: 100%;
    }
  }
}
</style>

<!-- ============================================================
     Refined Coaching Card —— 模拟应聘 3 个申请弹窗
     (Unscoped because a-modal teleports to document.body,
      where Vue scoped data-v attributes are not inherited
      onto the wrap element.)
     ============================================================ -->
<style lang="scss">
@use 'sass:color';

.practice-coach-modal {
  // 主题色：mock=蓝灰品牌色 / networking=暖琥珀 / midterm=深紫
  --coach-accent: #5a7ba3;
  --coach-accent-soft: #e8f0f8;
  --coach-accent-rim: rgba(115, 153, 198, 0.18);
  --coach-accent-glow: rgba(115, 153, 198, 0.35);
  --coach-ink: #0b1324;
  --coach-ink-soft: #475569;
  --coach-ink-mute: #94a3b8;
  --coach-paper: #fdfdfb;
  --coach-rule: #e8eaef;

  &.modal-accent--orange,
  &.modal-accent--amber {
    --coach-accent: #b45309;
    --coach-accent-soft: #fef3c7;
    --coach-accent-rim: rgba(245, 158, 11, 0.22);
    --coach-accent-glow: rgba(245, 158, 11, 0.4);
  }

  &.modal-accent--violet,
  &.modal-accent--purple {
    --coach-accent: #6d28d9;
    --coach-accent-soft: #f3e8ff;
    --coach-accent-rim: rgba(139, 92, 246, 0.22);
    --coach-accent-glow: rgba(139, 92, 246, 0.4);
  }

  // ---------- 重置 ant-modal 外壳，恢复克制风格 ----------
  .ant-modal-content {
    overflow: hidden;
    padding: 0;
    border-radius: 18px;
    background: var(--coach-paper);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.6) inset,
      0 24px 60px -20px rgba(15, 23, 42, 0.32),
      0 8px 24px -8px rgba(15, 23, 42, 0.18);
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  // ============== Header ==============
  .coach-modal__header {
    position: relative;
    padding: 32px 36px 24px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(248, 250, 252, 0.6) 100%),
      var(--coach-paper);
    border-bottom: 1px solid var(--coach-rule);
    overflow: hidden;
  }

  // 装饰性 radial orb 在右上角，制造 depth 而不是花哨
  .coach-modal__header-orb {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      var(--coach-accent-glow) 0%,
      var(--coach-accent-rim) 40%,
      transparent 70%
    );
    filter: blur(20px);
    pointer-events: none;
    opacity: 0.85;
  }

  .coach-modal__header-content {
    position: relative;
    z-index: 1;
    max-width: calc(100% - 48px);
  }

  // Eyebrow 编辑感小标签
  .coach-modal__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    padding: 5px 12px 5px 9px;
    border-radius: 999px;
    background: var(--coach-accent-soft);
    color: var(--coach-accent);
    font-family: 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.4;
  }

  .coach-modal__eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: coach-orb-pulse 2.4s ease-in-out infinite;
  }

  @keyframes coach-orb-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.7); }
  }

  .coach-modal__title {
    margin: 0 0 8px;
    color: var(--coach-ink);
    font-family: 'PingFang SC', 'Source Han Sans SC', 'HarmonyOS Sans SC',
                 'Microsoft YaHei', system-ui, sans-serif;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.012em;
    line-height: 1.3;
  }

  .coach-modal__subtitle {
    margin: 0;
    color: var(--coach-ink-soft);
    font-size: 13.5px;
    line-height: 1.65;
    max-width: 44ch;
  }

  // 关闭按钮（右上角）
  .coach-modal__close {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 2;
    width: 36px;
    height: 36px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    color: var(--coach-ink-soft);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;

    .mdi {
      font-size: 18px;
      line-height: 1;
    }

    &:hover {
      background: #fff;
      border-color: var(--coach-rule);
      color: var(--coach-ink);
      transform: rotate(90deg);
    }

    &:focus-visible {
      outline: 2px solid var(--coach-accent);
      outline-offset: 2px;
    }
  }

  // ============== Body ==============
  .coach-modal__body {
    padding: 24px 36px 8px;
    max-height: 60vh;
    overflow-y: auto;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb {
      background: var(--coach-rule);
      border-radius: 3px;
    }
  }

  // 信息 callout（networking / midterm 用）
  .coach-callout {
    display: flex;
    gap: 14px;
    margin-bottom: 24px;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--coach-accent-soft);
  }

  .coach-callout__rule {
    flex-shrink: 0;
    width: 3px;
    border-radius: 2px;
    background: var(--coach-accent);
  }

  .coach-callout__copy {
    flex: 1;
    min-width: 0;
  }

  .coach-callout__title {
    margin-bottom: 4px;
    color: var(--coach-accent);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .coach-callout__text {
    margin: 0;
    color: var(--coach-ink);
    font-size: 13.5px;
    line-height: 1.65;
  }

  // ============== Form ==============
  .coach-form {
    .ant-form-item {
      margin-bottom: 22px;
    }

    .ant-form-item:last-child {
      margin-bottom: 0;
    }

    .ant-form-item-label {
      padding-bottom: 8px;

      > label {
        height: auto;
        line-height: 1.2;

        &::before { display: none !important; } // hide ant required asterisk, we'll handle via num color
        &::after { display: none !important; }
      }
    }
  }

  .coach-form__label {
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
    color: var(--coach-ink);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
  }

  .coach-form__num {
    color: var(--coach-accent);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .coach-form__label-text {
    flex: 1;
  }

  .coach-form__optional {
    margin-left: 6px;
    padding: 1px 8px;
    border-radius: 4px;
    background: #f1f5f9;
    color: var(--coach-ink-mute);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  // 输入控件统一精致化
  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  textarea.ant-input {
    border-radius: 10px !important;
    border-color: var(--coach-rule);
    background: #fff;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 13.5px;

    &:hover {
      border-color: var(--coach-accent) !important;
    }
  }

  .ant-input:focus,
  .ant-input-focused,
  .ant-input-affix-wrapper-focused,
  .ant-select-focused .ant-select-selector,
  textarea.ant-input:focus {
    border-color: var(--coach-accent) !important;
    box-shadow: 0 0 0 3px var(--coach-accent-rim) !important;
  }

  .ant-input-data-count {
    color: var(--coach-ink-mute) !important;
    font-size: 11px !important;
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  }

  // 字段下方的 helper hint
  .coach-form__hint {
    margin: 8px 0 0;
    padding: 0;
    color: var(--coach-ink-mute);
    font-size: 12px;
    line-height: 1.55;
    display: flex;
    align-items: flex-start;
    gap: 6px;

    .mdi {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--coach-accent);
      font-size: 14px;
      opacity: 0.75;
    }
  }

  // Optional 区块分隔
  .coach-form__divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 4px 0 18px;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--coach-rule);
    }
  }

  .coach-form__divider-text {
    color: var(--coach-ink-mute);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  // 2 列网格
  .coach-form__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    .ant-form-item {
      margin-bottom: 0;
    }
  }

  // ============== Footer ==============
  .coach-modal__footer {
    padding: 18px 36px 28px;
    background:
      linear-gradient(180deg, transparent 0%, rgba(248, 250, 252, 0.6) 100%);
    border-top: 1px solid var(--coach-rule);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .coach-modal__footer-microcopy {
    margin: 0;
    color: var(--coach-ink-mute);
    font-size: 12px;
    line-height: 1.5;
    display: flex;
    align-items: center;
    gap: 6px;

    .mdi {
      color: var(--coach-accent);
      font-size: 14px;
      opacity: 0.8;
    }
  }

  .coach-modal__footer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  // ============== Buttons ==============
  .coach-btn {
    height: 42px;
    padding: 0 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .coach-btn--ghost {
    background: transparent;
    border-color: var(--coach-rule);
    color: var(--coach-ink-soft);

    &:hover {
      border-color: var(--coach-ink-mute);
      color: var(--coach-ink);
      background: #fff;
    }
  }

  .coach-btn--submit.ant-btn-primary {
    position: relative;
    background: var(--coach-accent) !important;
    border-color: var(--coach-accent) !important;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.2) inset,
      0 6px 16px -4px var(--coach-accent-rim);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.18) 0%,
        rgba(255, 255, 255, 0) 50%
      );
      pointer-events: none;
    }

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.25) inset,
        0 10px 24px -6px var(--coach-accent-glow);

      .coach-btn__arrow {
        transform: translateX(4px);
      }
    }

    &:active {
      transform: translateY(0);
    }
  }

  .coach-btn__arrow {
    font-size: 17px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // ============== Stagger 入场动画 ==============
  .coach-form .ant-form-item,
  .coach-callout {
    animation: coach-rise 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  }

  .coach-callout                                   { animation-delay: 0.04s; }
  .coach-form .ant-form-item:nth-child(1)         { animation-delay: 0.08s; }
  .coach-form .ant-form-item:nth-child(2)         { animation-delay: 0.14s; }
  .coach-form__divider                             { animation: coach-rise 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.18s backwards; }
  .coach-form__row                                 { animation: coach-rise 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.22s backwards; }

  @keyframes coach-rise {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  // ============================================================
  // 详情弹窗 variant：申请详情 + 导师反馈
  // 复用相同的 header / body / footer 骨架，附加专用元素样式
  // ============================================================

  // Quiet eyebrow（详情场景不需要脉冲点，更克制）
  .coach-modal__eyebrow--quiet {
    background: #f1f5f9;
    color: var(--coach-ink-soft);

    .coach-modal__eyebrow-dot {
      display: none;
    }
  }

  // 状态 pill（紧贴在 subtitle 行尾）
  .coach-modal__status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 10px;
    padding: 3px 10px 3px 8px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.06);
    color: var(--coach-ink);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1.4;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--coach-accent);
    }

    // 不同状态色彩
    &[data-status='pending']   { background: rgba(245, 158, 11, 0.12); color: #b45309; &::before { background: #f59e0b; } }
    &[data-status='assigned'],
    &[data-status='ongoing'],
    &[data-status='coaching']  { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; &::before { background: #3b82f6; } }
    &[data-status='completed'] { background: rgba(16, 185, 129, 0.12); color: #047857; &::before { background: #10b981; } }
    &[data-status='cancelled'],
    &[data-status='rejected']  { background: rgba(239, 68, 68, 0.10); color: #b91c1c; &::before { background: #ef4444; } }
  }

  // Footer 单按钮变体（详情弹窗只有"关闭"）
  .coach-modal__footer--single {
    .coach-modal__footer-actions {
      justify-content: flex-end;
    }
  }

  // ============== 申请详情：meta grid + pull-quote ==============
  .coach-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    margin-bottom: 24px;
    border: 1px solid var(--coach-rule);
    border-radius: 14px;
    overflow: hidden;
    background: var(--coach-rule); // 缝隙线
  }

  .coach-meta__cell {
    padding: 16px 18px;
    background: #fff;
    transition: background 0.18s ease;

    &:hover {
      background: var(--coach-accent-soft);
    }
  }

  .coach-meta__label {
    margin-bottom: 6px;
    color: var(--coach-ink-mute);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .coach-meta__value {
    color: var(--coach-ink);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;

    strong {
      font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
      font-size: 18px;
      font-weight: 700;
      color: var(--coach-accent);
      font-variant-numeric: tabular-nums;
    }
  }

  .coach-meta__value--muted {
    color: var(--coach-ink-mute);
    font-weight: 500;
    font-style: italic;
  }

  .coach-meta__unit {
    margin-left: 4px;
    color: var(--coach-ink-soft);
    font-size: 12px;
    font-weight: 500;
  }

  // Pull-quote 申请内容
  .coach-quote {
    position: relative;
    padding: 18px 20px 18px 24px;
    border-radius: 12px;
    background: #fafbfc;
    border: 1px solid var(--coach-rule);
  }

  .coach-quote__label {
    margin-bottom: 10px;
    color: var(--coach-accent);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .coach-quote__rule {
    position: absolute;
    top: 18px;
    left: 8px;
    bottom: 18px;
    width: 3px;
    border-radius: 2px;
    background: var(--coach-accent);
    opacity: 0.5;
  }

  .coach-quote__text {
    margin: 0;
    color: var(--coach-ink);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-line;
  }

  // ============== 反馈详情：feedback 主题（绿） ==============
  &.practice-coach-modal--feedback {
    --coach-accent: #047857;
    --coach-accent-soft: #d1fae5;
    --coach-accent-rim: rgba(16, 185, 129, 0.22);
    --coach-accent-glow: rgba(16, 185, 129, 0.4);
  }

  // Hero rating 块
  .coach-rating {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
    padding: 24px 28px;
    border-radius: 16px;
    background:
      radial-gradient(circle at 100% 0%, var(--coach-accent-rim), transparent 50%),
      linear-gradient(135deg, #fff 0%, #f8fafc 100%);
    border: 1px solid var(--coach-rule);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset;
  }

  .coach-rating__score {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-shrink: 0;
  }

  .coach-rating__num {
    color: var(--coach-accent);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 56px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .coach-rating__denom {
    color: var(--coach-ink-mute);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 18px;
    font-weight: 500;
  }

  .coach-rating__divider {
    width: 1px;
    height: 56px;
    background: var(--coach-rule);
  }

  .coach-rating__copy {
    flex: 1;
    min-width: 0;
  }

  .coach-rating__label {
    margin-bottom: 4px;
    color: var(--coach-ink);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
  }

  .coach-rating__hint {
    color: var(--coach-ink-soft);
    font-size: 13px;
    line-height: 1.55;
  }

  // 反馈分区卡（详细反馈 / 改进建议）
  .coach-section {
    margin-bottom: 16px;
    padding: 18px 20px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid var(--coach-rule);

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  .coach-section__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    color: var(--coach-ink);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .coach-section__icon {
    color: var(--coach-accent);
    font-size: 18px;
  }

  .coach-section__title {
    flex: 1;
  }

  .coach-section__body {
    margin: 0;
    color: var(--coach-ink);
    font-size: 13.5px;
    line-height: 1.75;
  }

  .coach-section__body--preline {
    white-space: pre-line;
  }

  .coach-section--amber {
    background: #fffbeb;
    border-color: #fde68a;

    .coach-section__head { color: #b45309; }
    .coach-section__icon { color: #d97706; }
    .coach-section__body { color: #78350f; }
  }

  // 推荐 banner
  .coach-recommend {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #a7f3d0;
    color: #065f46;
    font-size: 13.5px;
    font-weight: 600;
  }

  .coach-recommend__icon {
    flex-shrink: 0;
    color: #059669;
    font-size: 22px;
  }

  .coach-recommend__text {
    flex: 1;
    line-height: 1.5;
  }

  // ============== 移动端 ==============
  @media (max-width: 640px) {
    .coach-modal__header,
    .coach-modal__body,
    .coach-modal__footer {
      padding-left: 22px;
      padding-right: 22px;
    }

    .coach-modal__title {
      font-size: 20px;
    }

    .coach-form__row,
    .coach-meta {
      grid-template-columns: 1fr;
    }

    .coach-rating {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;

      &__divider {
        width: 100%;
        height: 1px;
      }
    }
  }
}
</style>
