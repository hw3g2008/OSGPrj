<template>
  <a-tooltip :title="effectiveTitle" placement="right" :mouseEnterDelay="0.1">
    <span ref="textEl" class="osg-ellipsis-text" @mouseenter="checkTrunc">
      <slot>{{ text }}</slot>
    </span>
  </a-tooltip>
</template>

<script setup lang="ts">
/**
 * OsgEllipsisText — 单行文本省略 + 仅在截断时显示 tooltip
 *
 * 容器需保证可收缩（在 flex 子项里给 `flex: 1; min-width: 0;`），否则文字会撑爆父级。
 *
 * 实现：tooltip 始终挂载，title 在文本未截断时为空（ant-tooltip 对空 title 不渲染气泡），
 * 截断时为完整文本。截断状态由 ResizeObserver + mouseenter 双触发计算。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  /** 文本内容；也可直接用默认 slot */
  text?: string
  /** 自定义 tooltip 标题；默认用 text */
  title?: string
}>()

const textEl = ref<HTMLSpanElement>()
const truncated = ref(false)

const fullText = computed(() => props.title ?? props.text ?? '')
const effectiveTitle = computed(() => (truncated.value ? fullText.value : ''))

const checkTrunc = () => {
  const node = textEl.value
  truncated.value = !!node && node.scrollWidth - node.clientWidth > 1
}

let ro: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && textEl.value) {
    ro = new ResizeObserver(checkTrunc)
    ro.observe(textEl.value)
  }
  checkTrunc()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})
</script>

<style scoped>
.osg-ellipsis-text {
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
