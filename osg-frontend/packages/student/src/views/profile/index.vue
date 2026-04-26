<template>
  <div id="page-profile" class="profile-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">基本信息 <span>My Profile</span></h1>
            <p class="page-sub">查看和修改您的个人信息</p>
          </div>
          <a-button type="primary" size="large" @click="openEdit">编辑信息</a-button>
        </div>
      </template>

      <a-alert
        class="pending-banner"
        :type="pendingChanges.length > 0 ? 'warning' : 'info'"
        show-icon
      >
        <template #message><strong>{{ pendingBannerTitle }}</strong></template>
        <template #description>{{ pendingBannerText }}</template>
        <template #action>
          <a-button @click="pendingOpen = true">查看详情</a-button>
        </template>
      </a-alert>

      <a-card class="profile-card" :bordered="false">
        <div class="profile-head">
          <a-avatar :size="84" :style="{ backgroundColor: 'var(--primary)', fontSize: '28px', fontWeight: 800 }">{{ avatarInitials }}</a-avatar>
          <div class="profile-head__text">
            <h3>{{ profile.fullName }}</h3>
            <a-space :size="8" wrap>
              <span>Student ID: {{ profile.studentCode }}</span>
              <a-tag color="success">{{ profile.statusLabel }}</a-tag>
            </a-space>
          </div>
        </div>

        <a-card title="核心信息" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :colon="false">
            <a-descriptions-item label="英文姓名">{{ profile.englishName }}</a-descriptions-item>
            <a-descriptions-item label="性别">{{ profile.sexLabel }}</a-descriptions-item>
            <a-descriptions-item label="邮箱">{{ profile.email }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="导师配置" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item label="班主任">{{ profile.leadMentor }}</a-descriptions-item>
            <a-descriptions-item label="助教">{{ profile.assistantName }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="学业信息" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" :colon="false">
            <a-descriptions-item label="学校">
              <span class="field-value">{{ profile.school }}</span>
              <a-tag v-if="pendingFieldKeys.has('school')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="专业">
              <span class="field-value">{{ profile.major }}</span>
              <a-tag v-if="pendingFieldKeys.has('major')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="毕业年份">
              <span class="field-value">{{ profile.graduationYear }}</span>
              <a-tag v-if="pendingFieldKeys.has('graduationYear')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="高中">
              <span class="field-value">{{ profile.highSchool }}</span>
              <a-tag v-if="pendingFieldKeys.has('highSchool')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="是否读研或延毕">
              <span class="field-value">{{ profile.postgraduatePlan }}</span>
              <a-tag v-if="pendingFieldKeys.has('postgraduatePlan')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="签证">
              <span class="field-value">{{ profile.visaStatus }}</span>
              <a-tag v-if="pendingFieldKeys.has('visaStatus')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="求职方向" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item label="求职地区">
              <span class="field-value">{{ profile.targetRegion }}</span>
              <a-tag v-if="pendingFieldKeys.has('targetRegion')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="招聘周期">
              <span class="field-value">{{ profile.recruitmentCycle }}</span>
              <a-tag v-if="pendingFieldKeys.has('recruitmentCycle')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="主攻方向">
              <span class="field-value">{{ profile.primaryDirection }}</span>
              <a-tag v-if="pendingFieldKeys.has('primaryDirection')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="子方向">
              <span class="field-value">{{ profile.secondaryDirection }}</span>
              <a-tag v-if="pendingFieldKeys.has('secondaryDirection')" color="warning" class="field-pending-tag">待审核</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="联系方式" :bordered="false" size="small" class="info-block">
          <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
            <a-descriptions-item label="电话">{{ profile.phone }}</a-descriptions-item>
            <a-descriptions-item label="微信ID">{{ profile.wechatId }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-card>
    </OsgPageContainer>

    <a-modal
      v-model:open="editOpen"
      title="编辑基本信息"
      :width="620"
      :footer="null"
      @cancel="editOpen = false"
    >
      <div class="modal-tip">审核说明：核心信息、学业信息和求职方向的修改需要后台审核，联系方式修改后直接生效。</div>

      <section class="profile-modal-section">
        <div class="edit-section-title">以下信息修改需后台审核</div>
        <div class="form-grid">
          <a-form-item label="学校" class="form-item"><a-input v-model:value="editForm.school" /></a-form-item>
          <a-form-item label="专业" class="form-item"><a-input v-model:value="editForm.major" /></a-form-item>
          <a-form-item label="毕业年份" class="form-item"><a-input v-model:value="editForm.graduationYear" /></a-form-item>
          <a-form-item label="高中" class="form-item"><a-input v-model:value="editForm.highSchool" placeholder="选填" /></a-form-item>
          <a-form-item label="是否读研或延毕" class="form-item"><a-select v-model:value="editForm.postgraduatePlan" :options="yesNoOptions" /></a-form-item>
          <a-form-item label="签证" class="form-item"><a-input v-model:value="editForm.visaStatus" /></a-form-item>
          <a-form-item label="招聘周期" class="form-item"><a-input v-model:value="editForm.recruitmentCycle" /></a-form-item>
          <a-form-item label="求职地区" class="form-item"><a-input v-model:value="editForm.targetRegion" /></a-form-item>
          <a-form-item label="主攻方向" class="form-item"><a-input v-model:value="editForm.primaryDirection" /></a-form-item>
          <a-form-item label="子方向" class="form-item"><a-input v-model:value="editForm.secondaryDirection" /></a-form-item>
        </div>
      </section>

      <section class="profile-modal-section">
        <div class="edit-section-title edit-section-title--success">以下信息修改后直接生效</div>
        <div class="form-grid form-grid--compact">
          <a-form-item label="电话" class="form-item"><a-input v-model:value="editForm.phone" /></a-form-item>
          <a-form-item label="微信ID" class="form-item"><a-input v-model:value="editForm.wechatId" /></a-form-item>
        </div>
      </section>

      <div class="profile-modal__footer" style="margin-top: 16px">
        <a-button @click="editOpen = false">取消</a-button>
        <a-button type="primary" @click="saveProfile">保存修改</a-button>
      </div>
    </a-modal>

    <a-modal
      v-model:open="pendingOpen"
      title="待审核的信息变更"
      :width="640"
      :footer="null"
      @cancel="pendingOpen = false"
    >
      <div class="modal-tip modal-tip--warning">审核期间原始信息仍保持生效，审核通过后系统会自动更新您的资料。</div>
      <div class="pending-list">
        <div v-if="pendingChanges.length === 0" class="pending-item pending-item--empty">
          <div class="pending-head">
            <a-tag color="default">暂无待审核</a-tag>
          </div>
          <div class="pending-body">当前没有待审核的信息变更。</div>
        </div>
        <div v-for="change in pendingChanges" :key="`${change.fieldKey}-${change.newValue}`" class="pending-item">
          <div class="pending-head">
            <div class="pending-head__meta">
              <strong>{{ change.fieldLabel }}</strong>
              <span>提交于 {{ change.submittedAt }}</span>
            </div>
            <a-tag color="warning">{{ change.status || '待审核' }}</a-tag>
          </div>
          <div class="pending-diff">
            <div class="pending-diff__card">
              <span>原值</span>
              <strong>{{ displayPendingValue(change.oldValue) }}</strong>
            </div>
            <div class="pending-diff__arrow">
              <i class="mdi mdi-arrow-right" aria-hidden="true"></i>
            </div>
            <div class="pending-diff__card pending-diff__card--next">
              <span>申请值</span>
              <strong>{{ displayPendingValue(change.newValue) }}</strong>
            </div>
          </div>
        </div>
      </div>
      <div class="profile-modal__footer" style="margin-top: 16px">
        <a-button @click="pendingOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentProfile,
  updateStudentProfile,
  type StudentProfileRecord,
  type StudentProfileUpdatePayload,
  type StudentPendingProfileChange
} from '@osg/shared/api'

const yesNoOptions = [
  { value: '是', label: '是' },
  { value: '否', label: '否' }
]

const editOpen = ref(false)
const pendingOpen = ref(false)
const profile = reactive<StudentProfileRecord>({
  studentCode: '-',
  fullName: '-',
  englishName: '-',
  email: '-',
  sexLabel: '-',
  statusLabel: '正常',
  leadMentor: '-',
  assistantName: '-',
  school: '-',
  major: '-',
  graduationYear: '-',
  highSchool: '-',
  postgraduatePlan: '否',
  visaStatus: '-',
  targetRegion: '-',
  recruitmentCycle: '-',
  primaryDirection: '-',
  secondaryDirection: '-',
  phone: '-',
  wechatId: '-'
})
const pendingChanges = ref<StudentPendingProfileChange[]>([])
const editForm = reactive<StudentProfileUpdatePayload>({
  school: '-',
  major: '-',
  graduationYear: '-',
  highSchool: '-',
  postgraduatePlan: '否',
  visaStatus: '-',
  recruitmentCycle: '-',
  targetRegion: '-',
  primaryDirection: '-',
  secondaryDirection: '-',
  phone: '-',
  wechatId: '-'
})

const pendingBannerTitle = computed(() =>
  pendingChanges.value.length > 0
    ? `您有 ${pendingChanges.value.length} 项信息变更正在审核中`
    : '当前没有待审核的信息变更'
)
const pendingBannerText = computed(() =>
  pendingChanges.value.length > 0
    ? '学业信息和求职方向的修改需要后台审核，请耐心等待'
    : '学业信息和求职方向的修改会进入后台审核队列，联系方式修改后直接生效。'
)
const pendingFieldKeys = computed(
  () => new Set(pendingChanges.value.map((change) => change.fieldKey))
)
const avatarInitials = computed(() => {
  const initials = profile.fullName
    .split(/\s+/)
    .map(segment => segment.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials || 'ST'
})

function syncEditForm() {
  editForm.school = profile.school
  editForm.major = profile.major
  editForm.graduationYear = profile.graduationYear
  editForm.highSchool = profile.highSchool
  editForm.postgraduatePlan = profile.postgraduatePlan
  editForm.visaStatus = profile.visaStatus
  editForm.recruitmentCycle = profile.recruitmentCycle
  editForm.targetRegion = profile.targetRegion
  editForm.primaryDirection = profile.primaryDirection
  editForm.secondaryDirection = profile.secondaryDirection
  editForm.phone = profile.phone
  editForm.wechatId = profile.wechatId
}

function applyProfileView(payload: { profile: StudentProfileRecord; pendingChanges: StudentPendingProfileChange[] }) {
  Object.assign(profile, payload.profile)
  pendingChanges.value = payload.pendingChanges
}

function openEdit() {
  syncEditForm()
  editOpen.value = true
}

function displayPendingValue(value: string) {
  return value?.trim() ? value : '未填写'
}

async function loadProfile() {
  const payload = await getStudentProfile()
  applyProfileView(payload)
  syncEditForm()
}

async function saveProfile() {
  Modal.confirm({
    title: '确认保存修改？',
    content: '修改后，后台文员和班主任将收到提醒通知。',
    okText: '确认',
    cancelText: '取消',
    okType: 'primary',
    async onOk() {
      try {
        const payload = await updateStudentProfile({ ...editForm })
        applyProfileView(payload)
        editOpen.value = false
        message.success('保存成功！后台文员和班主任已收到您的信息变更通知。')
      } catch {
        // error handled
      }
    }
  })
}

onMounted(() => {
  void loadProfile().catch(() => undefined)
})
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.field-value {
  display: inline-block;
  vertical-align: middle;
}

.field-pending-tag {
  margin-left: 8px;
  vertical-align: middle;
  font-size: 11px;
  line-height: 1.6;
}

.pending-banner {
  margin-bottom: 20px;
}

.profile-card {
  border-radius: 20px;
  background: #fff;
}

.profile-head {
  display: flex;
  gap: 18px;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
}

.profile-head__text {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 22px;
  }
}

.info-block {
  margin-bottom: 16px;
}

.modal-tip {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #e8f0f8;
  color: #5a7ba3;
  padding: 14px 16px;
}

.modal-tip--warning {
  background: #e8f0f8;
  color: #5a7ba3;
}

.profile-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-modal-section {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-grid--compact {
  margin-top: 12px;
}

.form-item {
  margin-bottom: 0;
}

.edit-section-title {
  margin: 0 0 12px;
  color: #5a7ba3;
  font-size: 13px;
  font-weight: 600;
}

.edit-section-title--success {
  margin-top: 20px;
  color: #7399c6;
}

.pending-list {
  display: grid;
  gap: 14px;
}

.pending-item {
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.pending-item--empty {
  text-align: center;
}

.pending-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  strong {
    color: #0f172a;
    font-size: 15px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.pending-head__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pending-diff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.pending-diff__card {
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 14px;
  display: grid;
  gap: 8px;

  span {
    color: #64748b;
    font-size: 12px;
  }

  strong {
    color: #334155;
    line-height: 1.6;
  }
}

.pending-diff__card--next {
  border-color: #bfd1e3;
  background: #e8f0f8;
}

.pending-diff__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7399c6;
  font-size: 20px;
}

.pending-body {
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .page-header,
  .profile-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid,
  .pending-diff {
    grid-template-columns: 1fr;
  }
}
</style>
