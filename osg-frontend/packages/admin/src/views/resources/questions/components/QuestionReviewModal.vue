<template>
  <div v-if="modelValue" class="review-modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="review-modal">
      <header class="review-modal__header">
        <div>
          <p class="review-modal__eyebrow">Review Center</p>
          <h3>审核面试真题</h3>
        </div>
        <button type="button" class="review-modal__close" @click="$emit('update:modelValue', false)">×</button>
      </header>

      <div v-if="row" class="review-modal__body">
        <section class="review-modal__section">
          <h4>学员信息</h4>
          <div class="info-grid info-grid--three">
            <article>
              <span>提交学员</span>
              <strong>{{ row.studentName }}</strong>
              <small>{{ row.studentId || '—' }}</small>
            </article>
            <article>
              <span>来源</span>
              <strong>{{ row.sourceType }}</strong>
            </article>
            <article>
              <span>提交时间</span>
              <strong>{{ formatTime(row.submittedAt) }}</strong>
            </article>
          </div>
        </section>

        <section class="review-modal__section">
          <h4>面试信息</h4>
          <div class="info-grid">
            <article>
              <span>公司</span>
              <strong>{{ row.companyName }}</strong>
            </article>
            <article>
              <span>部门</span>
              <strong>{{ row.departmentName }}</strong>
            </article>
            <article>
              <span>办公地点</span>
              <strong>{{ row.officeLocation }}</strong>
            </article>
            <article>
              <span>轮次</span>
              <strong>{{ row.interviewRound }}</strong>
            </article>
            <article>
              <span>面试日期</span>
              <strong>{{ formatTime(row.interviewDate) }}</strong>
            </article>
            <article>
              <span>面试官</span>
              <strong>{{ row.interviewerName || '—' }}</strong>
            </article>
            <article>
              <span>面试状态</span>
              <strong>{{ row.interviewStatus }}</strong>
            </article>
          </div>
        </section>

        <section class="review-modal__section">
          <h4>面试题目</h4>
          <ol class="question-list">
            <li v-for="(item, index) in row.questionItems || []" :key="`${row.questionId}-${index}`">
              <strong>Q{{ index + 1 }}</strong>
              <span>{{ item }}</span>
            </li>
          </ol>
        </section>

        <section class="review-modal__section">
          <h4>补充说明</h4>
          <p class="note-box">{{ row.supplementalNote || '无补充说明' }}</p>
        </section>

        <section class="review-modal__section review-modal__section--success">
          <h4>开放范围预览</h4>
          <p>
            将开放给申请 {{ row.sharePreview || '同公司 + 同部门 + 同办公地点 + 同面试状态' }} 的学生，
            当前符合条件：{{ row.eligibleStudentCount || 0 }} 人
          </p>
        </section>

        <label class="review-comment">
          <span>审核备注</span>
          <textarea v-model.trim="comment" rows="3" placeholder="补充审核意见（可选）" />
        </label>
      </div>

      <footer class="review-modal__footer">
        <button type="button" class="ghost-button" @click="$emit('update:modelValue', false)">取消</button>
        <button type="button" class="ghost-button ghost-button--danger" :disabled="submitting || !row" @click="emitReject">驳回</button>
        <button type="button" class="primary-button" :disabled="submitting || !row" @click="emitApprove">通过并开放</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { InterviewQuestionRow } from '@osg/shared/api/admin/question'

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

<style scoped>
.review-modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.48);
  z-index: 80;
}

.review-modal {
  width: min(960px, 100%);
  max-height: 90vh;
  overflow: auto;
  border-radius: 28px;
  background: #f8fafc;
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.24);
}

.review-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 28px;
  color: #fff;
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
}

.review-modal__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.76;
}

.review-modal__header h3 {
  margin: 0;
  font-size: 28px;
}

.review-modal__close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 28px;
  cursor: pointer;
}

.review-modal__body {
  display: grid;
  gap: 18px;
  padding: 24px 28px 8px;
}

.review-modal__section {
  padding: 18px 20px;
  border: 1px solid #dbe4f0;
  border-radius: 22px;
  background: #fff;
}

.review-modal__section h4 {
  margin: 0 0 14px;
  font-size: 16px;
}

.review-modal__section--success {
  background: linear-gradient(135deg, #dcfce7, #f0fdf4);
  border-color: #86efac;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.info-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-grid article {
  padding: 12px 14px;
  border-radius: 18px;
  background: #f8fafc;
}

.info-grid span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #64748b;
}

.question-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding-left: 18px;
}

.question-list li {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-left: 4px solid #4f83cc;
  border-radius: 16px;
  background: #f8fafc;
}

.note-box {
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
}

.review-comment {
  display: grid;
  gap: 8px;
}

.review-comment span {
  font-size: 13px;
  font-weight: 600;
}

.review-comment textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  resize: vertical;
}

.review-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px 28px;
}

.primary-button,
.ghost-button {
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.ghost-button {
  border: 1px solid #cbd5e1;
  color: #0f172a;
  background: #fff;
}

.ghost-button--danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff1f2;
}

@media (max-width: 760px) {
  .review-modal-backdrop {
    padding: 12px;
  }

  .review-modal__header,
  .review-modal__body,
  .review-modal__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .info-grid--three {
    grid-template-columns: 1fr;
  }

  .review-modal__footer {
    flex-direction: column;
  }
}
</style>
