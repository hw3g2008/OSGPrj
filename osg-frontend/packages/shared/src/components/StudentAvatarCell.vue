<template>
  <div class="student-cell">
    <div class="student-cell__avatar" :style="avatarStyle">{{ avatarChar }}</div>
    <div class="student-cell__info">
      <div class="student-cell__name">{{ displayName }}</div>
      <div v-if="showId" class="student-cell__meta">ID: {{ displayId }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveAvatarColor } from '../utils/jobOverviewTone'

/**
 * 学员头像 cell（三端共用）
 *
 * 用法：
 *   - Assistant: <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
 *   - LM: <StudentAvatarCell :name="record.studentName" :id="record.studentId" :background-color="record.avatarColor" />
 *   - Mentor: <StudentAvatarCell :name="record.studentName" :id="record.studentId" :background-color="avatarColor(record)" />
 *
 * SSOT 规则（默认颜色）：见 @osg/shared/utils/jobOverviewTone.ts → resolveAvatarColor()
 *
 * 自定义颜色：如端有数据驱动的 avatarColor 字段（LM）或自定义算法（Mentor），传 background-color prop 覆盖默认。
 */
const props = withDefaults(
  defineProps<{
    /** 学员姓名 */
    name?: string | null
    /** 学员 ID */
    id?: number | string | null
    /** 是否显示 ID 行，默认 true */
    showId?: boolean
    /** 自定义头像背景色（覆盖默认 SSOT palette） */
    backgroundColor?: string
    /** 姓名为空时的默认值 */
    nameFallback?: string
    /** ID 为空时的默认值 */
    idFallback?: string
  }>(),
  {
    name: '',
    id: null,
    showId: true,
    backgroundColor: '',
    nameFallback: '-',
    idFallback: '-',
  },
)

const displayName = computed(() => {
  const raw = String(props.name ?? '').trim()
  return raw || props.nameFallback
})

const displayId = computed(() => {
  if (props.id === null || props.id === undefined || props.id === '') {
    return props.idFallback
  }
  return String(props.id)
})

const avatarChar = computed(() => {
  const raw = String(props.name ?? '').trim()
  return raw.charAt(0) || '学'
})

const avatarStyle = computed(() => {
  const bg = props.backgroundColor || resolveAvatarColor(props.name)
  return { background: bg }
})
</script>

<style scoped>
.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.student-cell__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.student-cell__info {
  min-width: 0;
}

.student-cell__name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-cell__meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
