<template>
  <OverlaySurfaceModal
    surface-id="modal-question-review"
    :open="modelValue"
    width="900px"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-check-outline" aria-hidden="true" />
        <span>审核面试真题</span>
      </span>
    </template>

    <div v-if="row" style="display:grid;gap:18px">
      <a-card size="small" title="学员信息">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item label="提交学员">{{ row.studentName }} <span style="color:#94a3b8">{{ row.studentId || '—' }}</span></a-descriptions-item>
          <a-descriptions-item label="来源">{{ row.sourceType }}</a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ formatTime(row.submittedAt) }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" title="面试信息">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item label="公司">{{ row.companyName }}</a-descriptions-item>
          <a-descriptions-item label="部门">{{ row.departmentName }}</a-descriptions-item>
          <a-descriptions-item label="办公地点">{{ row.officeLocation }}</a-descriptions-item>
          <a-descriptions-item label="轮次">{{ row.interviewRound }}</a-descriptions-item>
          <a-descriptions-item label="面试日期">{{ formatTime(row.interviewDate) }}</a-descriptions-item>
          <a-descriptions-item label="面试官">{{ row.interviewerName || '—' }}</a-descriptions-item>
          <a-descriptions-item label="面试状态">{{ row.interviewStatus }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card size="small" title="面试题目">
        <ol style="display:grid;gap:10px;margin:0;padding-left:18px">
          <li v-for="(item, index) in row.questionItems || []" :key="`${row.questionId}-${index}`" style="padding:10px 12px;border-left:4px solid #4f83cc;border-radius:12px;background:#f8fafc">
            <strong>Q{{ index + 1 }}</strong>
            <span style="margin-left:8px">{{ item }}</span>
          </li>
        </ol>
      </a-card>

      <a-card size="small" title="补充说明">
        <p style="margin:0;color:#334155">{{ row.supplementalNote || '无补充说明' }}</p>
      </a-card>

      <a-alert type="success" show-icon style="border-radius:12px">
        <template #message>开放范围预览</template>
        <template #description>
          将开放给申请 {{ row.sharePreview || '同公司 + 同部门 + 同办公地点 + 同面试状态' }} 的学生，
          当前符合条件：{{ row.eligibleStudentCount || 0 }} 人
        </template>
      </a-alert>

      <a-form layout="vertical">
        <a-form-item label="审核备注">
          <a-textarea v-model:value="comment" :rows="3" placeholder="补充审核意见（可选）" />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">取消</a-button>
      <a-button danger :loading="submitting" :disabled="!row" @click="emitReject">驳回</a-button>
      <a-button type="primary" :loading="submitting" :disabled="!row" @click="emitApprove">通过并开放</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { InterviewQuestionRow } from '@osg/shared/api/admin/question'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  modelValue: boolean
  row: InterviewQuestionRow | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'approve', payload: { row: InterviewQuestionRow; reviewComment?: string }): void
  (event: 'reject', payload: { row: InterviewQuestionRow; reviewComment?: string }): void
}>()

const comment = ref('')

const row = computed(() => props.row)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible)
    {
      comment.value = props.row?.reviewComment || ''
    }
  }
)

const emitApprove = () => {
  if (!row.value) return
  emit('approve', { row: row.value, reviewComment: comment.value || undefined })
}

const emitReject = () => {
  if (!row.value) return
  emit('reject', { row: row.value, reviewComment: comment.value || undefined })
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}
</script>
