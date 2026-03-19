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

      <section class="pending-banner">
        <div class="pending-content">
          <h4>{{ pendingBannerTitle }}</h4>
          <p>{{ pendingBannerText }}</p>
        </div>
        <a-button @click="pendingOpen = true">查看详情</a-button>
      </section>

      <section class="profile-card">
        <div class="profile-head">
          <div class="avatar">{{ avatarInitials }}</div>
          <div>
            <h3>{{ profile.fullName }}</h3>
            <p>Student ID: {{ profile.studentCode }} · {{ profile.statusLabel }}</p>
          </div>
        </div>

        <div class="info-section">
          <div class="section-chip">核心信息</div>
          <div class="info-grid four-columns">
            <div class="info-card"><span>英文姓名</span><strong>{{ profile.englishName }}</strong></div>
            <div class="info-card"><span>性别</span><strong>{{ profile.sexLabel }}</strong></div>
            <div class="info-card wide"><span>邮箱</span><strong>{{ profile.email }}</strong></div>
          </div>
        </div>

        <div class="info-section">
          <div class="section-chip secondary">导师配置</div>
          <div class="info-grid two-columns">
            <div class="info-card"><span>班主任</span><strong>{{ profile.leadMentor }}</strong></div>
            <div class="info-card"><span>助教</span><strong>{{ profile.assistantName }}</strong></div>
          </div>
        </div>

        <div class="info-section">
          <div class="section-chip tertiary">学业信息</div>
          <div class="info-grid four-columns">
            <div class="info-card"><span>学校</span><strong>{{ profile.school }}</strong></div>
            <div class="info-card"><span>专业</span><strong>{{ profile.major }}</strong></div>
            <div class="info-card"><span>毕业年份</span><strong>{{ profile.graduationYear }}</strong></div>
            <div class="info-card"><span>高中</span><strong>{{ profile.highSchool }}</strong></div>
            <div class="info-card"><span>是否读研或延毕</span><strong>{{ profile.postgraduatePlan }}</strong></div>
            <div class="info-card"><span>签证</span><strong>{{ profile.visaStatus }}</strong></div>
          </div>
        </div>

        <div class="info-section">
          <div class="section-chip warning">求职方向</div>
          <div class="info-grid two-columns">
            <div class="info-card"><span>求职地区</span><strong>{{ profile.targetRegion }}</strong></div>
            <div class="info-card"><span>招聘周期</span><strong>{{ profile.recruitmentCycle }}</strong></div>
            <div class="info-card"><span>主攻方向</span><strong>{{ profile.primaryDirection }}</strong></div>
            <div class="info-card"><span>子方向</span><strong>{{ profile.secondaryDirection }}</strong></div>
          </div>
        </div>

        <div class="info-section">
          <div class="section-chip success">联系方式</div>
          <div class="info-grid two-columns">
            <div class="info-card"><span>电话</span><strong>{{ profile.phone }}</strong></div>
            <div class="info-card"><span>微信ID</span><strong>{{ profile.wechatId }}</strong></div>
          </div>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="editOpen" title="编辑基本信息" :footer="null" width="720px">
      <div class="modal-tip">审核说明：核心信息、学业信息和求职方向的修改需要后台审核，联系方式修改后直接生效。</div>
      <div class="form-grid">
        <a-form-item label="学校" class="form-item"><a-input id="profile-school" v-model:value="editForm.school" /></a-form-item>
        <a-form-item label="专业" class="form-item"><a-input id="profile-major" v-model:value="editForm.major" /></a-form-item>
        <a-form-item label="毕业年份" class="form-item"><a-input id="profile-graduation-year" v-model:value="editForm.graduationYear" /></a-form-item>
        <a-form-item label="高中" class="form-item"><a-input id="profile-high-school" v-model:value="editForm.highSchool" placeholder="选填" /></a-form-item>
        <a-form-item label="是否读研或延毕" class="form-item"><a-select id="profile-postgraduate-plan" v-model:value="editForm.postgraduatePlan" :options="yesNoOptions" /></a-form-item>
        <a-form-item label="签证" class="form-item"><a-input id="profile-visa-status" v-model:value="editForm.visaStatus" /></a-form-item>
        <a-form-item label="招聘周期" class="form-item"><a-input id="profile-recruitment-cycle" v-model:value="editForm.recruitmentCycle" /></a-form-item>
        <a-form-item label="求职地区" class="form-item"><a-input id="profile-target-region" v-model:value="editForm.targetRegion" /></a-form-item>
        <a-form-item label="主攻方向" class="form-item"><a-input id="profile-primary-direction" v-model:value="editForm.primaryDirection" /></a-form-item>
        <a-form-item label="子方向" class="form-item"><a-input id="profile-secondary-direction" v-model:value="editForm.secondaryDirection" /></a-form-item>
        <a-form-item label="电话" class="form-item"><a-input id="profile-phone" v-model:value="editForm.phone" /></a-form-item>
        <a-form-item label="微信ID" class="form-item"><a-input id="profile-wechat" v-model:value="editForm.wechatId" /></a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="editOpen = false">取消</a-button>
        <a-button type="primary" @click="saveProfile">保存修改</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="pendingOpen" title="待审核的信息变更" :footer="null" width="640px">
      <div class="pending-list">
        <div v-if="pendingChanges.length === 0" class="pending-item">
          <div class="pending-head">
            <a-tag color="default">暂无待审核</a-tag>
          </div>
          <div class="pending-body">当前没有待审核的信息变更。</div>
        </div>
        <div v-for="change in pendingChanges" :key="`${change.fieldKey}-${change.newValue}`" class="pending-item">
          <div class="pending-head">
            <a-tag color="warning">待审核</a-tag>
            <span>提交于 {{ change.submittedAt }}</span>
          </div>
          <div class="pending-body">{{ change.fieldLabel }}：{{ change.oldValue }} → {{ change.newValue }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="pendingOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentProfile,
  updateStudentProfile,
  type StudentProfileRecord,
  type StudentProfileUpdatePayload,
  type StudentPendingProfileChange
} from '@osg/shared/api'

