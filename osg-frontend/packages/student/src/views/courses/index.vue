<template>
  <div id="page-myclass" class="courses-page" :data-action-trigger-count="courseRecords.length">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <span class="page-title__zh">{{ classRecordsMeta.pageSummary.titleZh }}</span>
          <span class="page-title__en">{{ classRecordsMeta.pageSummary.titleEn }}</span>
        </h1>
        <p class="page-sub">{{ classRecordsMeta.pageSummary.subtitle }}</p>
      </div>
    </div>

    <!--
      Banner 的导师名 / 待评记录数直接由前端基于 courseRecords (list 接口) 计算（见 newRecordCount / firstNewRecordMentor），
      meta 接口仅提供静态文案，确保 banner 与下方表格基于同一数据源、永不漂移。
    -->
    <a-alert
      v-if="newRecordCount > 0"
      type="success"
      show-icon
      banner
      closable
      class="reminder-banner"
    >
      <template #message><strong>{{ classRecordsMeta.reminderBanner.title }}</strong></template>
      <template #description>
        {{ classRecordsMeta.reminderBanner.leadText }}
        <strong>{{ firstNewRecordMentor }}</strong>
        {{ classRecordsMeta.reminderBanner.middleText }}
        <strong>{{ newRecordCount }}</strong>
        {{ classRecordsMeta.reminderBanner.suffixText }}
      </template>
      <template #action>
        <a-button type="primary" size="small" @click="goToEvaluate">
          {{ classRecordsMeta.reminderBanner.ctaLabel }}
        </a-button>
      </template>
    </a-alert>

    <a-tabs v-model:active-key="activeTab" class="courses-tabs">
      <a-tab-pane
        v-for="tab in classRecordsMeta.tabDefinitions"
        :key="tab.key"
      >
        <template #tab>
          {{ tab.label || tab.displayLabel }}
          <a-badge
            v-if="tab.key === 'pending' && tab.count > 0"
            :count="tab.count"
            :number-style="{ backgroundColor: '#f59e0b' }"
            :offset="[6, -2]"
          />
        </template>
      </a-tab-pane>
    </a-tabs>

    <a-card :bordered="false" class="filter-card">
      <a-space :size="12" wrap>
        <a-input
          v-model:value="filters.keyword"
          :placeholder="classRecordsMeta.filters.keywordPlaceholder"
          class="filters-row__search"
        />
        <a-select
          v-model:value="filters.coachingType"
          :placeholder="classRecordsMeta.filters.coachingTypePlaceholder"
          allow-clear
          class="filters-row__select"
        >
          <a-select-option
            v-for="option in classRecordsMeta.filters.coachingTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.courseContent"
          :placeholder="classRecordsMeta.filters.courseContentPlaceholder"
          allow-clear
          class="filters-row__select"
        >
          <a-select-option
            v-for="option in classRecordsMeta.filters.courseContentOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.timeRange"
          :placeholder="classRecordsMeta.filters.timeRangePlaceholder"
          allow-clear
          class="filters-row__select"
        >
          <a-select-option
            v-for="option in classRecordsMeta.filters.timeRangeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-button class="filters-row__reset" @click="resetFilters">
          <template #icon><FilterOutlined /></template>
          {{ classRecordsMeta.filters.resetLabel }}
        </a-button>
      </a-space>
    </a-card>

    <a-card :bordered="false" class="courses-table-card" :body-style="{ padding: 0 }">
      <a-table
        :data-source="visibleCourses"
        :columns="courseColumns"
        :pagination="{ pageSize: 10 }"
        row-key="recordId"
        :row-class-name="rowClassName"
        :scroll="{ x: 1080 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'coachingDetail'">
            <div class="coaching-cell">
              <span class="record-tag" :class="mapTagTone(record.coachingTagColor)">
                {{ record.coachingType }}
              </span>
              <span>{{ record.coachingDetail }}</span>
            </div>
          </template>

          <template v-else-if="column.dataIndex === 'courseContent'">
            <span class="record-tag" :class="mapTagTone(record.contentTagColor)">
              {{ record.courseContent }}
            </span>
          </template>

          <template v-else-if="column.dataIndex === 'mentor'">
            <div class="mentor-cell">
              <div>{{ formatMentorDisplay(record.mentor) }}</div>
              <span>{{ record.mentorRole }}</span>
            </div>
          </template>

          <template v-else-if="column.dataIndex === 'classDate'">
            <div class="date-cell">
              <strong>{{ record.classDate }}</strong>
              <span
                v-if="record.isNew"
                class="record-tag record-tag--success record-tag--tiny"
              >
                {{ record.newBadgeLabel }}
              </span>
            </div>
          </template>

          <template v-else-if="column.dataIndex === 'ratingLabel'">
            <span class="record-tag" :class="mapTagTone(record.ratingColor)">
              {{ record.ratingLabel }}
            </span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button
              size="small"
              :type="record.actionKind === 'rate' ? 'primary' : 'default'"
              @click="openCourseAction(record)"
            >
              {{ record.actionLabel }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="detailVisible"
      :width="600"
      :footer="null"
      :closable="false"
      wrap-class-name="course-log-modal"
      @cancel="detailVisible = false"
    >
      <header v-if="currentCourse" class="course-log__header">
        <div class="course-log__top">
          <span class="course-log__rec-id">{{ currentCourse.recordId }}</span>
          <span class="course-log__top-sep">·</span>
          <span class="course-log__top-tag">{{ currentCourse.coachingType }}</span>
          <span class="course-log__top-sep">·</span>
          <span class="course-log__top-tag course-log__top-tag--muted">{{ currentCourse.courseContent }}</span>
          <button
            class="course-log__close"
            type="button"
            aria-label="关闭"
            @click="detailVisible = false"
          >
            <i class="mdi mdi-close" aria-hidden="true"></i>
          </button>
        </div>
        <h2 class="course-log__mentor">{{ formatMentorDisplay(currentCourse.mentor) }}</h2>
        <p class="course-log__meta">
          <span>{{ currentCourse.mentorRole }}</span>
          <span class="course-log__meta-dot">·</span>
          <span>{{ currentCourse.classDate }}</span>
          <span class="course-log__meta-dot">·</span>
          <span>{{ currentCourse.duration }}</span>
          <span v-if="currentCourse.ratingLabel" class="course-log__meta-rating">
            <i class="mdi mdi-star" aria-hidden="true"></i>
            {{ currentCourse.ratingLabel }}
          </span>
        </p>
      </header>

      <section v-if="currentCourse" class="course-log__body">
        <!-- 课程信息 definition list -->
        <div class="course-log__section">
          <div class="course-log__section-label">课程信息</div>
          <dl class="course-log__deflist">
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.recordId }}</dt>
              <dd class="course-log__deflist-mono">{{ currentCourse.recordId }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.coachingDetail }}</dt>
              <dd>{{ currentCourse.coachingDetail }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.courseContent }}</dt>
              <dd>{{ currentCourse.courseContent }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.mentor }}</dt>
              <dd>{{ formatMentorDisplay(currentCourse.mentor) }} · {{ currentCourse.mentorRole }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.classDate }}</dt>
              <dd>{{ currentCourse.classDate }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>{{ classRecordsMeta.detailDialog.fields.duration }}</dt>
              <dd>{{ currentCourse.duration }}</dd>
            </div>
            <div class="course-log__deflist-row">
              <dt>当前评价</dt>
              <dd>{{ detailRatingSummary }}</dd>
            </div>
          </dl>
        </div>

        <!-- 课程详细（mock / networking / midterm）：只有真实有内容才渲染 -->
        <div v-if="hasCourseDetailContent" class="course-log__section">
          <div class="course-log__section-label">详细信息</div>

          <template v-if="currentCourse.detailKind === 'mock'">
            <dl class="course-log__deflist course-log__deflist--stacked">
              <div v-if="currentCourse.mockPurpose" class="course-log__stacked-row">
                <dt>模拟面试目的</dt>
                <dd>{{ currentCourse.mockPurpose }}</dd>
              </div>
              <div v-if="currentCourse.mockTopics" class="course-log__stacked-row">
                <dt>涉及概念和主题</dt>
                <dd>{{ currentCourse.mockTopics }}</dd>
              </div>
              <div v-if="currentCourse.mockImprovements" class="course-log__stacked-row">
                <dt>需要改进的方面</dt>
                <dd>{{ currentCourse.mockImprovements }}</dd>
              </div>
              <div v-if="currentCourse.mentorRatingLabel" class="course-log__stacked-row">
                <dt>导师评价</dt>
                <dd>{{ currentCourse.mentorRatingEmoji || '' }} {{ currentCourse.mentorRatingLabel }}</dd>
              </div>
            </dl>
          </template>

          <template v-else-if="currentCourse.detailKind === 'networking'">
            <dl
              v-if="currentCourse.networkingScores?.length"
              class="course-log__deflist"
            >
              <div
                v-for="item in currentCourse.networkingScores"
                :key="item.itemName"
                class="course-log__deflist-row"
              >
                <dt>{{ item.itemName }}</dt>
                <dd>
                  <span class="course-log__deflist-mono">{{ item.score }} / {{ item.maxScore }}</span>
                  <span v-if="item.label" class="course-log__deflist-tail">· {{ item.label }}</span>
                </dd>
              </div>
            </dl>
            <div v-if="currentCourse.mentorRecommendation" class="course-log__stacked-row">
              <dt>导师推荐</dt>
              <dd>{{ currentCourse.mentorRecommendation }}</dd>
            </div>
          </template>

          <template v-else-if="currentCourse.detailKind === 'midterm'">
            <dl class="course-log__deflist course-log__deflist--stacked">
              <div v-if="currentCourse.examScoreLabel" class="course-log__stacked-row">
                <dt>考试得分</dt>
                <dd>{{ currentCourse.examScoreLabel }}</dd>
              </div>
              <div v-if="currentCourse.examQuestions" class="course-log__stacked-row">
                <dt>逐题分析</dt>
                <dd class="course-log__preline">{{ currentCourse.examQuestions }}</dd>
              </div>
              <div v-if="currentCourse.studentProgressSummary" class="course-log__stacked-row">
                <dt>学生进度评估</dt>
                <dd>{{ currentCourse.studentProgressSummary }}</dd>
              </div>
            </dl>
          </template>
        </div>

        <!-- 导师反馈 quote -->
        <div class="course-log__section">
          <div class="course-log__section-label">课程反馈</div>
          <blockquote class="course-log__quote">
            {{ currentCourse.mentorFeedback || currentCourse.ratingFeedback || '当前还没有填写详细反馈，完成反馈后会在这里显示。' }}
          </blockquote>
          <div
            v-if="currentCourse.ratingTags"
            class="course-log__tags"
          >
            <span
              v-for="tag in currentCourse.ratingTags.split(',').filter(Boolean)"
              :key="tag"
              class="course-log__tag"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </section>

      <footer class="course-log__footer">
        <a-button class="course-log__btn course-log__btn--ghost" @click="detailVisible = false">
          {{ classRecordsMeta.detailDialog.closeLabel }}
        </a-button>
        <a-button
          type="primary"
          class="course-log__btn course-log__btn--primary"
          @click="handleDetailConfirm"
        >
          {{ classRecordsMeta.detailDialog.confirmLabel }}
        </a-button>
      </footer>
    </a-modal>

    <!-- ============= 评分弹窗（与详情同套简约风格） ============= -->
    <a-modal
      v-model:open="rateVisible"
      :width="560"
      :footer="null"
      :closable="false"
      wrap-class-name="course-log-modal"
      @cancel="rateVisible = false"
    >
      <header v-if="currentCourse" class="course-log__header">
        <div class="course-log__top">
          <span class="course-log__rec-id">{{ currentCourse.recordId }}</span>
          <span class="course-log__top-sep">·</span>
          <span class="course-log__top-tag">{{ classRecordsMeta.ratingDialog.title }}</span>
          <button
            class="course-log__close"
            type="button"
            aria-label="关闭"
            @click="rateVisible = false"
          >
            <i class="mdi mdi-close" aria-hidden="true"></i>
          </button>
        </div>
        <h2 class="course-log__mentor">{{ formatMentorDisplay(currentCourse.mentor) }}</h2>
        <p class="course-log__meta">
          <span>{{ currentCourse.mentorRole }}</span>
          <span class="course-log__meta-dot">·</span>
          <span>{{ currentCourse.classDate }}</span>
          <span class="course-log__meta-dot">·</span>
          <span>{{ currentCourse.duration }}</span>
          <span>·</span>
          <span>{{ currentCourse.coachingType }} / {{ currentCourse.courseContent }}</span>
        </p>
      </header>

      <section class="course-log__body">
        <!-- 整体评分 -->
        <div class="course-log__section">
          <div class="course-log__section-label">整体评分</div>
          <div class="course-log__form-row">
            <div class="course-log__stars">
              <button
                v-for="score in ratingButtons"
                :key="score"
                type="button"
                class="course-log__star"
                :class="{ 'course-log__star--active': rateForm.rating !== null && score <= rateForm.rating }"
                :aria-label="`${score} 星`"
                @click="setRating(score)"
              >
                <i class="mdi mdi-star" aria-hidden="true"></i>
              </button>
            </div>
            <span v-if="rateForm.rating" class="course-log__stars-label">
              <strong>{{ rateForm.rating }}</strong>{{ ratingDescriptionText }}
            </span>
            <span v-else class="course-log__stars-hint">点击星星给本节课打分</span>
          </div>
        </div>

        <!-- 评价标签 -->
        <div class="course-log__section">
          <div class="course-log__section-label">评价标签</div>
          <div class="course-log__chips">
            <button
              v-for="option in classRecordsMeta.ratingDialog.tagOptions"
              :key="option.value"
              type="button"
              class="course-log__chip"
              :class="{ 'course-log__chip--active': rateForm.tags.includes(option.value) }"
              @click="toggleRateTag(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="course-log__chip-hint">
            {{ rateForm.tags.length > 0
              ? `已选择 ${rateForm.tags.length} 项标签`
              : classRecordsMeta.ratingDialog.tagPlaceholder }}
          </div>
        </div>

        <!-- 详细反馈 -->
        <div class="course-log__section">
          <div class="course-log__section-label">详细反馈</div>
          <div class="course-log__textarea-wrap">
            <a-textarea
              v-model:value="rateForm.feedback"
              :rows="4"
              :placeholder="classRecordsMeta.ratingDialog.feedbackPlaceholder"
            />
          </div>
        </div>
      </section>

      <footer class="course-log__footer">
        <a-button class="course-log__btn course-log__btn--ghost" @click="rateVisible = false">
          {{ classRecordsMeta.ratingDialog.cancelLabel }}
        </a-button>
        <a-button
          type="primary"
          class="course-log__btn course-log__btn--primary"
          @click="submitRate"
        >
          {{ classRecordsMeta.ratingDialog.submitLabel }}
        </a-button>
      </footer>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FilterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  getStudentClassRecordsMeta,
  listStudentClassRecords,
  rateStudentClassRecord,
  type StudentClassRecord,
  type StudentClassRecordsMeta
} from '@osg/shared/api'

