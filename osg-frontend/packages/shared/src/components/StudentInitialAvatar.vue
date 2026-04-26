<template>
  <div class="osg-student-avatar" :style="avatarStyle">{{ initial }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveAvatarColor } from '../utils/jobOverviewTone'

/**
 * 学员姓名首字母圆头像（atom 组件，三端共用）
 *
 * 用法（hero / schedule / modal 详情等非表格 cell 场景）：
 *   <StudentInitialAvatar :name="record.studentName" />
 *   <StudentInitialAvatar :name="user.name" :size="48" :color="brand" />
 *
 * SSOT 规则（默认颜色）：见 @osg/shared/utils/jobOverviewTone.ts → resolveAvatarColor()
 *
 * 与 <StudentAvatarCell> 区别：
 *   - StudentAvatarCell：表格 cell 组合控件（头像 + 姓名 + ID）
 *   - StudentInitialAvatar：纯头像 atom，可独立使用
 */
const props = withDefaults(
  defineProps<{
    /** 学员姓名（取首字符显示） */
    name?: string | null
    /** 头像直径（px），同时影响字体大小（约为 size * 0.4） */
    size?: number
    /** 自定义背景色（覆盖默认 SSOT palette） */
    color?: string
    /** 姓名为空时的 fallback 字符 */
    fallback?: string
  }>(),
  {
    name: '',
    size: 36,
    color: '',
    fallback: '学',
  },
)

const initial = computed(() => {
  const raw = String(props.name ?? '').trim()
  return raw.charAt(0) || props.fallback
})

const avatarStyle = computed(() => {
  const bg = props.color || resolveAvatarColor(props.name)
  const size = props.size
  const fontSize = Math.round(size * 0.4)
  return {
    width: `${size}px`,
    height: `${size}px`,
    'font-size': `${fontSize}px`,
    background: bg,
    'border-radius': '50%',
  }
})
</script>

<style scoped>
.osg-student-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
