<template>
  <a-card :bordered="false" :body-style="{ padding: '12px 16px' }">
    <!-- 折叠态 toolbar -->
    <div class="osg-ic__toolbar">
      <div class="osg-ic__title-group">
        <i class="mdi mdi-calendar-month osg-ic__title-icon" />
        <span class="osg-ic__title">{{ effectiveTitle }}</span>
        <div v-if="showMonthNav" class="osg-ic__month-nav">
          <a-button
            type="text"
            size="small"
            class="osg-ic__month-arrow"
            :aria-label="viewMode === 'week' ? t('common.shared.calendar.aria.prevWeek') : t('common.shared.calendar.aria.prevMonth')"
            @click="onShift(-1)"
          >
            <i class="mdi mdi-chevron-left" />
          </a-button>
          <span class="osg-ic__month">{{ currentRangeLabel }}</span>
          <a-button
            type="text"
            size="small"
            class="osg-ic__month-arrow"
            :aria-label="viewMode === 'week' ? t('common.shared.calendar.aria.nextWeek') : t('common.shared.calendar.aria.nextMonth')"
            @click="onShift(1)"
          >
            <i class="mdi mdi-chevron-right" />
          </a-button>
        </div>
        <span v-else class="osg-ic__month osg-ic__month--static">{{ currentRangeLabel }}</span>

        <!-- 月/星期 切换 tab -->
        <div class="osg-ic__view-switch" role="tablist" :aria-label="t('common.shared.calendar.aria.viewSwitch')">
          <button
            type="button"
            class="osg-ic__view-tab"
            :class="{ 'osg-ic__view-tab--active': viewMode === 'month' }"
            role="tab"
            :aria-selected="viewMode === 'month'"
            @click="onViewModeChange('month')"
          >{{ t('common.shared.calendar.view.month') }}</button>
          <button
            type="button"
            class="osg-ic__view-tab"
            :class="{ 'osg-ic__view-tab--active': viewMode === 'week' }"
            role="tab"
            :aria-selected="viewMode === 'week'"
            @click="onViewModeChange('week')"
          >{{ t('common.shared.calendar.view.week') }}</button>
        </div>
      </div>

      <div class="osg-ic__divider" />

      <div class="osg-ic__days">
        <a-tag
          v-for="day in compactDays"
          :key="day.key"
          :color="day.tagColor"
          :bordered="false"
          :style="day.tagStyle"
          class="osg-ic__day-tag"
        >
          <div class="osg-ic__day-tag-inner">
            <div class="osg-ic__day-tag-week">{{ day.weekday }}</div>
            <div class="osg-ic__day-tag-date">{{ day.date }}</div>
          </div>
        </a-tag>
      </div>

      <template v-if="hasSummary">
        <div class="osg-ic__divider" />

        <div class="osg-ic__summary">
          <a-tag
            v-for="item in summaryEvents"
            :key="item.label"
            :color="item.tagColor"
            class="osg-ic__summary-tag"
          >
            <span class="osg-ic__summary-label">{{ item.label }}</span>
            <span v-if="item.student" class="osg-ic__summary-student">{{ item.student }}</span>
          </a-tag>
        </div>
      </template>

      <a-button
        type="text"
        size="small"
        class="osg-ic__toggle"
        @click="expanded = !expanded"
      >
        <i
          class="mdi"
          :class="expanded ? 'mdi-calendar-collapse-horizontal' : 'mdi-calendar-expand-horizontal'"
        />
        {{ expanded ? t('common.shared.calendar.toggle.collapse') : t('common.shared.calendar.toggle.expand') }}
      </a-button>
    </div>

    <!-- 展开态：42 格月视图 + 本周事件列表 -->
    <div v-if="expanded" class="osg-ic__month-view">
      <div class="osg-ic__legend">
        <span class="osg-ic__legend-item">
          <span class="osg-ic__legend-dot" style="background: #EF4444" />{{ t('common.shared.calendar.legend.interview') }}
        </span>
        <span class="osg-ic__legend-item">
          <span class="osg-ic__legend-dot" style="background: #3B82F6" />{{ t('common.shared.calendar.legend.coaching') }}
        </span>
        <span class="osg-ic__legend-item">
          <span class="osg-ic__legend-dot" style="background: var(--primary)" />{{ t('common.shared.calendar.legend.today') }}
        </span>
      </div>

      <div class="osg-ic__month-grid">
        <span
          v-for="weekday in WEEKDAYS_LOCALIZED"
          :key="weekday"
          class="osg-ic__month-heading"
        >{{ weekday }}</span>
        <div
          v-for="cell in monthCells"
          :key="cell.iso"
          class="osg-ic__month-cell"
          :class="[
            `osg-ic__month-cell--${cell.tone}`,
            { 'osg-ic__month-cell--outside': !cell.isCurrentMonth },
          ]"
        >
          <span>{{ cell.label }}</span>
          <span
            v-if="cell.hasEvent && cell.tone !== 'today'"
            class="osg-ic__month-dot"
            :class="`osg-ic__month-dot--${cell.tone}`"
          />
        </div>
      </div>

      <div class="osg-ic__week-schedule">
        <div class="osg-ic__week-title">
          <i class="mdi mdi-calendar-clock" aria-hidden="true" />
          {{ t('common.shared.calendar.weekScheduleTitle') }}
        </div>
        <slot v-if="!calendarItems.length" name="empty">
          <div class="osg-ic__week-empty">{{ t('common.shared.calendar.weekScheduleEmpty') }}</div>
        </slot>
        <div
          v-for="item in calendarItems"
          :key="item.id"
          class="osg-ic__week-card"
          :class="`osg-ic__week-card--${item.tone}`"
          @click="emit('event-click', item)"
        >
          <div
            class="osg-ic__week-date"
            :class="`osg-ic__week-date--${item.tone}`"
          >
            <div class="osg-ic__week-date-num">{{ item.dateNum }}</div>
            <div class="osg-ic__week-date-weekday">{{ item.weekday }}</div>
          </div>
          <div class="osg-ic__week-meta">
            <div class="osg-ic__week-meta-title">
              {{ item.studentName || '-' }} - {{ item.company || '-' }}
            </div>
            <div class="osg-ic__week-meta-sub">
              {{ formatHourMinute(item.interviewTime) }} · {{ item.position || '-' }}<template v-if="item.location"> · {{ item.location }}</template>
            </div>
          </div>
          <a-tag :color="item.tagColor" class="osg-ic__week-tag">{{ item.tag }}</a-tag>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInterviewCalendar } from '../composables/useInterviewCalendar'