const courseColumns = computed(() => [
  { title: classRecordsMeta.value.tableHeaders.recordId, dataIndex: 'recordId', width: 80 },
  { title: classRecordsMeta.value.tableHeaders.coachingDetail, dataIndex: 'coachingDetail', key: 'coachingDetail', width: 160 },
  { title: classRecordsMeta.value.tableHeaders.courseContent, dataIndex: 'courseContent', width: 160 },
  { title: classRecordsMeta.value.tableHeaders.mentor, dataIndex: 'mentor', width: 120 },
  { title: classRecordsMeta.value.tableHeaders.classDate, dataIndex: 'classDate', width: 140 },
  { title: classRecordsMeta.value.tableHeaders.duration, dataIndex: 'duration', width: 80 },
  { title: classRecordsMeta.value.tableHeaders.rating, dataIndex: 'ratingLabel', width: 100 },
  { title: classRecordsMeta.value.tableHeaders.action, key: 'action', width: 180, fixed: 'right' }
])

const activeTab = ref<'all' | 'pending' | 'evaluated'>('all')
const detailVisible = ref(false)
const rateVisible = ref(false)
const currentCourse = ref<StudentClassRecord | null>(null)
const courseRecords = ref<StudentClassRecord[]>([])
const classRecordsMeta = ref<StudentClassRecordsMeta>(createDefaultMeta())

