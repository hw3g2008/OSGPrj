<template>
  <div
    v-if="modelValue && preview"
    class="position-students-modal modal"
    data-surface-id="modal-position-mystudents"
  >
    <button
      type="button"
      class="position-students-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭我的学员申请弹层"
      @click="closeModal"
    />

    <div
      class="position-students-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="position-students-header modal-header" data-surface-part="header">
        <span :id="titleId" class="position-students-title modal-title">
          <i class="mdi mdi-account-group" aria-hidden="true" />
          {{ preview.companyName }} - {{ preview.jobTitle }} 我的学员申请
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭我的学员申请弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="position-students-body modal-body" data-surface-part="body">
        <div class="position-students-note">
          <i class="mdi mdi-information" aria-hidden="true" />
          仅显示您管理的学员，您可以修改学员的求职状态
        </div>

        <div class="table-wrap">
          <table class="table">
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
              <tr v-for="student in preview.students" :key="student.studentId">
                <td>{{ student.studentId }}</td>
                <td>
                  <strong>{{ student.studentName }}</strong>
                </td>
                <td>{{ student.jobTitle }}</td>
                <td>
                  <span class="status-tag" :class="`status-tag--${student.statusTone}`">
                    {{ student.statusLabel }}
                  </span>
                </td>
                <td>{{ student.lessonHours }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="position-students-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">关闭</button>
        <button type="button" class="btn btn-primary" @click="closeModal">
          <i class="mdi mdi-check" aria-hidden="true" />
          保存修改
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export type PositionStudentStatusTone = 'interviewing' | 'applied' | 'offer'

export interface PositionMyStudentRecord {
  studentId: string
  studentName: string
  jobTitle: string
  statusLabel: string
  statusTone: PositionStudentStatusTone
  lessonHours: string
}

export interface PositionMyStudentsPreview {
  companyName: string
  jobTitle: string
  students: PositionMyStudentRecord[]
}

defineProps<{
  modelValue: boolean
  preview: PositionMyStudentsPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = 'position-my-students-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.position-students-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.position-students-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.position-students-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 750px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background-color: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.position-students-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.18);
}

.position-students-title {
  display: inline-flex;
  align-items: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.position-students-title .mdi-account-group {
  margin-right: 8px;
  color: var(--primary);
  font-size: 20px;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--bg);
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.position-students-body {
  overflow: auto;
  padding: 26px;
}

.position-students-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -26px -26px 0;
  padding: 12px 16px;
  background: #e8f0f8;
  color: #1e40af;
  font-size: 13px;
}

.position-students-note .mdi-information {
  margin-right: 6px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  margin: 0;
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: 12px 12px 12px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-align: left;
  white-space: nowrap;
}

.table th:first-child,
.table td:first-child {
  padding-left: 0;
}

.table th {
  color: var(--text2);
  font-weight: 600;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-tag--interviewing {
  background: #fef3c7;
  color: #92400e;
}

.status-tag--applied {
  background: #dbeafe;
  color: #1e40af;
}

.status-tag--offer {
  background: #dcfce7;
  color: #166534;
}

.position-students-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  box-shadow: inset 0 0 0 1px var(--border);
}

.btn-primary {
  color: #fff;
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

@media (max-width: 768px) {
  .position-students-shell {
    width: calc(100vw - 24px);
  }

  .position-students-header,
  .position-students-body,
  .position-students-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .position-students-note {
    margin-left: -18px;
    margin-right: -18px;
  }

  .position-students-footer {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