const profileActionTriggers = [
  { actionId: 'open-edit-profile' },
  { actionId: 'open-pending-changes' }
]

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

async function loadProfile() {
  const payload = await getStudentProfile()
  applyProfileView(payload)
  syncEditForm()
}

async function saveProfile() {
  const payload = await updateStudentProfile({ ...editForm })
  applyProfileView(payload)
  editOpen.value = false
  message.success('保存修改成功')
}

onMounted(() => {
  loadProfile()
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

.pending-banner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  padding: 18px 20px;
  margin-bottom: 20px;
}

.pending-content {
  h4 {
    margin: 0 0 6px;
    color: #92400e;
  }

  p {
    margin: 0;
    color: #78350f;
  }
}

.profile-card {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  padding: 24px;
}

.profile-head {
  display: flex;
  gap: 18px;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;

  h3 {
    margin: 0 0 6px;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 28px;
  font-weight: 800;
}

.info-section {
  margin-bottom: 20px;
}

.section-chip {
  display: inline-block;
  margin-bottom: 12px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
}

.secondary {
  background: #e0e7ff;
  color: #4338ca;
}

.tertiary {
  background: #e8f0f8;
  color: #1d4ed8;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.info-grid {
  display: grid;
  gap: 16px;
}

.four-columns {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-card {
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  display: grid;
  gap: 6px;

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.wide {
  grid-column: span 2;
}

.modal-tip {
  border-radius: 12px;
  background: #e8f0f8;
  color: #1e3a8a;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  margin-bottom: 0;
}

.pending-list {
  display: grid;
  gap: 14px;
}

.pending-item {
  border-radius: 14px;
  background: #f8fafc;
  padding: 16px;
}

.pending-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  span {
    color: #64748b;
    font-size: 12px;
  }
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
</style>