const filters = ref({
  keyword: '',
  coachingType: undefined as string | undefined,
  courseContent: undefined as string | undefined,
  timeRange: undefined as string | undefined
})

const rowClassName = (record: StudentClassRecord) =>
  record.actionKind === 'rate' ? 'row-pending' : ''

const rateForm = ref({
  rating: null as number | null,
  tags: [] as string[],
  feedback: ''
})

const ratingButtons = [1, 2, 3, 4, 5] as const
const ratingDescriptions: Record<number, string> = {
  1: '很差',
  2: '一般',
  3: '还行',
  4: '很好',
  5: '非常棒'
}

const ratingText = computed(() => {
  if (rateForm.value.rating === null) {
    return '请选择'
  }

  return `${rateForm.value.rating}分 - ${ratingDescriptions[rateForm.value.rating]}`
})

// 用于新的 course-log 评分弹窗：分离"X分"前缀和" - 描述"后缀
// 模板里 <strong>{{ rating }}</strong>{{ ratingDescriptionText }}
const ratingDescriptionText = computed(() => {
  if (rateForm.value.rating === null) {
    return ''
  }
  const desc = ratingDescriptions[rateForm.value.rating]
  return desc ? `分 · ${desc}` : '分'
})

// ============================================================
// 顶部"新增课程记录"提醒 banner 的动态字段
// 直接从 courseRecords（list 接口数据）计算，不依赖 meta 接口冗余的同名字段，
// 保证 banner 与下方表格永远基于同一份数据，不会出现"banner 说 N 条但表里 M 条"的不一致。
// 同时彻底规避 meta 后端 fallback 出来的占位 mentor（"Jerry Li" 死种子）。
// isNew 来自后端 listStudentClassRecords 返回字段：评分为空 → 该条记录尚未被学生评价
// ============================================================
const newRecordsList = computed(() =>
  courseRecords.value.filter((r) => r.isNew),
)

