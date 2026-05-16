<template>
  <div class="osg-positions-footer">
    <i18n-t keypath="common.shared.positions.footer.total" tag="span" class="osg-positions-footer__total">
      <template #count><strong>{{ total }}</strong></template>
    </i18n-t>
    <span class="osg-positions-footer__indicator osg-positions-footer__indicator--open">
      <i class="mdi mdi-circle-small" aria-hidden="true" />
      {{ t('common.shared.positions.footer.open', { n: open }) }}
    </span>
    <span class="osg-positions-footer__indicator osg-positions-footer__indicator--closed">
      <i class="mdi mdi-circle-small" aria-hidden="true" />
      {{ t('common.shared.positions.footer.closed', { n: closed }) }}
    </span>
    <span class="osg-positions-footer__indicator osg-positions-footer__indicator--students">
      <i class="mdi mdi-circle-small" aria-hidden="true" />
      {{ t('common.shared.positions.footer.students', { n: students }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * PositionsFooter — 岗位页面底部 4 项统计行（LM / Assistant 共用）
 *
 * 来源：osg-spec-docs/source/prototype/{lead-mentor,assistant}.html 页面尾部统计区
 * 视觉约束：
 *   - 总数 strong 加粗深色 + "个岗位" 灰字
 *   - 开放中 → 绿 #16a34a
 *   - 已关闭 → 灰 #94a3b8
 *   - 我的学员 → 蓝 #3b82f6（带"人"后缀）
 *
 * 用法：
 *   <PositionsFooter :total="12" :open="10" :closed="2" :students="8" />
 */
defineProps<{
  /** 岗位总数 */
  total: number
  /** 开放中数量 */
  open: number
  /** 已关闭数量 */
  closed: number
  /** 我的学员数量 */
  students: number
}>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.osg-positions-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 8px 0 0;
  margin-top: 16px;
  color: #6e80a4;
  font-size: 13px;
}

.osg-positions-footer__total strong {
  color: #1f2937;
  font-weight: 700;
  margin: 0 4px;
}

.osg-positions-footer__indicator {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
}

.osg-positions-footer__indicator .mdi {
  font-size: 16px;
}

.osg-positions-footer__indicator--open {
  color: #16a34a;
}

.osg-positions-footer__indicator--closed {
  color: #94a3b8;
}

.osg-positions-footer__indicator--students {
  color: #3b82f6;
}
</style>
