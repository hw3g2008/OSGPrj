<template>
  <div id="page-profile" class="page-profile" data-page="profile-basic">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          基本信息
          <span class="page-title-en">Profile</span>
        </h1>
        <p class="page-sub">查看和管理您的个人信息</p>
      </div>
      <button
        type="button"
        class="btn btn-primary"
        data-surface-trigger="modal-lead-edit-profile"
        :disabled="!profile || isLoading"
        @click="openEditModal"
      >
        <i class="mdi mdi-pencil" aria-hidden="true" />
        编辑信息
      </button>
    </div>

    <div v-if="isLoading" class="page-feedback">
      <i class="mdi mdi-loading mdi-spin" aria-hidden="true" />
      正在同步班主任资料...
    </div>

    <div v-else-if="loadError" class="page-feedback page-feedback--error">
      <i class="mdi mdi-alert-circle-outline" aria-hidden="true" />
      {{ loadError }}
    </div>

    <div v-else-if="pendingCount > 0" class="page-feedback page-feedback--info">
      <i class="mdi mdi-timeline-clock-outline" aria-hidden="true" />
      <div>
        已提交 {{ pendingCount }} 条待审核变更申请，后台文员审核后才会更新主资料。
        <span v-if="latestPendingChange" class="page-feedback__detail">
          最近一条：{{ latestPendingChange.fieldLabel }} -> {{ latestPendingChange.afterValue }}
        </span>
      </div>
    </div>

    <section class="card card--core">
      <div class="card-head">
        <span class="section-pill section-pill--primary">核心信息</span>
      </div>
      <div class="info-grid info-grid--four">
        <article class="info-item">
          <span class="info-label">英文名</span>
          <div class="info-value info-value--strong">{{ displayName }}</div>
        </article>
        <article class="info-item">
          <span class="info-label">性别</span>
          <div class="info-value">{{ genderLabel }}</div>
        </article>
        <article class="info-item">
          <span class="info-label">类型</span>
          <div class="info-value">
            <span class="type-tag">{{ typeLabel }}</span>
          </div>
        </article>
        <article class="info-item">
          <span class="info-label">邮箱</span>
          <div class="info-value">{{ emailValue }}</div>
        </article>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <span class="section-pill section-pill--success">
          <i class="mdi mdi-phone" aria-hidden="true" />
          联系方式
        </span>
      </div>
      <div class="info-grid info-grid--three">
        <article class="info-item">
          <span class="info-label">手机号</span>
          <div class="info-value">{{ phoneValue }}</div>
        </article>
        <article class="info-item">
          <span class="info-label">微信号</span>
          <div class="info-value">{{ wechatValue }}</div>
        </article>
        <article class="info-item">
          <span class="info-label">所属地区</span>
          <div class="info-value">{{ regionValue }}</div>
        </article>
      </div>
    </section>

    <section class="card">
      <div class="card-head card-head--between">
        <span class="section-pill section-pill--warning">
          <i class="mdi mdi-target" aria-hidden="true" />
          专业方向
        </span>
        <span class="locked-tip">
          <i class="mdi mdi-lock" aria-hidden="true" />
          如需修改请联系后台文员
        </span>
      </div>
      <div class="info-grid info-grid--two">
        <article class="info-item info-item--locked">
          <span class="info-label info-label--accent">主攻方向</span>
          <div class="info-value">{{ majorDirectionValue }}</div>
        </article>
        <article class="info-item info-item--locked">
          <span class="info-label info-label--accent">二级方向</span>
          <div class="info-value">{{ subDirectionValue }}</div>
        </article>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <span class="section-pill section-pill--info">
          <i class="mdi mdi-book-open-variant" aria-hidden="true" />
          课程信息
        </span>
      </div>
      <div class="info-grid info-grid--two">
        <article class="info-item">
          <span class="info-label">可授课程类型</span>
          <div class="course-tags">
            <span class="course-tag">以后台配置为准</span>
          </div>
        </article>
        <article class="info-item">
          <span class="info-label">
            课单价
            <span class="info-label-note">(不可修改)</span>
          </span>
          <div class="info-value info-value--locked">{{ hourlyRateValue }}</div>
        </article>
      </div>
    </section>

    <LeadEditProfileModal
      v-model="isEditProfileModalOpen"
      :draft="editProfileDraft"
      :submitting="isSubmitting"
      @save-request="handleProfileSave"
    />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import {
  getLeadMentorProfile,
  submitLeadMentorProfileChangeRequest,
  type LeadMentorPendingProfileChange,
  type LeadMentorProfileRecord,
  type LeadMentorProfileView,
} from '@osg/shared/api'
import LeadEditProfileModal, { type LeadEditProfileDraft } from '@/components/LeadEditProfileModal.vue'

const isEditProfileModalOpen = ref(false)
const profileView = ref<LeadMentorProfileView | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')

