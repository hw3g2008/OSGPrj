<template>
  <ClassReportFlowModal
    :visible="visible"
    end="mentor"
    :prefilled-student-id="prefilledStudentId"
    :prefilled-reference-type="prefilledReferenceType"
    :prefilled-reference-id="prefilledReferenceId"
    @update:visible="onUpdateVisible"
    @submitted="emit('submitted', $event)"
  />
</template>

<script setup lang="ts">
import { ClassReportFlowModal } from '@osg/shared/components'
import type { ReferenceType } from '@osg/shared/types/classReport'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    prefilledStudentId?: number
    prefilledReferenceType?: ReferenceType
    prefilledReferenceId?: number
  }>(),
  { visible: true },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
  submitted: [recordId: number]
}>()

function onUpdateVisible(v: boolean) {
  emit('update:visible', v)
  if (!v) emit('close')
}
</script>
