<template>
  <div id="page-myclass" class="courses-page" :data-action-trigger-count="courseRecords.length">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">
              <span class="page-title__zh">{{ classRecordsMeta.pageSummary.titleZh }}</span>
              <span class="page-title__en">{{ classRecordsMeta.pageSummary.titleEn }}</span>
            </h1>
            <p class="page-sub">{{ classRecordsMeta.pageSummary.subtitle }}</p>
          </div>
        </div>
      </template>

      <div class="reminder-banner">
        <i class="mdi mdi-bell-ring reminder-banner__icon" aria-hidden="true"></i>
        <div class="reminder-banner__copy">
          <div class="reminder-banner__title">
            <i class="mdi mdi-new-box reminder-banner__title-icon" aria-hidden="true"></i>
            {{ classRecordsMeta.reminderBanner.title }}
          </div>
          <div class="reminder-banner__desc">
            {{ classRecordsMeta.reminderBanner.leadText }}
            <strong>{{ classRecordsMeta.reminderBanner.mentorName }}</strong>
            {{ classRecordsMeta.reminderBanner.middleText }}
            <strong>{{ classRecordsMeta.reminderBanner.newRecordCount }}</strong>
            {{ classRecordsMeta.reminderBanner.suffixText }}
          </div>
        </div>
        <button type="button" class="btn btn-sm reminder-banner__action" @click="goToEvaluate">
          {{ classRecordsMeta.reminderBanner.ctaLabel }}
        </button>
      </div>

      <div class="courses-tabs" role="tablist" aria-label="Class record tabs">
        <button
          v-for="tab in classRecordsMeta.tabDefinitions"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          class="courses-tab"
          :class="{ 'courses-tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span>{{ tab.label || tab.displayLabel }}</span>
          <span
            v-if="tab.key === 'pending' && tab.count > 0"
            class="courses-tab__count"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="filters-row">
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
            <button type="button" class="btn btn-outline btn-sm filters-row__reset" @click="resetFilters">
              <i class="mdi mdi-filter-variant" aria-hidden="true"></i>
              {{ classRecordsMeta.filters.resetLabel }}
            </button>
          </div>
        </div>
        <div class="card-body card-body--table">
          <table class="courses-table">
            <thead>
              <tr>
                <th>{{ classRecordsMeta.tableHeaders.recordId }}</th>
                <th>{{ classRecordsMeta.tableHeaders.coachingDetail }}</th>
                <th>{{ classRecordsMeta.tableHeaders.courseContent }}</th>
                <th>{{ classRecordsMeta.tableHeaders.mentor }}</th>
                <th>{{ classRecordsMeta.tableHeaders.classDate }}</th>
                <th>{{ classRecordsMeta.tableHeaders.duration }}</th>
                <th>{{ classRecordsMeta.tableHeaders.rating }}</th>
                <th>{{ classRecordsMeta.tableHeaders.action }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in visibleCourses"
                :key="record.recordId"
                :class="{ 'courses-table__row--new': record.isNew }"
              >
                <td>{{ record.recordId }}</td>
                <td>
                  <div class="coaching-cell">
                    <span class="record-tag" :class="mapTagTone(record.coachingTagColor)">
                      {{ record.coachingType }}
                    </span>
                    <span>{{ record.coachingDetail }}</span>
                  </div>
                </td>
                <td>
                  <span class="record-tag" :class="mapTagTone(record.contentTagColor)">
                    {{ record.courseContent }}
                  </span>
                </td>
                <td>
                  <div class="mentor-cell">
                    <div>{{ record.mentor }}</div>
                    <span>{{ record.mentorRole }}</span>
                  </div>
                </td>
                <td>
                  <div class="date-cell">
                    <strong>{{ record.classDate }}</strong>
                    <span
                      v-if="record.isNew"
                      class="record-tag record-tag--success record-tag--tiny"
                    >
                      {{ record.newBadgeLabel }}
                    </span>
                  </div>
                </td>
                <td>{{ record.duration }}</td>
                <td>
                  <span class="record-tag" :class="mapTagTone(record.ratingColor)">
                    {{ record.ratingLabel }}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="action-button btn btn-sm"
                    :class="{
                      'action-button--primary': record.actionKind === 'rate',
                      'action-button--text': record.actionKind !== 'rate'
                    }"
                    @click="openCourseAction(record)"
                  >
                    {{ record.actionLabel }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </OsgPageContainer>

    <div v-if="detailVisible && currentCourse" class="overlay-shell">
      <section
        class="overlay-card"
        :class="`overlay-card--${detailDialogMeta.tone}`"
        role="dialog"
        :aria-label="currentCourse.detailTitle"
        aria-modal="true"
      >
        <header class="overlay-card__header" :class="`overlay-card__header--${detailDialogMeta.tone}`">
          <div class="overlay-card__title-group">
            <span class="overlay-card__title-icon">
              <i :class="['mdi', detailDialogMeta.icon]" aria-hidden="true"></i>
            </span>
            <div>
              <h2>{{ currentCourse.detailTitle }}</h2>
              <p>{{ detailDialogMeta.subtitle }}</p>
            </div>
          </div>
          <button type="button" class="overlay-card__close" @click="detailVisible = false">×</button>
        </header>
        <div class="overlay-card__body detail-stack">
          <div class="detail-summary-card">
            <div class="detail-summary-card__avatar">{{ mentorInitials(currentCourse.mentor) }}</div>
            <div class="detail-summary-card__copy">
              <strong>{{ currentCourse.mentor }}</strong>
              <span>{{ currentCourse.mentorRole }} · {{ currentCourse.classDate }} · {{ currentCourse.duration }}</span>
              <div class="detail-summary-card__tags">
                <span class="record-tag" :class="mapTagTone(currentCourse.coachingTagColor)">
                  {{ currentCourse.coachingType }}
                </span>
                <span class="record-tag" :class="mapTagTone(currentCourse.contentTagColor)">
                  {{ currentCourse.courseContent }}
                </span>
              </div>
            </div>
            <a-tag :color="currentCourse.ratingColor">{{ currentCourse.ratingLabel }}</a-tag>
          </div>
          <section class="detail-section-card">
            <div class="detail-section-card__title">
              <i class="mdi mdi-information-outline" aria-hidden="true"></i>
              课程信息
            </div>
            <div class="detail-info-list">
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.recordId }}</span>
                <strong>{{ currentCourse.recordId }}</strong>
              </div>
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.coachingDetail }}</span>
                <strong>{{ currentCourse.coachingDetail }}</strong>
              </div>
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.courseContent }}</span>
                <strong>{{ currentCourse.courseContent }}</strong>
              </div>
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.mentor }}</span>
                <strong>{{ currentCourse.mentor }} · {{ currentCourse.mentorRole }}</strong>
              </div>
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.classDate }}</span>
                <strong>{{ currentCourse.classDate }}</strong>
              </div>
              <div class="detail-info-row">
                <span>{{ classRecordsMeta.detailDialog.fields.duration }}</span>
                <strong>{{ currentCourse.duration }}</strong>
              </div>
              <div class="detail-info-row">
                <span>当前评价</span>
                <strong>{{ detailRatingSummary }}</strong>
              </div>
            </div>
          </section>
          <section class="detail-section-card detail-section-card--feedback">
            <div class="detail-section-card__title">
              <i class="mdi mdi-comment-text-outline" aria-hidden="true"></i>
              课程反馈
            </div>
            <div class="detail-feedback-card">
              {{ currentCourse.ratingFeedback || '当前还没有填写详细反馈，完成反馈后会在这里显示。' }}
            </div>
            <div
              v-if="currentCourse.ratingTags"
              class="detail-feedback-tags"
            >
              <span
                v-for="tag in currentCourse.ratingTags.split(',').filter(Boolean)"
                :key="tag"
                class="detail-feedback-tag"
              >
                {{ tag }}
              </span>
            </div>
          </section>
        </div>
        <footer class="overlay-card__footer">
          <a-button @click="detailVisible = false">{{ classRecordsMeta.detailDialog.closeLabel }}</a-button>
          <a-button
            type="primary"
            :class="`overlay-card__action overlay-card__action--${detailDialogMeta.tone}`"
            @click="handleDetailConfirm"
          >
            {{ classRecordsMeta.detailDialog.confirmLabel }}
          </a-button>
        </footer>
      </section>
    </div>

    <div
      v-if="rateVisible && currentCourse"
      id="modal-student-rate"
      class="overlay-shell"
    >
      <section
        class="overlay-card overlay-card--amber overlay-card--compact"
        role="dialog"
        :aria-label="classRecordsMeta.ratingDialog.title"
        aria-modal="true"
      >
        <header class="overlay-card__header overlay-card__header--amber">
          <div class="overlay-card__title-group">
            <span class="overlay-card__title-icon">
              <i class="mdi mdi-star-outline" aria-hidden="true"></i>
            </span>
            <div>
              <h2>{{ classRecordsMeta.ratingDialog.title }}</h2>
              <p>请根据本次课程体验补充评分与反馈</p>
            </div>
          </div>
          <button type="button" class="overlay-card__close" @click="rateVisible = false">×</button>
        </header>
        <div class="overlay-card__body rate-stack">
          <div class="rate-course-card">
            <div class="rate-course-card__avatar">{{ mentorInitials(currentCourse.mentor) }}</div>
            <div class="rate-course-card__copy">
              <strong>{{ currentCourse.mentor }}</strong>
              <span>{{ currentCourse.mentorRole }} · {{ currentCourse.classDate }} · {{ currentCourse.duration }}</span>
              <div class="rate-course-card__tags">
                <span class="record-tag" :class="mapTagTone(currentCourse.coachingTagColor)">
                  {{ currentCourse.coachingType }}
                </span>
                <span class="record-tag" :class="mapTagTone(currentCourse.contentTagColor)">
                  {{ currentCourse.courseContent }}
                </span>
              </div>
            </div>
          </div>
          <a-form layout="vertical">
            <a-form-item :label="classRecordsMeta.ratingDialog.scoreLabel">
              <div class="rating-button-row">
                <button
                  v-for="score in ratingButtons"
                  :key="score"
                  type="button"
                  class="rating-star-button"
                  :class="{ 'rating-star-button--active': rateForm.rating !== null && score <= rateForm.rating }"
                  @click="setRating(score)"
                >
                  ⭐
                </button>
                <span id="rating-text" class="rating-text">{{ ratingText }}</span>
              </div>
            </a-form-item>
            <a-form-item :label="classRecordsMeta.ratingDialog.tagLabel">
              <div class="rating-tag-chip-list">
                <button
                  v-for="option in classRecordsMeta.ratingDialog.tagOptions"
                  :key="option.value"
                  type="button"
                  class="rating-tag-chip"
                  :class="{ 'rating-tag-chip--active': rateForm.tags.includes(option.value) }"
                  @click="toggleRateTag(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <div class="rating-tag-chip-hint">
                {{ rateForm.tags.length > 0 ? `已选择 ${rateForm.tags.length} 项标签` : classRecordsMeta.ratingDialog.tagPlaceholder }}
              </div>
            </a-form-item>
            <a-form-item :label="classRecordsMeta.ratingDialog.feedbackLabel">
              <a-textarea
                v-model:value="rateForm.feedback"
                :rows="4"
                :placeholder="classRecordsMeta.ratingDialog.feedbackPlaceholder"
              />
            </a-form-item>
          </a-form>
        </div>
        <footer class="overlay-card__footer">
          <a-button @click="rateVisible = false">{{ classRecordsMeta.ratingDialog.cancelLabel }}</a-button>
          <a-button type="primary" class="overlay-card__action overlay-card__action--amber" @click="submitRate">
            {{ classRecordsMeta.ratingDialog.submitLabel }}
          </a-button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentClassRecordsMeta,
  listStudentClassRecords,
  rateStudentClassRecord,
  type StudentClassRecord,
  type StudentClassRecordsMeta
} from '@osg/shared/api'

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