import type { CalendarRange, CalendarViewMode } from '../composables/useInterviewCalendar'
import type { InterviewEvent } from '../types/interviewCalendar'

const { t } = useI18n()

interface Props {
  events: InterviewEvent[]
  /** 是否显示月份左右箭头（默认 true） */
  showMonthNav?: boolean
  /** 默认是否展开（默认 false） */
  defaultExpanded?: boolean
  /** 标题文案（默认"学员面试安排"） */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  showMonthNav: true,
  defaultExpanded: false,
  title: '',
})

const effectiveTitle = computed(() => props.title || t('common.shared.calendar.titleDefault'))

const emit = defineEmits<{
  (e: 'event-click', event: InterviewEvent): void
  (e: 'month-change', offset: number): void
  (e: 'view-mode-change', mode: CalendarViewMode): void
  (e: 'range-change', range: CalendarRange): void
}>()

const WEEKDAYS_LOCALIZED = computed(() => [
  t('common.shared.calendar.weekdayShort.sun'),
  t('common.shared.calendar.weekdayShort.mon'),
  t('common.shared.calendar.weekdayShort.tue'),
  t('common.shared.calendar.weekdayShort.wed'),
  t('common.shared.calendar.weekdayShort.thu'),
  t('common.shared.calendar.weekdayShort.fri'),
  t('common.shared.calendar.weekdayShort.sat'),
])

const eventsRef = toRef(props, 'events')

const {
  viewMode,
  monthOffset,
  weekOffset,
  currentRangeLabel,
  compactDays,
  summaryEvents,
  monthCells,
  calendarItems,
  currentRange,
  shiftMonth,
  shiftWeek,
  setViewMode,
} = useInterviewCalendar(eventsRef)

const expanded = ref(props.defaultExpanded)
const hasSummary = computed(() => summaryEvents.value.some((item) => !!item.student))

function onShift(offset: number) {
  if (viewMode.value === 'week') {
    shiftWeek(offset)
  } else {
    shiftMonth(offset)
  }
}

function onViewModeChange(mode: CalendarViewMode) {
  setViewMode(mode)
}

watch(monthOffset, (value) => {
  // 月模式下保留旧的 month-change 事件以兼容已订阅页面
  if (viewMode.value === 'month') emit('month-change', value)
})

watch(viewMode, (mode) => {
  emit('view-mode-change', mode)
})

watch(
  currentRange,
  (range) => {
    emit('range-change', range)
  },
  { immediate: false },
)

