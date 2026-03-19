<template>
  <OverlaySurfaceModal
    :open="visible"
    width="800px"
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
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Lead Mentor</th>
            <th>Email</th>
            <th>Phone</th>
            <th>CreateTime</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.studentId">
            <td>{{ row.studentId }}</td>
            <td>{{ row.studentName }}</td>
            <td>{{ row.leadMentorName || '-' }}</td>
            <td>{{ row.email || '-' }}</td>
            <td>{{ row.phone || '-' }}</td>
            <td>{{ formatDate(row.createTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">关闭</button>
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
    return `${props.staffName} 的学员`
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

const formatDate = (value?: string) => {
  if (!value) return '-'
  try {
    const date = new Date(value)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  } catch {
    return value.slice(0, 10)
  }
}
</script>

<style scoped lang="scss">
.mentor-students-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mentor-students-modal__state {
  padding: 48px 0;
  text-align: center;
  color: #64748b;
}

.mentor-students-modal__table-wrap {
  overflow-x: auto;
}

.mentor-students-modal__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }

  thead th {
    background: #f8fafc;
    color: #6b7280;
    font-size: 13px;
    font-weight: 600;
  }
}
</style>
