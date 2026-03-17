<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="assign-mock-practice-modal"
    width="760px"
    :body-class="'assign-mock-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="assign-mock-modal__title-wrap">
        <div>
          <span class="assign-mock-modal__eyebrow">Mock Practice Dispatch</span>
          <div class="assign-mock-modal__title">
            <span class="mdi mdi-account-voice" aria-hidden="true"></span>
            <span>处理模拟应聘申请</span>
          </div>
        </div>
        <span class="assign-mock-modal__hint">为当前申请分配导师并锁定预约时间，提交后状态会切到已安排。</span>
      </div>
    </template>

    <section class="assign-mock-modal__hero">
      <div class="assign-mock-modal__avatar">{{ studentInitials }}</div>
      <div class="assign-mock-modal__summary">
        <strong>{{ row?.studentName || '待分配学员' }}</strong>
        <span>ID {{ row?.studentId || '--' }}</span>
        <span>{{ practiceTypeLabel }}</span>
      </div>
      <div class="assign-mock-modal__meta">
        <span class="assign-mock-modal__meta-chip">建议导师 {{ requestedCount }} 位</span>
        <span class="assign-mock-modal__meta-chip assign-mock-modal__meta-chip--accent">{{ preferredMentorLabel }}</span>
      </div>
    </section>

    <section class="assign-mock-modal__section">
      <header class="assign-mock-modal__section-head">
        <div>
          <h3>分配导师</h3>
          <p>意向导师会优先默认勾选，可继续补充协同导师。</p>
        </div>
        <span class="assign-mock-modal__section-badge">支持多导师</span>
      </header>

      <div v-if="mentorOptions.length" class="assign-mock-modal__grid">
        <label
          v-for="option in mentorOptions"
          :key="option.mentorId"
          :class="[
            'assign-mock-modal__option',
            {
              'assign-mock-modal__option--selected': selectedMentorIds.includes(option.mentorId),
              'assign-mock-modal__option--preferred': option.preferred
            }
          ]"
        >
          <input
            v-model="selectedMentorIds"
            class="assign-mock-modal__checkbox"
            type="checkbox"
            :value="option.mentorId"
          />
          <div class="assign-mock-modal__option-copy">
            <strong>{{ option.mentorName }}</strong>
            <span>{{ option.mentorBackground }}</span>
          </div>
          <span v-if="option.preferred" class="assign-mock-modal__preferred-flag">意向导师</span>
        </label>
      </div>
      <div v-else class="assign-mock-modal__empty">当前没有可分配导师，请先补充导师目录。</div>
    </section>

    <section class="assign-mock-modal__section assign-mock-modal__section--schedule">
      <label class="assign-mock-modal__field">
        <span>预约时间</span>
        <input v-model="scheduledAt" class="assign-mock-modal__datetime" type="datetime-local" />
      </label>
      <label class="assign-mock-modal__field">
        <span>备注说明</span>
        <textarea
          v-model="note"
          class="assign-mock-modal__textarea"
          rows="4"
          maxlength="160"
          placeholder="例如：先安排行为面模拟，下一次补 technical drill。"
        />
      </label>
    </section>

    <template #footer>
      <div class="assign-mock-modal__footer">
        <button type="button" class="permission-button permission-button--outline" @click="handleClose">取消</button>
        <button
          type="button"
          class="permission-button permission-button--primary"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '确认安排' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { MockPracticeListItem } from '@osg/shared/api/admin/mockPractice'

interface MentorOption {
  mentorId: number
  mentorName: string
  mentorBackground: string
  preferred: boolean
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: MockPracticeListItem | null
  mentorOptions: MentorOption[]
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: {
    mentorIds: number[]
    mentorNames: string[]
    mentorBackgrounds: string[]
    scheduledAt: string
    note: string
  }]
}>()

const selectedMentorIds = ref<number[]>([])
const scheduledAt = ref('')
const note = ref('')