function formatHourMinute(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

defineExpose({ viewMode, monthOffset, weekOffset, shiftMonth, shiftWeek, setViewMode, expanded })
</script>

<style scoped>
/* ---- toolbar ---- */
.osg-ic__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.osg-ic__title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.osg-ic__title-icon {
  color: var(--primary, #2563eb);
  font-size: 18px;
}
.osg-ic__title {
  font-weight: 600;
  font-size: 13px;
  color: var(--primary, #2563eb);
}
.osg-ic__month-nav {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}
.osg-ic__month-arrow {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  padding: 0 !important;
  font-size: 14px;
  line-height: 1;
  color: var(--muted, #64748b);
}
.osg-ic__month-arrow:hover {
  color: var(--primary, #2563eb);
}
.osg-ic__month-arrow .mdi {
  font-size: 14px;
}
.osg-ic__month {
  font-size: 12px;
  font-weight: 600;
  color: var(--text2, #475569);
  min-width: 28px;
  text-align: center;
}
.osg-ic__month--static {
  margin-left: 6px;
}

/* ---- 月/星期 切换 tab（与月切换按钮风格保持一致：小尺寸/灰底/激活高亮） ---- */
.osg-ic__view-switch {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 2px;
  background: var(--bg, #f1f5f9);
  border-radius: 6px;
  gap: 2px;
}
.osg-ic__view-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted, #64748b);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}
.osg-ic__view-tab:hover {
  color: var(--primary, #2563eb);
}
.osg-ic__view-tab--active {
  background: var(--primary, #2563eb);
  color: #fff;
}
.osg-ic__view-tab--active:hover {
  color: #fff;
}

.osg-ic__divider {
  width: 1px;
  height: 24px;
  background: var(--border, #e2e8f0);
}
.osg-ic__days,
.osg-ic__summary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.osg-ic__toggle {
  margin-left: auto;
  font-size: 11px;
}

/* ---- 折叠态胶囊 ---- */
.osg-ic__day-tag {
  min-width: 40px;
  padding: 4px 8px;
  border-radius: 6px;
  margin-inline-end: 0;
  line-height: 1.2;
}
.osg-ic__day-tag-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.osg-ic__day-tag-week {
  font-size: 10px;
  opacity: 0.75;
}
.osg-ic__day-tag-date {
  font-size: 13px;
  font-weight: 700;
}
.osg-ic__summary-tag {
  display: inline-flex;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  margin-inline-end: 0;
}
.osg-ic__summary-label {
  font-weight: 600;
}
.osg-ic__summary-student {
  opacity: 0.85;
}

/* ---- 展开态：图例 ---- */
.osg-ic__month-view {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border, #e2e8f0);
}
.osg-ic__legend {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--muted, #64748b);
  margin-bottom: 12px;
}
.osg-ic__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.osg-ic__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* ---- 展开态：42 格 ---- */
.osg-ic__month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}
.osg-ic__month-heading {
  text-align: center;
  font-size: 11px;
  color: var(--muted, #64748b);
  padding: 6px 0;
  font-weight: 500;
}
.osg-ic__month-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
}
.osg-ic__month-cell--today {
  background: var(--primary, #2563eb);
  color: #fff;
  font-weight: 700;
}
.osg-ic__month-cell--danger {
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 600;
}
.osg-ic__month-cell--info {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}
.osg-ic__month-cell--default {
  background: #f8fafc;
}
.osg-ic__month-cell--outside {
  opacity: 0.4;
}
.osg-ic__month-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 2px;
}
.osg-ic__month-dot--danger { background: #ef4444; }
.osg-ic__month-dot--info { background: #3b82f6; }
.osg-ic__month-dot--default { background: var(--muted, #64748b); }

/* ---- 展开态：本周事件列表 ---- */
.osg-ic__week-schedule {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.osg-ic__week-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text, #1e293b);
  margin-bottom: 4px;
}
.osg-ic__week-title .mdi {
  color: var(--primary, #2563eb);
  font-size: 16px;
}
.osg-ic__week-empty {
  padding: 16px;
  text-align: center;
  color: var(--muted, #64748b);
  font-size: 12px;
  background: #f8fafc;
  border-radius: 8px;
}
.osg-ic__week-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.osg-ic__week-card:hover {
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}
.osg-ic__week-card--today { border-left: 4px solid var(--primary, #2563eb); }
.osg-ic__week-card--danger { border-left: 4px solid #ef4444; }
.osg-ic__week-card--info { border-left: 4px solid #3b82f6; }
.osg-ic__week-card--default { border-left: 4px solid var(--border, #e2e8f0); }
.osg-ic__week-date {
  min-width: 50px;
  text-align: center;
}
.osg-ic__week-date--today .osg-ic__week-date-num { color: var(--primary, #2563eb); }
.osg-ic__week-date--danger .osg-ic__week-date-num { color: #ef4444; }
.osg-ic__week-date--info .osg-ic__week-date-num { color: #3b82f6; }
.osg-ic__week-date--default .osg-ic__week-date-num { color: var(--text, #1e293b); }
.osg-ic__week-date-num {
  font-size: 20px;
  font-weight: 700;
}
.osg-ic__week-date-weekday {
  font-size: 10px;
  color: var(--muted, #64748b);
  margin-top: 2px;
}
.osg-ic__week-meta {
  flex: 1;
  display: grid;
  gap: 4px;
}
.osg-ic__week-meta-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text, #1e293b);
}
.osg-ic__week-meta-sub {
  font-size: 11px;
  color: var(--muted, #64748b);
}
.osg-ic__week-tag {
  margin-inline-end: 0;
}
</style>