const newRecordCount = computed(() => newRecordsList.value.length)

/**
 * 格式化导师显示名：
 * 后端可能返回邮箱格式（如 alex.ren@osg-staff.local），
 * 给学生看的页面只需要 @ 之前的部分（alex.ren）即可。
 * 已经是普通名字（含中文）的输入原样返回。
 */
function formatMentorDisplay(name?: string | null): string {
  const raw = (name ?? '').trim()
  if (!raw) return ''
  const at = raw.indexOf('@')
  return at > 0 ? raw.slice(0, at) : raw
}

const firstNewRecordMentor = computed(() => {
  const first = newRecordsList.value[0]
  return formatMentorDisplay(first?.mentor)
})

const detailToneClass = computed(() => {
  switch (currentCourse.value?.detailKind) {
    case 'mock':
      return 'modal-accent--green'
    case 'networking':
      return 'modal-accent--purple'
    case 'midterm':
      return 'modal-accent--amber'
    default:
      return ''
  }
})

const detailRatingSummary = computed(() => {
  if (!currentCourse.value) {
    return '-'
  }

  const score = Number(currentCourse.value.ratingScoreValue)
  if (!score) {
    return '尚未评价'
  }

  return `${score}分 · ${currentCourse.value.ratingLabel}`
})

// 课程详细 section 是否有任何可见内容（避免空 section）
const hasCourseDetailContent = computed(() => {
  const c = currentCourse.value
  if (!c) return false

  if (c.detailKind === 'mock') {
    return !!(c.mockPurpose || c.mockTopics || c.mockImprovements || c.mentorRatingLabel)
  }
  if (c.detailKind === 'networking') {
    return !!((c.networkingScores && c.networkingScores.length) || c.mentorRecommendation)
  }
  if (c.detailKind === 'midterm') {
    return !!(c.examScoreLabel || c.examQuestions || c.studentProgressSummary)
  }
  return false
})

const visibleCourses = computed(() => {
  const keyword = filters.value.keyword.trim().toLowerCase()

  return courseRecords.value.filter((record) => {
    const matchesTab =
      activeTab.value === 'all' ||
      (activeTab.value === 'pending' && record.tab === 'pending') ||
      (activeTab.value === 'evaluated' && record.tab === 'evaluated')

    const matchesKeyword =
      keyword.length === 0 ||
      [
        record.mentor,
        formatMentorDisplay(record.mentor), // 让用户搜显示名（去 @ 后的部分）也能命中
        record.coachingDetail,
        record.recordId,
      ].some((value) => (value ?? '').toLowerCase().includes(keyword))

    const matchesCoachingType =
      !filters.value.coachingType || record.coachingType === filters.value.coachingType
    const matchesCourseContent =
      !filters.value.courseContent || record.courseContent === filters.value.courseContent
    const matchesTimeRange = matchesSelectedTimeRange(record.classDateRaw, filters.value.timeRange)

    return matchesTab && matchesKeyword && matchesCoachingType && matchesCourseContent && matchesTimeRange
  })
})

function createDefaultMeta(): StudentClassRecordsMeta {
  return {
    pageSummary: {
      titleZh: '',
      titleEn: '',
      subtitle: ''
    },
    reminderBanner: {
      iconLabel: '',
      title: '',
      leadText: '',
      middleText: '',
      suffixText: '',
      ctaLabel: ''
    },
    tabDefinitions: [
      { key: 'all', label: '', displayLabel: '', count: 0 },
      { key: 'pending', label: '', displayLabel: '', count: 0 },
      { key: 'evaluated', label: '', displayLabel: '', count: 0 }
    ],
    filters: {
      keywordPlaceholder: '',
      coachingTypePlaceholder: '',
      courseContentPlaceholder: '',
      timeRangePlaceholder: '',
      resetLabel: '',
      coachingTypeOptions: [],
      courseContentOptions: [],
      timeRangeOptions: []
    },
    tableHeaders: {
      recordId: '',
      coachingDetail: '',
      courseContent: '',
      mentor: '',
      classDate: '',
      duration: '',
      rating: '',
      action: ''
    },
    detailDialog: {
      closeLabel: '',
      confirmLabel: '',
      fields: {
        recordId: '',
        coachingDetail: '',
        courseContent: '',
        mentor: '',
        classDate: '',
        duration: ''
      }
    },
    ratingDialog: {
      title: '',
      scoreLabel: '',
      tagLabel: '',
      feedbackLabel: '',
      tagPlaceholder: '',
      feedbackPlaceholder: '',
      cancelLabel: '',
      submitLabel: '',
      successMessage: '',
      tagOptions: []
    }
  }
}