const studentInitials = computed(() => {
  const value = props.row?.studentName || '学员'
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || '暂无意向导师')
const practiceTypeLabel = computed(() => formatPracticeType(props.row?.practiceType))

watch(
  () => [props.visible, props.row?.practiceId] as const,
  ([visible]) => {
    if (!visible) {
      selectedMentorIds.value = []
      scheduledAt.value = ''
      note.value = ''
      return
    }

    selectedMentorIds.value = props.mentorOptions
      .filter((option) => option.preferred)
      .slice(0, requestedCount.value)
      .map((option) => option.mentorId)
    scheduledAt.value = ''
    note.value = ''
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!selectedMentorIds.value.length) {
    message.warning('请至少选择1位导师')
    return
  }
  if (!scheduledAt.value) {
    message.warning('请选择预约时间')
    return
  }

  const selected = props.mentorOptions.filter((option) => selectedMentorIds.value.includes(option.mentorId))
  emit('submit', {
    mentorIds: selected.map((option) => option.mentorId),
    mentorNames: selected.map((option) => option.mentorName),
    mentorBackgrounds: selected.map((option) => option.mentorBackground),
    scheduledAt: scheduledAt.value,
    note: note.value.trim()
  })
}

function formatPracticeType(value?: string) {
  if (value === 'mock_interview') return '模拟面试'
  if (value === 'communication_test') return '人际关系测试'
  if (value === 'midterm_exam') return '期中考试'
  return '模拟应聘'
}
</script>

<style scoped lang="scss">
.assign-mock-modal__title-wrap {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.assign-mock-modal__eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7a8ea8;
}

.assign-mock-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.assign-mock-modal__hint {
  max-width: 240px;
  font-size: 12px;
  line-height: 1.6;
  color: #60748e;
  text-align: right;
}

.assign-mock-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(220, 252, 231, 0.92));
}

.assign-mock-modal__avatar {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e, #22c55e);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}

.assign-mock-modal__summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assign-mock-modal__summary strong {
  font-size: 18px;
  color: #10213a;
}

.assign-mock-modal__summary span {
  color: #52637a;
  font-size: 13px;
}

.assign-mock-modal__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.assign-mock-modal__meta-chip {
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.assign-mock-modal__meta-chip--accent {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.assign-mock-modal__section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.assign-mock-modal__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.assign-mock-modal__section-head h3 {
  margin: 0;
  color: #10213a;
  font-size: 16px;
}

.assign-mock-modal__section-head p {
  margin: 6px 0 0;
  color: #60748e;
  font-size: 13px;
}

.assign-mock-modal__section-badge {
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}

.assign-mock-modal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.assign-mock-modal__option {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.assign-mock-modal__option:hover {
  border-color: rgba(15, 118, 110, 0.4);
  transform: translateY(-1px);
}

.assign-mock-modal__option--selected {
  border-color: rgba(15, 118, 110, 0.6);
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.12);
}

.assign-mock-modal__option--preferred {
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.92), rgba(255, 247, 237, 0.92));
}

.assign-mock-modal__checkbox {
  margin-top: 4px;
}

.assign-mock-modal__option-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assign-mock-modal__option-copy strong {
  color: #10213a;
}

.assign-mock-modal__option-copy span {
  color: #60748e;
  font-size: 12px;
}

.assign-mock-modal__preferred-flag {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: #b91c1c;
}

.assign-mock-modal__empty {
  padding: 18px;
  border-radius: 16px;
  text-align: center;
  color: #60748e;
  background: rgba(241, 245, 249, 0.85);
}

.assign-mock-modal__section--schedule {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.assign-mock-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assign-mock-modal__field span {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.assign-mock-modal__datetime,
.assign-mock-modal__textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #fff;
  color: #10213a;
  padding: 12px 14px;
  font: inherit;
  resize: vertical;
}

.assign-mock-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 900px) {
  .assign-mock-modal__hero {
    grid-template-columns: 1fr;
  }

  .assign-mock-modal__meta {
    align-items: flex-start;
  }

  .assign-mock-modal__section--schedule {
    grid-template-columns: 1fr;
  }
}
</style>
