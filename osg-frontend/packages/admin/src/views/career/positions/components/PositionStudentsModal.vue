<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="position-students-modal"
    width="760px"
    :body-class="'position-students-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="position-students-modal__title-wrap">
        <div>
          <span class="position-students-modal__eyebrow">Position Students</span>
          <div class="position-students-modal__title">
            <span class="mdi mdi-account-multiple-outline" aria-hidden="true"></span>
            <span>{{ positionName }} 关联学员</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="position-students-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载关联学员...</span>
    </div>
    <div v-else-if="rows.length" class="position-students-modal__table-wrap">
      <table class="position-students-modal__table">
        <thead>
          <tr>
            <th>学员ID</th>
            <th>姓名</th>
            <th>岗位</th>
            <th>状态</th>
            <th>已上课时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.studentId}-${row.studentName}`">
            <td>{{ row.studentId }}</td>
            <td>{{ row.studentName }}</td>
            <td>{{ row.positionName }}</td>
            <td>
              <span :class="['position-students-modal__tag', `position-students-modal__tag--${row.statusTone || 'default'}`]">
                {{ row.status }}
              </span>
            </td>
            <td>{{ row.usedHours }}h</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="position-students-modal__empty">
      当前岗位还没有可展示的关联学员数据。
    </div>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

interface PositionStudentRow {
  studentId: number
  studentName: string
  positionName: string
  status: string
  statusTone?: 'info' | 'warning' | 'success' | 'danger' | 'default'
  usedHours: number
}

defineProps<{
  visible: boolean
  positionName: string
  loading?: boolean
  rows: PositionStudentRow[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.position-students-modal__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7a8ea8;
}

.position-students-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.position-students-modal__table-wrap {
  overflow: auto;
  border: 1px solid #e8eef6;
  border-radius: 18px;
}

.position-students-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  border-radius: 18px;
  background: #f8fbff;
  color: #60748e;
}

.position-students-modal__table {
  width: 100%;
  border-collapse: collapse;
}

.position-students-modal__table th,
.position-students-modal__table td {
  padding: 14px 16px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
}

.position-students-modal__tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.position-students-modal__tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.position-students-modal__tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.position-students-modal__tag--success {
  background: #dcfce7;
  color: #15803d;
}

.position-students-modal__tag--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.position-students-modal__tag--default {
  background: #f3f4f6;
  color: #475569;
}

.position-students-modal__empty {
  border-radius: 18px;
  padding: 24px;
  background: #f8fbff;
  color: #60748e;
  text-align: center;
}
</style>