const detailDialogMeta = computed(() => {
  const tone = mapDialogTone(currentCourse.value?.contentTagColor)
  if (tone === 'emerald') {
    return {
      tone,
      icon: 'mdi-check-circle-outline',
      subtitle: '查看课程记录、反馈与当前评价状态'
    }
  }

  if (tone === 'violet') {
    return {
      tone,
      icon: 'mdi-account-group-outline',
      subtitle: '查看课程记录、反馈与当前评价状态'
    }
  }

  if (tone === 'amber') {
    return {
      tone,
      icon: 'mdi-school-outline',
      subtitle: '查看课程记录、反馈与当前评价状态'
    }
  }

  return {
    tone,
    icon: 'mdi-book-open-page-variant-outline',
    subtitle: '查看课程记录、反馈与当前评价状态'
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

const visibleCourses = computed(() => {
  const keyword = filters.value.keyword.trim().toLowerCase()

  return courseRecords.value.filter((record) => {
    const matchesTab =
      activeTab.value === 'all' ||
      (activeTab.value === 'pending' && record.tab === 'pending') ||
      (activeTab.value === 'evaluated' && record.tab === 'evaluated')

    const matchesKeyword =
      keyword.length === 0 ||
      [record.mentor, record.coachingDetail, record.recordId].some((value) =>
        value.toLowerCase().includes(keyword)
      )

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
      mentorName: '',
      middleText: '',
      newRecordCount: 0,
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

function mapDialogTone(color?: string) {
  switch ((color || '').toLowerCase()) {
    case 'green':
    case 'success':
      return 'emerald'
    case 'orange':
    case 'warning':
      return 'amber'
    case 'purple':
      return 'violet'
    default:
      return 'blue'
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
  :deep(.osg-page-container) {
    padding: 0;
  }

  :deep(.osg-page-container__header) {
    margin-bottom: 24px;
  }

  :deep(.osg-page-container__content) {
    padding: 0;
    background: transparent;
    border-radius: 0;
  }

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

  .reminder-banner {
    margin-bottom: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  }

  .reminder-banner__icon {
    color: #059669;
    font-size: 28px;
    flex-shrink: 0;
  }

  .reminder-banner__copy {
    flex: 1;
  }

  .reminder-banner__title {
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #065f46;
    font-size: 16px;
    font-weight: 600;
  }

  .reminder-banner__title-icon {
    font-size: 18px;
  }

  .reminder-banner__desc {
    color: #047857;
    font-size: 13px;
  }

  .reminder-banner__action {
    background: #059669;
    color: #fff;
  }

  .courses-tabs {
    display: inline-flex;
    padding: 4px;
    margin-bottom: 20px;
    border-radius: 12px;
    background: #f8fafc;
  }

  .courses-tab {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .courses-tab--active {
    background: #fff;
    color: #7399c6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .courses-tab__count {
    padding: 3px 8px;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
  }

  .card {
    margin-bottom: 20px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);
  }

  .card-body {
    padding: 22px;
  }

  .card-body--table {
    padding: 0;
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

  .filters-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .filters-row__search {
    width: 180px;
  }

  .filters-row__select {
    width: auto;
    min-width: max-content;
  }

  .filters-row__reset {
    height: 40px;
  }

  .filters-row__reset .mdi {
    font-size: 16px;
  }

  .filters-row :deep(.ant-input),
  .filters-row :deep(.ant-select-selector) {
    height: 40px !important;
    border: 2px solid #e2e8f0 !important;
    border-radius: 10px !important;
    background: #fff !important;
    box-shadow: none !important;
    font-size: 14px !important;
  }

  .filters-row :deep(.ant-input) {
    padding-inline: 14px !important;
  }

  .filters-row :deep(.ant-select-selector) {
    padding-inline: 12px 36px !important;
  }

  .filters-row :deep(.ant-select-selection-placeholder),
  .filters-row :deep(.ant-input::placeholder) {
    color: #64748b;
  }

  .filters-row :deep(.ant-select-arrow) {
    color: #64748b;
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

  .overlay-shell {
    position: fixed;
    inset: 0;
    z-index: 1000;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(12px);
  }

  .overlay-card {
    --modal-accent: #5a7ba3;
    --modal-accent-soft: #e8f0f8;
    --modal-accent-strong: #7399c6;
    --modal-accent-highlight: #9bb8d9;
    width: min(640px, 100%);
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid #e2e8f0;
    background: #fff;
    box-shadow: 0 20px 56px rgba(115, 153, 198, 0.22);
  }

  .overlay-card--compact {
    width: min(550px, 100%);
  }

  .overlay-card--amber,
  .overlay-card--emerald,
  .overlay-card--violet {
    --modal-accent: #5a7ba3;
    --modal-accent-soft: #e8f0f8;
    --modal-accent-strong: #7399c6;
    --modal-accent-highlight: #9bb8d9;
  }

  .overlay-card__header {
    padding: 22px 26px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
    color: #fff;
    border-bottom: 0;

    h2 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
  }

  .overlay-card__title-group {
    display: flex;
    align-items: center;
    gap: 14px;

    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: 13px;
    }
  }

  .overlay-card__title-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 20px;
    flex-shrink: 0;
  }

  .overlay-card__close {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.92);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.28);
      transform: translateY(-1px);
    }
  }

  .overlay-card__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 26px;
    background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  }

  .overlay-card__footer {
    padding: 18px 26px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #f8fafc;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
  }

  .overlay-card__action {
    border: none;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  }

  .overlay-card__action--blue {
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
  }

  .overlay-card__action--emerald {
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
  }

  .overlay-card__action--violet {
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
  }

  .overlay-card__action--amber {
    background: linear-gradient(135deg, var(--modal-accent-strong), var(--modal-accent-highlight));
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

    .overlay-shell {
      padding: 16px;
    }

    .overlay-card__body,
    .overlay-card__footer,
    .overlay-card__header {
      padding-left: 16px;
      padding-right: 16px;
    }

    .detail-summary-card,
    .rate-course-card,
    .detail-info-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .overlay-card__footer {
      flex-direction: column;
    }
  }
}
</style>
