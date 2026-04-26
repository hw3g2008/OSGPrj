<template>
  <span class="osg-practice-type-tag" :class="toneClass">
    <i v-if="showIcon && iconClass" class="mdi" :class="iconClass" aria-hidden="true" />
    {{ displayText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolvePracticeTypeToneClass,
  resolvePracticeTypeLabel,
  resolvePracticeTypeIcon,
} from '../utils/practiceTone'

/**
 * 模拟应聘类型标签（Assistant / Mentor / Lead-Mentor 三端共用）
 *
 * SSOT：原型 prototype/assistant.html + lead-mentor.html 模拟应聘列表「类型」列
 *
 * 用法：
 *   <PracticeTypeTag :practice-type="record.practiceType" show-icon />     <!-- asst (英文 enum) -->
 *   <PracticeTypeTag :practice-type="record.practiceType" show-icon />     <!-- mentor (英文 enum) -->
 *   <PracticeTypeTag :practice-type="row.practiceType" show-icon />        <!-- LM (中文 label) -->
 *
 * practiceType 兼容：
 *   - 英文 enum: mock_interview / relation_test / communication_test / midterm / midterm_exam
 *   - 中文 label: 模拟面试 / 人际关系测试 / 沟通测试 / 期中考试
 */
const props = withDefaults(
  defineProps<{
    /** 类型（英文 enum 或中文 label，组件自动归一化） */
    practiceType?: string | null
    /** 自定义文案（不传走默认中文 label） */
    label?: string
    /** 是否显示图标，默认 false */
    showIcon?: boolean
  }>(),
  {
    practiceType: '',
    label: '',
    showIcon: false,
  },
)

const toneClass = computed(() => resolvePracticeTypeToneClass(props.practiceType))

const iconClass = computed(() => resolvePracticeTypeIcon(props.practiceType))

const displayText = computed(() => {
  const custom = String(props.label ?? '').trim()
  return custom || resolvePracticeTypeLabel(props.practiceType)
})
</script>

<style scoped>
.osg-practice-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.osg-practice-type-tag .mdi {
  font-size: 14px;
}

.osg-practice-type-tag--mock-interview {
  background: #dbeafe;
  color: #1e40af;
}

.osg-practice-type-tag--relation-test {
  background: #fef3c7;
  color: #92400e;
}

.osg-practice-type-tag--midterm {
  background: #8b5cf6;
  color: #ffffff;
}
</style>
