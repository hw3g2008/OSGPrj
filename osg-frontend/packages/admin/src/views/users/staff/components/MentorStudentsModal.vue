<template>
  <OverlaySurfaceModal
    :open="visible"
    width="820px"
    surface-id="mentor-students-modal"
    @cancel="handleClose"
  >
    <template #title>
      <span class="mentor-students-modal__title">
        <span class="mdi mdi-account-group" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <div v-if="loading" class="mentor-students-modal__state">加载中...</div>
    <div v-else-if="!rows.length" class="mentor-students-modal__state">暂无关联学员</div>
    <div v-else class="mentor-students-modal__table-wrap">
      <table class="permission-table mentor-students-modal__table">
        <thead>
          <tr>
            <th>学员</th>
            <th>学校</th>
            <th>主攻方向</th>
            <th>账号状态</th>
            <th>提醒</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.studentId">
            <td>
              <div class="mentor-students-modal__name">{{ row.studentName }}</div>
              <div class="mentor-students-modal__sub">{{ row.email || `ID ${row.studentId}` }}</div>
            </td>
            <td>{{ row.school || '-' }}</td>
            <td>{{ row.majorDirection || '-' }}</td>
            <td>
              <span :class="['mentor-students-modal__tag', `mentor-students-modal__tag--${resolveStatusTone(row.accountStatus)}`]">
                {{ formatStatus(row.accountStatus) }}
              </span>
            </td>
            <td>{{ row.reminder || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <button type="button" class="permission-button permission-button--primary" @click="handleClose">关闭</button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { getStudentList, type StudentListItem } from '@osg/shared/api/admin/student'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  visible: boolean
  staffId: number | null
  staffName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const rows = ref<StudentListItem[]>([])

const modalTitle = computed(() => {
  if (props.staffName) {
    return `${props.staffName} 的学员列表`
  }
  return '导师学员列表'
})

const loadStudents = async () => {
  if (!props.visible || !props.staffId) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const response = await getStudentList({
      pageNum: 1,
      pageSize: 50,
      leadMentorId: props.staffId
    })
    rows.value = response.rows || []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.staffId] as const,
  () => {
    void loadStudents()
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const formatStatus = (status?: string) => {
  if (status === '1') {
    return '冻结'
  }
  if (status === '3') {
    return '退费'
  }
  return '正常'
}

const resolveStatusTone = (status?: string) => {
  if (status === '1') {
    return 'warning'
  }
  if (status === '3') {
    return 'danger'
  }
  return 'success'
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="mentor-students-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="mentor-students-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.mentor-students-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.mentor-students-modal__state {
  padding: 48px 0;
  text-align: center;
  color: #64748b;
}

.mentor-students-modal__table-wrap {
  overflow-x: auto;
}

.mentor-students-modal__name {
  font-weight: 600;
  color: #0f172a;
}

.mentor-students-modal__sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.mentor-students-modal__tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.mentor-students-modal__tag--success {
  background: #dcfce7;
  color: #166534;
}

.mentor-students-modal__tag--warning {
  background: #fef3c7;
  color: #b45309;
}

.mentor-students-modal__tag--danger {
  background: #fee2e2;
  color: #b91c1c;
}
</style>