function matchesSelectedTimeRange(classDateRaw: string, selectedRange?: string) {
  if (!selectedRange || selectedRange === 'all') {
    return true
  }

  const recordDate = new Date(`${classDateRaw}T00:00:00`)
  if (Number.isNaN(recordDate.getTime())) {
    return true
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selectedRange === 'week') {
    const weekStart = new Date(today)
    const day = weekStart.getDay()
    const diff = day === 0 ? 6 : day - 1
    weekStart.setDate(weekStart.getDate() - diff)
    return recordDate >= weekStart && recordDate <= today
  }

  if (selectedRange === 'month') {
    return recordDate.getFullYear() === today.getFullYear() && recordDate.getMonth() === today.getMonth()
  }

  return true
}

function mapTagTone(color?: string) {
  switch ((color || '').toLowerCase()) {
    case 'green':
    case 'success':
      return 'record-tag--success'
    case 'orange':
    case 'warning':
      return 'record-tag--warning'
    case 'blue':
    case 'info':
      return 'record-tag--info'
    case 'purple':
      return 'record-tag--purple'
    default:
      return 'record-tag--default'
  }
}

function mentorInitials(name: string) {
  return name
    .split(/\s+/)
    .map((segment) => segment.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MT'
}

const goToEvaluate = () => {
  activeTab.value = 'pending'
}

const resetFilters = () => {
  filters.value = {
    keyword: '',
    coachingType: undefined,
    courseContent: undefined,
    timeRange: undefined
  }
}

const openCourseAction = (record: StudentClassRecord) => {
  currentCourse.value = record

  if (record.actionKind === 'rate') {
    hydrateRateForm(record)
    rateVisible.value = true
    return
  }

  detailVisible.value = true
}

const handleDetailConfirm = () => {
  detailVisible.value = false
  if (currentCourse.value) {
    hydrateRateForm(currentCourse.value)
  }
  rateVisible.value = true
}

const submitRate = async () => {
  if (!currentCourse.value) {
    return
  }

  if (rateForm.value.rating === null) {
    message.error('请先选择整体评分')
    return
  }

  if (!rateForm.value.feedback.trim()) {
    message.error('请填写详细反馈')
    return
  }

  try {
    await rateStudentClassRecord({
      recordId: currentCourse.value.recordId,
      rating: rateForm.value.rating,
      tags: rateForm.value.tags,
      feedback: rateForm.value.feedback.trim()
    })
    rateVisible.value = false
    detailVisible.value = false
    await loadPage()
    message.success('评价提交成功！')
  } catch {
    return
  }
}

const setRating = (rating: number) => {
  rateForm.value.rating = rating
}

const toggleRateTag = (tag: string) => {
  if (rateForm.value.tags.includes(tag)) {
    rateForm.value.tags = rateForm.value.tags.filter((item) => item !== tag)
    return
  }

  rateForm.value.tags = [...rateForm.value.tags, tag]
}

const hydrateRateForm = (record: StudentClassRecord) => {
  const parsedScore = Number(record.ratingScoreValue)
  rateForm.value = {
    rating: parsedScore > 0 ? parsedScore : null,
    tags: record.ratingTags ? record.ratingTags.split(',').filter(Boolean) : [],
    feedback: record.ratingFeedback || ''
  }
}

const loadPage = async () => {
  const [metaResponse, listResponse] = await Promise.all([
    getStudentClassRecordsMeta(),
    listStudentClassRecords()
  ])
  classRecordsMeta.value = metaResponse
  courseRecords.value = listResponse.records
}

async function bootstrapPage() {
  try {
    await loadPage()
  } catch {
    return
  }
}

onMounted(() => {
  void bootstrapPage()
})
</script>

<style scoped lang="scss">
.courses-page {
  // === 布局：block + margin ===
  > .page-header {
    margin-bottom: 20px;
  }

  > .reminder-banner,
  > .courses-tabs,
  > :deep(.ant-card) {
    margin-bottom: 16px;
  }

  // === a-card 强阴影（保留 8px 圆角）原型 L10 var(--card-shadow) ===
  > :deep(.ant-card) {
    border: 0;
    box-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);
  }

  // === filter card 内部 padding（原型 L66 .card-body padding 22px）===
  .filter-card :deep(.ant-card-body) {
    padding: 22px 22px 24px;
  }

  // === filter input / select 原型样式：40px 高 + 2px 边框 + 10px 圆角 + 蓝光 focus（原型 L102-105）===
  .filter-card {
    :deep(.ant-input),
    :deep(.ant-select-selector) {
      height: 40px !important;
      border: 2px solid #e2e8f0 !important;
      border-radius: 10px !important;
      box-shadow: none !important;
      font-size: 14px !important;
    }

    :deep(.ant-input) {
      padding: 0 14px !important;
    }

    :deep(.ant-select-selector) {
      padding: 0 12px !important;
      align-items: center;
      display: flex;
    }

    :deep(.ant-select-single .ant-select-selector .ant-select-selection-item),
    :deep(.ant-select-single .ant-select-selector .ant-select-selection-placeholder) {
      line-height: 36px;
    }

    :deep(.ant-input:focus),
    :deep(.ant-input-focused),
    :deep(.ant-select-focused .ant-select-selector) {
      border-color: #7399c6 !important;
      box-shadow: 0 0 0 4px #e8f0f8 !important;
    }
  }

  // === filter 重置按钮 40px 高（与 input 对齐，原型 L651）===
  .filters-row__reset {
    height: 40px;
  }

  // === courses-table-card overflow 防圆角被表格切到 ===
  .courses-table-card {
    overflow: hidden;
  }

  // === a-tabs pill 样式（原型 L73-75）===
  > .courses-tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 0;

      &::before {
        display: none;
      }
    }

    :deep(.ant-tabs-nav-wrap) {
      display: inline-flex;
      background: #f8fafc;
      border-radius: 12px;
      padding: 4px;
    }

    :deep(.ant-tabs-tab) {
      padding: 10px 20px !important;
      margin: 0 !important;
      border-radius: 10px !important;
      color: #64748b;
      font-weight: 500;
      transition: all 0.2s;

      &:not(.ant-tabs-tab-active):hover {
        color: #7399c6;
      }
    }

    :deep(.ant-tabs-tab-active) {
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
      color: #7399c6 !important;
      font-weight: 600;
    }

    :deep(.ant-tabs-ink-bar) {
      display: none;
    }
  }

  // === reminder banner 绿色渐变 + 12px 圆角（原型 L628）===
  .reminder-banner {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: none;
    border-radius: 12px;
    padding: 16px 20px;

    :deep(.ant-alert-icon) {
      color: #059669;
      font-size: 24px;
    }

    :deep(.ant-alert-message) {
      color: #065f46;
      font-weight: 600;
      margin-bottom: 4px;
    }

    :deep(.ant-alert-description) {
      color: #047857;
      font-size: 13px;
    }

    :deep(.ant-btn-primary) {
      background: #059669;
      border-color: #059669;

      &:hover,
      &:focus {
        background: #047857 !important;
        border-color: #047857 !important;
      }
    }
  }

  // === 待评价行高亮（原型 L661/L671 背景 #ECFDF5）===
  .courses-table-card :deep(.ant-table-tbody) > tr.row-pending > td {
    background: #ecfdf5;
  }

  .courses-table-card :deep(.ant-table-tbody) > tr.row-pending:hover > td {
    background: #d1fae5;
  }

  // === btn-primary 渐变 + 阴影（原型 L89）===
  .courses-table-card :deep(.ant-btn-primary) {
    background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
    border-color: #7399c6;
    box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);

    &:hover,
    &:focus {
      background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 100%) !important;
      border-color: #5a7ba3 !important;
    }
  }

  // === 以下保留不变：page-title / btn / filters-row 宽度 ===
  .page-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: 26px;
    font-weight: 700;
  }

  .page-title__zh {
    line-height: 1;
  }

  .page-title__en {
    color: #94a3b8;
    font-size: 14px;
    font-weight: 400;
  }

  .page-sub {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }

  .btn-outline {
    background: #fff;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }

  .filters-row__search {
    width: 180px;
  }

  .filters-row__select {
    width: auto;
    min-width: max-content;
  }

  .courses-table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;

    th,
    td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 14px;
    }

    th {
      background: #f8fafc;
      color: #64748b;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  .courses-table tbody tr:hover {
    background: #f8fafc;
  }

  .courses-table__row--new {
    background: #ecfdf5;
  }

  .record-tag {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
  }

  .record-tag--tiny {
    padding: 4px 8px;
    font-size: 10px;
  }

  .record-tag--success {
    background: #d1fae5;
    color: #065f46;
  }

  .record-tag--warning {
    background: #fef3c7;
    color: #92400e;
  }

  .record-tag--info {
    background: #dbeafe;
    color: #1e40af;
  }

  .record-tag--purple {
    background: #e8f0f8;
    color: #5a7ba3;
  }

  .record-tag--default {
    background: #f1f5f9;
    color: #475569;
  }

  .coaching-cell,
  .mentor-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start; // 防止 inline tag 被 column flex 默认的 stretch 拉满列宽
    gap: 4px;
  }

  .coaching-cell span:last-child,
  .mentor-cell span {
    color: #1e293b;
    font-size: 12px;
  }

  .date-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .date-cell strong {
    color: #059669;
    font-weight: 500;
  }

  .detail-stack,
  .rate-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .action-button {
    padding: 6px 12px;
  }

  .action-button--primary {
    background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
    color: #fff;
    box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
  }

  .action-button--primary::before {
    content: '★';
    font-size: 10px;
  }

  .action-button--text {
    background: transparent;
    color: #7399c6;
  }

  .action-button--text:hover {
    background: #e8f0f8;
  }

  .detail-summary-card,
  .rate-course-card {
    padding: 18px;
    border-radius: 16px;
    background: #e8f0f8;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .detail-summary-card__avatar,
  .rate-course-card__avatar {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--modal-accent-soft);
    color: var(--modal-accent);
    font-size: 18px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .detail-summary-card__copy,
  .rate-course-card__copy {
    flex: 1;

    strong {
      display: block;
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 16px;
    }

    span {
      color: #475569;
      font-size: 13px;
    }
  }

  .detail-summary-card__tags,
  .rate-course-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .detail-section-card {
    padding: 18px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .detail-section-card__title {
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--modal-accent);
    font-size: 14px;
    font-weight: 700;
  }

  .detail-section-card--feedback {
    background: #e8f0f8;
    border-color: #e2e8f0;
  }

  .detail-info-list {
    display: grid;
    gap: 12px;
  }

  .detail-info-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;

    &:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    span {
      color: #64748b;
      font-size: 13px;
    }

    strong {
      color: #0f172a;
      font-size: 13px;
      text-align: right;
    }
  }

  .detail-feedback-card {
    padding: 14px;
    border-radius: 12px;
    background: #fff;
    color: #334155;
    font-size: 13px;
    line-height: 1.7;
  }

  .detail-feedback-tags {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .detail-feedback-tag {
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--modal-accent-soft);
    color: var(--modal-accent);
    font-size: 12px;
    font-weight: 600;
  }

  .rating-button-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .rating-star-button {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    padding: 10px 14px;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rating-star-button--active {
    border-color: var(--modal-accent);
    background: var(--modal-accent-soft);
  }

  .rating-text {
    margin-left: 6px;
    color: var(--modal-accent);
    font-size: 18px;
    font-weight: 700;
  }

  .rating-tag-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .rating-tag-chip {
    border: 1px solid color-mix(in srgb, var(--modal-accent) 28%, #e5e7eb);
    border-radius: 999px;
    background: #fff;
    color: #475569;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rating-tag-chip--active {
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
    border-color: var(--modal-accent-strong);
    color: #fff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
  }

  .rating-tag-chip-hint {
    margin-top: 10px;
    color: var(--modal-accent);
    font-size: 12px;
  }
}

@media (max-width: 900px) {
  .courses-page {
    .reminder-banner {
      align-items: flex-start;
      flex-direction: column;
    }

    .courses-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .filters-row__search,
    .filters-row__select {
      width: 100%;
    }

    .detail-summary-card,
    .rate-course-card,
    .detail-info-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
}
</style>

<!-- ============================================================
     Course Log —— 课程详情弹窗（简约但不简单）
     设计原则：减法 / 留白 / 排版做层次 / 不堆叠 card
     用 unscoped 因为 a-modal 通过 teleport 渲染到 document.body
     ============================================================ -->
<style lang="scss">
.course-log-modal {
  // 与原型色板一致（osg-spec-docs/source/prototype/index.html）
  // primary #7399C6 / primary-dark #5A7BA3 / primary-light #E8F0F8
  --log-ink: #1e293b;
  --log-ink-soft: #475569;
  --log-ink-mute: #94a3b8;
  --log-rule: #ebeef3;
  --log-rule-soft: #f5f7fa;
  --log-accent: #5a7ba3;
  --log-accent-light: #7399c6;
  --log-accent-soft: #e8f0f8;
  --log-accent-tint: rgba(115, 153, 198, 0.10);
  --log-paper: #fff;

  // ============== Modal 外壳重置：纯白纸感 ==============
  .ant-modal-content {
    overflow: hidden;
    padding: 0;
    border-radius: 16px;
    background: var(--log-paper);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.6) inset,
      0 24px 56px -22px rgba(15, 23, 42, 0.28),
      0 6px 18px -8px rgba(15, 23, 42, 0.12);
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  // ============== Header（极简） ==============
  .course-log__header {
    padding: 24px 32px 18px;
    border-bottom: 1px solid var(--log-rule);
  }

  .course-log__top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    color: var(--log-ink-mute);
    font-family: 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1.4;
  }

  .course-log__rec-id {
    color: var(--log-accent);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .course-log__top-sep {
    color: #cbd5e1;
  }

  .course-log__top-tag {
    color: var(--log-ink-soft);
    font-family: 'PingFang SC', 'Source Han Sans SC', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
  }

  .course-log__top-tag--muted {
    color: var(--log-ink-mute);
  }

  .course-log__close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--log-ink-mute);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;

    .mdi {
      font-size: 16px;
      line-height: 1;
    }

    &:hover {
      background: var(--log-rule-soft);
      color: var(--log-ink);
    }
  }

  .course-log__mentor {
    margin: 0 0 6px;
    color: var(--log-ink);
    font-family: 'PingFang SC', 'Source Han Sans SC', system-ui, sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.012em;
    line-height: 1.3;
  }

  .course-log__meta {
    margin: 0;
    color: var(--log-ink-soft);
    font-size: 13px;
    line-height: 1.65;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .course-log__meta-dot {
    color: #cbd5e1;
  }

  .course-log__meta-rating {
    margin-left: 4px;
    padding: 2px 10px;
    border-radius: 999px;
    background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
    border: 1px solid #fde68a;
    color: #b45309;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    .mdi {
      font-size: 13px;
      color: #f59e0b;
    }
  }

  // ============== Body ==============
  .course-log__body {
    padding: 8px 32px;
    max-height: 60vh;
    overflow-y: auto;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb {
      background: var(--log-rule);
      border-radius: 3px;
    }
  }

  .course-log__section {
    padding: 18px 0;

    & + .course-log__section {
      border-top: 1px dashed var(--log-rule);
    }

    &:last-child {
      padding-bottom: 4px;
    }
  }

  .course-log__section-label {
    margin-bottom: 14px;
    color: var(--log-accent);
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;

    &::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-right: 8px;
      border-radius: 50%;
      background: var(--log-accent);
      vertical-align: middle;
      transform: translateY(-1px);
    }
  }

  // ============== Definition list（label 左，value 右） ==============
  .course-log__deflist {
    margin: 0;
    padding: 0;

    .course-log__deflist-row {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 16px;
      padding: 9px 0;
      border-bottom: 1px solid var(--log-rule-soft);
      align-items: baseline;

      &:last-child {
        border-bottom: 0;
      }

      dt {
        color: var(--log-ink-mute);
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.5;
      }

      dd {
        margin: 0;
        color: var(--log-ink);
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.6;
      }
    }
  }

  // 堆叠模式：label 在上，value 在下（适合长 value）
  .course-log__deflist--stacked {
    .course-log__stacked-row {
      padding: 12px 0;
      border-bottom: 1px solid var(--log-rule-soft);

      &:last-child {
        border-bottom: 0;
      }

      dt {
        margin-bottom: 6px;
        color: var(--log-ink-mute);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.01em;
      }

      dd {
        margin: 0;
        color: var(--log-ink);
        font-size: 13.5px;
        line-height: 1.7;
      }
    }
  }

  // 单独使用的 stacked-row（在 networking 里）
  .course-log__stacked-row {
    padding: 12px 0 0;
    margin-top: 12px;
    border-top: 1px dashed var(--log-rule);

    dt {
      margin-bottom: 6px;
      color: var(--log-ink-mute);
      font-size: 12px;
      font-weight: 500;
    }

    dd {
      margin: 0;
      color: var(--log-ink);
      font-size: 13.5px;
      line-height: 1.7;
    }
  }

  .course-log__deflist-mono {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--log-accent);
    font-weight: 600;
  }

  .course-log__deflist-tail {
    margin-left: 6px;
    color: var(--log-ink-soft);
    font-weight: 400;
  }

  .course-log__preline {
    white-space: pre-line;
  }

  // ============== Quote 反馈 ==============
  .course-log__quote {
    position: relative;
    margin: 0;
    padding: 4px 0 4px 18px;
    color: var(--log-ink);
    font-size: 14px;
    font-style: normal;
    line-height: 1.75;

    &::before {
      content: '';
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: 0;
      width: 3px;
      border-radius: 2px;
      background: var(--log-accent);
      opacity: 0.5;
    }
  }

  // ============== Tag pills ==============
  .course-log__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
  }

  .course-log__tag {
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--log-accent-soft);
    color: var(--log-accent);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
  }

  // ============== Footer ==============
  .course-log__footer {
    padding: 16px 32px 22px;
    border-top: 1px solid var(--log-rule);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: linear-gradient(180deg, transparent 0%, var(--log-rule-soft) 100%);
  }

  .course-log__btn {
    height: 38px;
    padding: 0 20px;
    border-radius: 9px;
    font-size: 13.5px;
    font-weight: 600;
  }

  .course-log__btn--ghost {
    background: transparent;
    border-color: var(--log-rule);
    color: var(--log-ink-soft);

    &:hover {
      border-color: var(--log-ink-mute);
      color: var(--log-ink);
      background: #fff;
    }
  }

  .course-log__btn--primary.ant-btn-primary {
    background: linear-gradient(135deg, #7399c6 0%, #5a7ba3 100%) !important;
    border-color: var(--log-accent) !important;
    color: #fff !important;
    box-shadow: 0 4px 14px -4px rgba(115, 153, 198, 0.55);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: linear-gradient(135deg, #5a7ba3 0%, #486889 100%) !important;
      border-color: #486889 !important;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px -4px rgba(90, 123, 163, 0.6);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px -2px rgba(90, 123, 163, 0.5);
    }
  }

  // ============================================================
  // 评分弹窗（rate）扩展：复用骨架，body 是表单
  // ============================================================
  .course-log__form-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  // 5 颗星按钮
  .course-log__stars {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 14px;
  }

  .course-log__star {
    width: 38px;
    height: 38px;
    padding: 0;
    border: 1px solid var(--log-rule);
    border-radius: 9px;
    background: #fff;
    color: #cbd5e1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;

    .mdi {
      font-size: 20px;
      line-height: 1;
    }

    &:hover {
      border-color: #fcd34d;
      color: #f59e0b;
      background: #fffbeb;
      transform: translateY(-1px);
    }

    &.course-log__star--active {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-color: #fcd34d;
      color: #f59e0b;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        0 1px 2px rgba(245, 158, 11, 0.15);
    }
  }

  .course-log__stars-label {
    color: var(--log-ink);
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.5;

    strong {
      color: #b45309;
      font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      margin-right: 6px;
    }
  }

  .course-log__stars-hint {
    color: var(--log-ink-mute);
    font-size: 12.5px;
    font-style: italic;
  }

  // Tag chip 选择
  .course-log__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .course-log__chip {
    height: auto;
    padding: 6px 12px;
    border: 1px solid var(--log-rule);
    border-radius: 999px;
    background: #fff;
    color: var(--log-ink-soft);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s ease;

    &:hover {
      border-color: var(--log-accent-light);
      color: var(--log-accent);
      background: var(--log-accent-tint);
    }

    &.course-log__chip--active {
      border-color: var(--log-accent);
      background: var(--log-accent-soft);
      color: var(--log-accent);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(90, 123, 163, 0.12);

      &::before {
        content: '✓';
        margin-right: 4px;
        font-weight: 700;
      }
    }
  }

  .course-log__chip-hint {
    margin-top: 8px;
    color: var(--log-ink-mute);
    font-size: 12px;
    line-height: 1.5;
  }

  // 表单字段标签
  .course-log__field-label {
    margin-bottom: 10px;
    color: var(--log-ink);
    font-size: 13px;
    font-weight: 600;

    .course-log__required {
      color: #e11d48;
      margin-left: 2px;
    }

    .course-log__field-hint {
      margin-left: 8px;
      color: var(--log-ink-mute);
      font-size: 11.5px;
      font-weight: 400;
    }
  }

  // Textarea 包装
  .course-log__textarea-wrap {
    position: relative;

    textarea.ant-input {
      padding: 12px 14px;
      border: 1px solid var(--log-rule);
      border-radius: 10px;
      background: #fff;
      color: var(--log-ink);
      font-size: 13.5px;
      line-height: 1.65;
      resize: vertical;
      transition: all 0.18s ease;

      &::placeholder {
        color: var(--log-ink-mute);
      }

      &:hover {
        border-color: var(--log-accent-light);
      }

      &:focus {
        border-color: var(--log-accent);
        box-shadow: 0 0 0 3px var(--log-accent-tint);
      }
    }
  }

  // ============== 移动端 ==============
  @media (max-width: 640px) {
    .course-log__header,
    .course-log__body,
    .course-log__footer {
      padding-left: 22px;
      padding-right: 22px;
    }

    .course-log__mentor {
      font-size: 19px;
    }

    .course-log__deflist .course-log__deflist-row {
      grid-template-columns: 1fr;
      gap: 4px;

      dt { font-size: 11.5px; }
    }
  }
}
</style>