const profile = computed<LeadMentorProfileRecord | null>(() => profileView.value?.profile ?? null)
const pendingChanges = computed<LeadMentorPendingProfileChange[]>(() => profileView.value?.pendingChanges ?? [])
const pendingCount = computed(() => profileView.value?.pendingCount ?? 0)
const latestPendingChange = computed(() => pendingChanges.value[0] ?? null)

const displayText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return '待完善'
  }

  const text = String(value).trim()
  return text === '' || text === '-' ? '待完善' : text
}

const displayName = computed(() => displayText(profile.value?.englishName))
const genderLabel = computed(() => displayText(profile.value?.genderLabel))
const typeLabel = computed(() => displayText(profile.value?.typeLabel || '班主任'))
const emailValue = computed(() => displayText(profile.value?.email))
const phoneValue = computed(() => displayText(profile.value?.phone))
const wechatValue = computed(() => displayText(profile.value?.wechatId))
const regionValue = computed(() => displayText(profile.value?.regionLabel))
const majorDirectionValue = computed(() => displayText(profile.value?.majorDirection))
const subDirectionValue = computed(() => displayText(profile.value?.subDirection))
const hourlyRateValue = computed(() => {
  if (profile.value?.hourlyRate === null || profile.value?.hourlyRate === undefined) {
    return '锁定字段，由后台维护'
  }
  return `¥${profile.value.hourlyRate}/h`
})

const editProfileDraft = computed<LeadEditProfileDraft | null>(() => {
  if (!profile.value) {
    return null
  }

  return {
    englishName: profile.value.englishName === '-' ? '' : profile.value.englishName,
    genderLabel: profile.value.genderLabel === '-' ? '' : profile.value.genderLabel,
    phone: profile.value.phone === '-' ? '' : profile.value.phone,
    wechatId: profile.value.wechatId === '-' ? '' : profile.value.wechatId,
    email: profile.value.email === '-' ? '' : profile.value.email,
    regionArea: profile.value.regionArea === '-' ? '' : profile.value.regionArea,
    regionCity: profile.value.regionCity === '-' ? '' : profile.value.regionCity,
  }
})

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    profileView.value = await getLeadMentorProfile()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '班主任资料加载失败'
  } finally {
    isLoading.value = false
  }
}

const openEditModal = () => {
  if (!profile.value || isLoading.value) {
    return
  }
  isEditProfileModalOpen.value = true
}

const handleProfileSave = async (draft: LeadEditProfileDraft) => {
  if (!profile.value) {
    return
  }

  isSubmitting.value = true

  try {
    const result = await submitLeadMentorProfileChangeRequest({
      staffId: profile.value.staffId,
      ...draft,
    })
    profileView.value = result
    isEditProfileModalOpen.value = false
    message.success(`已提交 ${result.createdCount} 条变更申请`)
  } catch {
    // Request utility already surfaces the backend error message.
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<style scoped>
.page-profile {
  color: #1e293b;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--muted);
}

.page-feedback {
  margin-bottom: 18px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  line-height: 1.6;
}

.page-feedback--info {
  border-color: #bfdbfe;
}

.page-feedback--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.page-feedback__detail {
  display: inline-block;
  margin-left: 6px;
  color: #1e3a8a;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.btn-primary {
  color: #fff;
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.card {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border);
}

.card--core {
  border-width: 2px;
  border-color: var(--primary);
}

.card-head {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.card-head--between {
  justify-content: space-between;
  gap: 12px;
}

.section-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.section-pill--primary {
  background: var(--primary);
  color: #fff;
}

.section-pill--success {
  background: #dcfce7;
  color: #166534;
}

.section-pill--warning {
  background: #fef3c7;
  color: #92400e;
}

.section-pill--info {
  background: #e8f0f8;
  color: var(--primary);
}

.locked-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.info-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-item {
  min-width: 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid transparent;
  border-radius: 12px;
}

.info-item--locked {
  background: #fff;
  border-color: rgba(115, 153, 198, 0.22);
}

.info-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--muted);
}

.info-label--accent {
  color: var(--primary);
}

.info-label-note {
  font-size: 10px;
  color: var(--muted);
}

.info-value {
  font-size: 14px;
  color: #334155;
  word-break: break-word;
}

.info-value--strong {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.info-value--locked {
  font-weight: 600;
  color: var(--primary);
}

.type-tag,
.course-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag {
  background: #dcfce7;
  color: #166534;
}

.course-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.course-tag {
  background: #e0f2fe;
  color: #0369a1;
}

@media (max-width: 1080px) {
  .info-grid--four,
  .info-grid--three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header,
  .card-head--between {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .info-grid--four,
  .info-grid--three,
  .info-grid--two {
    grid-template-columns: 1fr;
  }
}
</style>
