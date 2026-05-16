<template>
  <div class="company-position-cell">
    <div
      class="company-position-cell__name"
      :class="[toneClass, { 'company-position-cell__name--highlight': highlight }]"
    >
      <strong>{{ displayCompany }}</strong>
    </div>
    <div v-if="metaText" class="company-position-cell__meta">{{ metaText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 公司 + 岗位 + 地点 cell（三端共用）
 *
 * 用法：
 *   - Assistant: <CompanyPositionCell :company :position :location />
 *   - LM (pending): <CompanyPositionCell :company :role meta-mode="role-only" />
 *   - LM (coaching/managed): <CompanyPositionCell :company :role meta-mode="role-only" :tone-class="record.companyTone" />
 *   - Mentor: <CompanyPositionCell :company :position :location :highlight="record.coachingStatus === 'new'" />
 *
 * meta 行展示规则：
 *   - 'position-location'（默认）: "<position> · <location>" — Assistant / Mentor 用
 *   - 'role-only': "<role>" — LM 用
 */
const props = withDefaults(
  defineProps<{
    /** 公司名 */
    company?: string | null
    /** 岗位（position-location 模式用） */
    position?: string | null
    /** 地点（position-location 模式用） */
    location?: string | null
    /** 角色（role-only 模式用） */
    role?: string | null
    /** 公司名空值 fallback，默认 "-" */
    companyFallback?: string
    /** 地点空值 fallback，默认 "地区待补充" */
    locationFallback?: string
    /** meta 行分隔符，默认 " · " */
    metaSeparator?: string
    /** meta 行展示模式 */
    metaMode?: 'position-location' | 'role-only'
    /** 公司名高亮（红色），用于 Mentor 的 coachingStatus=new 场景 */
    highlight?: boolean
    /** 自定义 tone class（如 LM 的 companyTone：'company-tone-positive' 等） */
    toneClass?: string
  }>(),
  {
    company: '',
    position: '',
    location: '',
    role: '',
    companyFallback: '-',
    locationFallback: '',
    metaSeparator: ' · ',
    metaMode: 'position-location',
    highlight: false,
    toneClass: '',
  },
)

const { t } = useI18n()

const displayCompany = computed(() => {
  const raw = String(props.company ?? '').trim()
  return raw || props.companyFallback
})

const metaText = computed(() => {
  if (props.metaMode === 'role-only') {
    return String(props.role ?? '').trim()
  }
  // position-location mode
  const pos = String(props.position ?? '').trim() || '-'
  const loc = String(props.location ?? '').trim() || props.locationFallback || t('common.shared.companyPosition.locationFallback')
  return `${pos}${props.metaSeparator}${loc}`
})
</script>

<style scoped>
.company-position-cell__name {
  font-weight: 600;
}

.company-position-cell__name--highlight {
  color: #ef4444;
}

.company-position-cell__meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}
</style>
