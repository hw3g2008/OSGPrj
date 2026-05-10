<template>
  <ClassReportFlowModal
    :visible="visible"
    end="lead-mentor"
    :prefilled-student-id="prefilledStudentId"
    :prefilled-reference-type="prefilledReferenceType"
    :prefilled-reference-id="prefilledReferenceId"
    :readonly-fields="readonlyFields"
    @update:visible="emit('update:visible', $event)"
    @submitted="emit('submitted', $event)"
  />
</template>

<script setup lang="ts">
import { ClassReportFlowModal } from '@osg/shared/components'
import type { ClassReportPayload, ReferenceType } from '@osg/shared/types/classReport'

defineProps<{
  visible: boolean
  prefilledStudentId?: number
  prefilledReferenceType?: ReferenceType
  prefilledReferenceId?: number
  readonlyFields?: Array<keyof ClassReportPayload | 'student' | 'reference'>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: [recordId: number]
}>()
</script>
