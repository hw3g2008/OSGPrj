<template>
  <div class="relation-feedback osg-modal-form" data-feedback="relation">
    <div class="rating-section">
      <div
        v-for="item in RELATION_RATING_ITEMS"
        :key="item.key"
        class="rating-row"
        :data-rating-key="item.key"
      >
        <div class="rating-row__head">
          <span class="rating-row__label">{{ t(item.label) }}</span>
          <span class="rating-row__max">{{ t('common.shared.classReport.relation.maxScoreSuffix', { max: item.max }) }}</span>
        </div>
        <a-input-number
          :value="payload.scores[item.key]"
          :min="1"
          :max="item.max"
          :step="1"
          :placeholder="`1-${item.max}`"
          style="width: 120px"
          @update:value="updateScore(item.key, $event)"
        />
        <!-- T-517: description 始终渲染（占位 "TBD" 也正常显示，不报错），不用 v-if -->
        <div class="rating-row__desc">{{ t(item.description) }}</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.relation.recommendLabel') }}</label>
      <a-radio-group
        :value="payload.recommendation"
        @update:value="update('recommendation', $event)"
      >
        <a-radio value="yes">{{ t('common.shared.classReport.relation.recommend.yes') }}</a-radio>
        <a-radio value="maybe">{{ t('common.shared.classReport.relation.recommend.maybe') }}</a-radio>
        <a-radio value="no">{{ t('common.shared.classReport.relation.recommend.no') }}</a-radio>
      </a-radio-group>
    </div>

    <!-- T-508: 截图上传 — ScreenshotUpload widget，png/jpg/pdf，≤10MB，≤10张 -->
    <!-- screenshotUrls 落 osg_class_record.screenshot_urls 列，不进 feedbackContent JSON -->
    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.relation.screenshotLabel') }}</label>
      <ScreenshotUpload
        :model-value="screenshotUrls"
        :max-count="10"
        :max-size-mb="10"
        accept=".png,.jpg,.jpeg,.pdf"
        @update:model-value="onScreenshotUrlsChange"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.relation.narrativeLabel') }}</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        :placeholder="t('common.shared.classReport.relation.narrativePlaceholder')"
        @update:value="update('narrative', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RELATION_RATING_ITEMS } from '../../../constants/classReport'

const { t } = useI18n()
import ScreenshotUpload from '../widgets/ScreenshotUpload.vue'

export type RelationRatingKey =
  | 'emailQuality'
  | 'etiquette'
  | 'smallTalk'
  | 'callQuality'
  | 'thankYouEmail'

export type RelationRecommendation = 'yes' | 'maybe' | 'no' | ''

/**
 * T-508: screenshotUrls 已从 feedbackContent 中移出，独立落 osg_class_record.screenshot_urls 列。
 * RelationFeedbackPayload 不再含 screenshotUrls，父弹窗通过独立 prop/event 管理截图列表。
 */
export interface RelationFeedbackPayload {
  schemaVersion: 1
  scores: Record<RelationRatingKey, number | null>
  recommendation: RelationRecommendation
  narrative: string
}

const props = defineProps<{
  modelValue?: Partial<RelationFeedbackPayload>
  /**
   * T-508: 截图 URL 列表（独立于 feedbackContent），
   * 落 osg_class_record.screenshot_urls 列（TEXT，JSON 数组）
   */
  screenshotUrls?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RelationFeedbackPayload]
  /**
   * T-508: 截图 URL 变更 → 父弹窗将其写入独立的 screenshotUrls 字段
   */
  'update:screenshotUrls': [value: string[]]
}>()

function defaults(): RelationFeedbackPayload {
  return {
    schemaVersion: 1,
    scores: {
      emailQuality: null,
      etiquette: null,
      smallTalk: null,
      callQuality: null,
      thankYouEmail: null,
    },
    recommendation: '',
    narrative: '',
  }
}

const payload = computed<RelationFeedbackPayload>(() => {
  const base = defaults()
  const incoming = (props.modelValue || {}) as Partial<RelationFeedbackPayload>
  return {
    ...base,
    ...incoming,
    schemaVersion: 1,
    scores: { ...base.scores, ...(incoming.scores || {}) },
  }
})

function update<K extends keyof RelationFeedbackPayload>(
  key: K,
  value: RelationFeedbackPayload[K],
) {
  emit('update:modelValue', { ...payload.value, [key]: value })
}

function updateScore(key: RelationRatingKey, value: number | null) {
  emit('update:modelValue', {
    ...payload.value,
    scores: { ...payload.value.scores, [key]: value },
  })
}

/**
 * T-508: ScreenshotUpload widget emit → 上报到父弹窗，父弹窗持久化到独立 screenshotUrls 字段
 */
function onScreenshotUrlsChange(urls: string[]) {
  emit('update:screenshotUrls', urls)
}
</script>

<style scoped lang="scss">
.relation-feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rating-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.rating-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rating-row__head {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.rating-row__max {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
}

/* T-517: description 行样式 — 即使为 "TBD" 占位也正常渲染，line-height 与字号与正式文案一致 */
.rating-row__desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  min-height: 1.2em;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
</style>
