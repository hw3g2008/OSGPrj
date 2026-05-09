<template>
  <ClassReportFlowModal
    :visible="visible"
    end="lead-mentor"
    :prefilled-student-id="prefilledStudentId"
    :prefilled-reference-type="prefilledReferenceType"
    :prefilled-reference-id="prefilledReferenceId"
    @update:visible="emit('update:visible', $event)"
    @submitted="emit('submitted', $event)"
  />
</template>

<script setup lang="ts">
import { ClassReportFlowModal } from '@osg/shared/components'
import type { ReferenceType } from '@osg/shared/types/classReport'

defineProps<{
  visible: boolean
  prefilledStudentId?: number
  prefilledReferenceType?: ReferenceType
  prefilledReferenceId?: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: [recordId: number]
}>()
</script>
