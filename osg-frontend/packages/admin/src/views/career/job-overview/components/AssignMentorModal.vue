<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="assign-mentor-modal"
    width="760px"
    :body-class="'assign-mentor-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="assign-mentor-modal__title-wrap">
        <div>
          <span class="assign-mentor-modal__eyebrow">Mentor Assignment</span>
          <div class="assign-mentor-modal__title">
            <span class="mdi mdi-account-tie-hat" aria-hidden="true"></span>
            <span>分配导师</span>
          </div>
        </div>
        <span class="assign-mentor-modal__hint">按学员意向导师优先分配，并记录本次安排备注。</span>
      </div>
    </template>

    <section class="assign-mentor-modal__hero">
      <div class="assign-mentor-modal__avatar">{{ studentInitials }}</div>
      <div class="assign-mentor-modal__summary">
        <strong>{{ row?.studentName || '待分配学员' }}</strong>
        <span>ID {{ row?.studentId || '--' }}</span>
        <span>{{ row?.companyName || '-' }} / {{ row?.positionName || '-' }}</span>
      </div>
      <div class="assign-mentor-modal__meta">
        <span class="assign-mentor-modal__meta-chip">建议分配 {{ requestedCount }} 位导师</span>
        <span class="assign-mentor-modal__meta-chip assign-mentor-modal__meta-chip--accent">
          {{ preferredMentorLabel }}
        </span>
      </div>
    </section>

    <section class="assign-mentor-modal__section">
      <header class="assign-mentor-modal__section-head">
        <div>
          <h3>导师候选池</h3>
          <p>意向导师会被高亮标记，checkbox 可直接勾选本次分配名单。</p>
        </div>
        <span class="assign-mentor-modal__section-badge">意向导师优先</span>
      </header>

      <div v-if="mentorOptions.length" class="assign-mentor-modal__grid">
        <label
          v-for="option in mentorOptions"
          :key="option.mentorId"
          :class="[
            'assign-mentor-modal__option',
            {
              'assign-mentor-modal__option--selected': selectedMentorIds.includes(option.mentorId),
              'assign-mentor-modal__option--preferred': option.preferred
            }
          ]"
        >
          <input
            v-model="selectedMentorIds"
            class="assign-mentor-modal__checkbox"
            type="checkbox"
            :value="option.mentorId"
          />
          <div class="assign-mentor-modal__option-copy">
            <strong>{{ option.mentorName }}</strong>
            <span>{{ option.preferred ? '意向导师' : option.hint || '可分配导师' }}</span>
          </div>
          <span v-if="option.preferred" class="assign-mentor-modal__preferred-flag">意向导师</span>
        </label>
      </div>
      <div v-else class="assign-mentor-modal__empty">
        当前没有可直接分配的导师候选，请先回到数据面补充导师目录。
      </div>
    </section>

    <section class="assign-mentor-modal__section">
      <header class="assign-mentor-modal__section-head">
        <div>
          <h3>分配备注</h3>
          <p>记录本次分配原因、关注重点或后续辅导安排。</p>
        </div>
      </header>
      <textarea
        v-model="assignNote"
        class="assign-mentor-modal__textarea"
        rows="4"
        maxlength="160"
        placeholder="例如：优先覆盖 First Round 高频题型，48 小时内完成 mock 预约。"
      />
      <div class="assign-mentor-modal__note-meta">
        <span>已选择 {{ selectedMentorIds.length }} 位导师</span>
        <span>{{ assignNote.length }}/160</span>
      </div>
    </section>

    <template #footer>
      <div class="assign-mentor-modal__footer">
        <button type="button" class="permission-button permission-button--outline" @click="handleClose">
          取消
        </button>
        <button
          type="button"
          class="permission-button permission-button--primary"
          :disabled="submitting || !selectedMentorIds.length"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '确认分配' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { UnassignedJobOverviewRow } from '@osg/shared/api/admin/jobOverview'

interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: UnassignedJobOverviewRow | null
  mentorOptions: AssignMentorOption[]
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { mentorIds: number[]; mentorNames: string[]; assignNote: string }]
}>()

const selectedMentorIds = ref<number[]>([])
const assignNote = ref('')

const studentInitials = computed(() => {
  const value = props.row?.studentName || '学员'
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || '暂无学员意向导师')

watch(
  () => [props.visible, props.mentorOptions, props.row?.requestedMentorCount] as const,
  ([visible]) => {
    if (!visible) {
      selectedMentorIds.value = []
      assignNote.value = ''
      return
    }

    selectedMentorIds.value = props.mentorOptions
      .filter((option) => option.preferred)
      .slice(0, requestedCount.value)
      .map((option) => option.mentorId)
    assignNote.value = ''
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

  const selectedOptions = props.mentorOptions.filter((option) => selectedMentorIds.value.includes(option.mentorId))
  emit('submit', {
    mentorIds: selectedOptions.map((option) => option.mentorId),
    mentorNames: selectedOptions.map((option) => option.mentorName),
    assignNote: assignNote.value.trim()
  })
}
</script>

<style scoped lang="scss">
.assign-mentor-modal__title-wrap {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.assign-mentor-modal__eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7a8ea8;
}

.assign-mentor-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.assign-mentor-modal__hint {
  max-width: 220px;
  font-size: 12px;
  line-height: 1.6;
  color: #60748e;
  text-align: right;
}

.assign-mentor-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.92));
}

.assign-mentor-modal__avatar {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}

.assign-mentor-modal__summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assign-mentor-modal__summary strong {
  color: #10213a;
  font-size: 18px;
}

.assign-mentor-modal__summary span {
  color: #52637a;
  font-size: 13px;
}

.assign-mentor-modal__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.assign-mentor-modal__meta-chip {
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.assign-mentor-modal__meta-chip--accent {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.assign-mentor-modal__section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.assign-mentor-modal__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.assign-mentor-modal__section-head h3 {
  margin: 0;
  font-size: 16px;
  color: #10213a;
}

.assign-mentor-modal__section-head p {
  margin: 4px 0 0;
  color: #60748e;
  font-size: 13px;
}

.assign-mentor-modal__section-badge {
  border-radius: 999px;
  padding: 6px 10px;
  background: #fff1f2;
  color: #be123c;
  font-size: 12px;
  font-weight: 700;
}

.assign-mentor-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.assign-mentor-modal__option {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 92px;
  padding: 16px;
  border: 1px solid #dbe4f0;
  border-radius: 18px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.assign-mentor-modal__option--selected {
  border-color: #2563eb;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.assign-mentor-modal__option--preferred {
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.86), rgba(254, 242, 242, 0.98));
}

.assign-mentor-modal__checkbox {
  margin-top: 4px;
  width: 16px;
  height: 16px;
}

.assign-mentor-modal__option-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assign-mentor-modal__option-copy strong {
  color: #10213a;
  font-size: 15px;
}

.assign-mentor-modal__option-copy span {
  color: #60748e;
  font-size: 13px;
}

.assign-mentor-modal__preferred-flag {
  position: absolute;
  top: 14px;
  right: 14px;
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
}

.assign-mentor-modal__textarea {
  width: 100%;
  min-height: 120px;
  padding: 14px 16px;
  border: 1px solid #dbe4f0;
  border-radius: 18px;
  resize: vertical;
  color: #10213a;
  font: inherit;
}

.assign-mentor-modal__textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.assign-mentor-modal__note-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #60748e;
  font-size: 12px;
}

.assign-mentor-modal__empty {
  border-radius: 18px;
  padding: 20px;
  background: #f8fbff;
  color: #60748e;
  text-align: center;
}

.assign-mentor-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .assign-mentor-modal__title-wrap,
  .assign-mentor-modal__hero,
  .assign-mentor-modal__section-head {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .assign-mentor-modal__hint,
  .assign-mentor-modal__meta {
    text-align: left;
    align-items: flex-start;
  }

  .assign-mentor-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
