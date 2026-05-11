<template>
  <header class="page-header">
    <div class="page-header__text">
      <h1
        class="page-header__title"
      >{{ titleZh }}<span
        v-if="titleEn"
        class="page-header__title-en"
      >{{ titleEn }}</span></h1>
      <p v-if="description" class="page-header__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * PageHeader — 三端共用页头原子组件（M0.5 Phase 2.1）
 *
 * 设计依据：
 *   - 范围 C-1（A + Vue3 admin），覆盖 Asst 8 + Admin 30 + LM 7 + Mentor 5+1 = 50 view
 *   - D-Bilingual = P1（双 prop titleZh + titleEn，inline 同行渲染）
 *   - D-Naming = BEM（page-header / __text / __title / __title-en / __desc / __actions）
 *   - D-MarginBottom = 24px（与 Mentor/LM/Asst legacy schedule 内嵌端现状一致）
 *
 * 详见：docs/architecture/shared-infrastructure/m0.5-step1-pageheader-extraction-plan.md §3-§4
 */

defineProps<{
  /** 中文主标，例 '学员求职总览'。必传。 */
  titleZh: string
  /** 英文标题，例 'Job Overview'。同行内联渲染（h1 内嵌 span）。可选。 */
  titleEn?: string
  /** 副标说明，例 '查看我辅导和管理的学员求职进度'。可选。 */
  description?: string
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--osg-page-header-row-gap);
  margin-bottom: var(--osg-page-header-mb);
}

.page-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--osg-page-header-text-gap);
}

.page-header__title {
  margin: 0;
  font-size: var(--osg-page-header-title-size);
  font-weight: var(--osg-font-weight-bold);
  color: var(--text, #1E293B);
  line-height: var(--osg-line-height-tight);
}

.page-header__title-en {
  margin-left: var(--osg-space-2);
  font-size: var(--osg-page-header-title-en-size);
  font-weight: var(--osg-font-weight-regular);
  color: var(--muted, #94A3B8);
  /* 关键：不强制 uppercase，与 V1 内嵌端视觉一致 */
}

.page-header__desc {
  margin: 0;
  font-size: var(--osg-page-header-desc-size);
  color: var(--text2, #64748B);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--osg-page-header-action-gap);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
