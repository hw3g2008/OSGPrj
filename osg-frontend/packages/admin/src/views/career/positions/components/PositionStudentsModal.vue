<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-position-students"
    width="850px"
    :body-class="'position-students-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="position-students-modal__title">
        <span class="mdi mdi-account-group" aria-hidden="true"></span>
        <span>{{ companyName }} - {{ positionName }} 申请学员</span>
      </div>
    </template>

    <div class="position-students-modal__tip">
      <i class="mdi mdi-information" aria-hidden="true"></i>
      <span>以下为该岗位的申请学员列表，求职状态由学员自行更新</span>
    </div>

    <div v-if="loading" class="position-students-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载申请学员...</span>
    </div>

    <div v-else-if="rows.length" class="position-students-modal__table-wrap">
      <table class="position-students-modal__table">
        <thead>
          <tr>
            <th>学生ID</th>
            <th>姓名</th>
            <th>岗位</th>
            <th>状态</th>
            <th>已上课时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.studentId}-${row.studentName}`">
            <td>{{ row.studentId }}</td>
            <td><strong>{{ row.studentName }}</strong></td>
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
      当前岗位还没有可展示的申请学员数据。
    </div>

    <template #footer>
      <button type="button" class="position-students-modal__close" @click="handleClose">关闭</button>
    </template>
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
  companyName: string
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
.position-students-modal__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #20304a;
}

.position-students-modal__tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px 12px 0 0;
  background: #eff6ff;
  color: #1e40af;
  font-size: 13px;
}

.position-students-modal__loading,
.position-students-modal__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px solid #e5edf8;
  border-top: none;
  color: #61738f;
  background: #fff;
}

.position-students-modal__loading {
  gap: 8px;
}

.position-students-modal__table-wrap {
  overflow: auto;
  border: 1px solid #e5edf8;
  border-top: none;
}

.position-students-modal__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.position-students-modal__table thead {
  background: #f7f9fc;
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
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.position-students-modal__tag--info {
  background: #dbeafe;
  color: #1e40af;
}

.position-students-modal__tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.position-students-modal__tag--success {
  background: #dcfce7;
  color: #166534;
}

.position-students-modal__tag--danger {
  background: #fee2e2;
  color: #991b1b;
}

.position-students-modal__tag--default {
  background: #f3f4f6;
  color: #6b7280;
}

.position-students-modal__close {
  border: 1px solid #d4deeb;
  border-radius: 10px;
  padding: 10px 18px;
  background: #fff;
  color: #4a5c78;
  font-weight: 600;
  cursor: pointer;
}
</style>
