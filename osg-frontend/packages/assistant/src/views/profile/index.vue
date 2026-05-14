<template>
  <div id="page-profile" class="profile-page">
    <PageHeader
      :title-zh="$t('basic_info')"
      title-en="Profile"
      :description="`${$t('view_current_account_profile_contact_inf')}。`"
    >
      <template #actions>
        <span class="status-pill">{{ $t('profile_overview') }}</span>
        <button
          id="assistant-profile-edit"
          type="button"
          class="primary-button"
          @click="openEditor"
        >
          {{ $t('edit_profile') }}
        </button>
      </template>
    </PageHeader>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>{{ $t('profile_load_failed') }}</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadProfile">{{ $t('reload') }}</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>{{ $t('loading_profile') }}</h2>
      <p>{{ $t('loading_current_accounts_basic_info_and_') }}。</p>
    </section>

    <template v-else-if="profile">
      <section class="hero-card">
        <div class="hero-card__identity">
          <div class="avatar">{{ avatarText }}</div>
          <div>
            <div class="hero-card__name">{{ displayName }}</div>
            <div class="hero-card__meta">{{ profile.userName || '-' }} · Assistant</div>
          </div>
        </div>

        <div class="hero-card__actions">
          <span class="readonly-pill" :class="statusToneClass">{{ statusLabel }}</span>
          <button type="button" class="ghost-button" @click="loadProfile">{{ $t('refresh_profile') }}</button>
        </div>
      </section>

      <section v-if="pageNotice" class="feedback-banner" :class="feedbackToneClass(pageNotice.type)">
        <strong>{{ pageNotice.title }}</strong>
        <span>{{ pageNotice.text }}</span>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <span class="summary-card__label">{{ $t('account_status_2') }}</span>
          <strong class="summary-card__value">{{ statusLabel }}</strong>
          <span class="summary-card__hint">{{ $t('current_login_account_availability_statu') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ $t('contact_info') }}</span>
          <strong class="summary-card__value">{{ contactCompleteness }}</strong>
          <span class="summary-card__hint">{{ $t('email_and_phone_number_completion_status') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ $t('last_login_2') }}</span>
          <strong class="summary-card__value summary-card__value--small">{{ loginDateLabel }}</strong>
          <span class="summary-card__hint">{{ $t('most_recent_login_time') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ $t('login_address') }}</span>
          <strong class="summary-card__value summary-card__value--small">{{ loginIpLabel }}</strong>
          <span class="summary-card__hint">{{ $t('most_recent_login_ip_information') }}</span>
        </article>
      </section>

      <div class="content-grid">
        <section class="panel-card">
          <header class="panel-card__header">
            <div>
              <h2>{{ $t('profile_details') }}</h2>
              <p>{{ $t('the_following_information_is_used_for_ac') }}。</p>
            </div>
          </header>

          <div class="panel-card__body info-grid">
            <article class="info-item">
              <span class="info-item__label">{{ $t('english_name') }}</span>
              <strong class="info-item__value">{{ profile.nickName || $t('not_filled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ $t('gender') }}</span>
              <strong class="info-item__value">{{ sexLabel }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ $t('email') }}</span>
              <strong class="info-item__value">{{ profile.email || $t('not_filled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ $t('phone_number') }}</span>
              <strong class="info-item__value">{{ profile.phonenumber || $t('not_filled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ $t('account_number') }}</span>
              <strong class="info-item__value">{{ profile.userName || $t('not_filled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ $t('remarks') }}</span>
              <strong class="info-item__value">{{ profile.remark || $t('not_filled') }}</strong>
            </article>
          </div>
        </section>

        <section class="panel-card panel-card--aside">
          <header class="panel-card__header">
            <div>
              <h2>{{ $t('update_notes') }}</h2>
              <p>{{ $t('you_can_directly_edit_common_contact_fie') }}。</p>
            </div>
          </header>

          <div class="panel-card__body panel-card__body--tips">
            <div class="tip-chip">{{ $t('display_name') }}</div>
            <div class="tip-chip">{{ $t('contact_info') }}</div>
            <div class="tip-chip">{{ $t('login_info') }}</div>
            <p class="tip-copy">
              {{ $t('if_profile_submission_fails_check_that_e') }}。
            </p>
          </div>
        </section>
      </div>

      <section v-if="showEditor" class="editor-card">
        <header class="panel-card__header">
          <div>
            <h2>{{ $t('edit_profile') }}</h2>
            <p>{{ $t('changes_will_be_submitted_to_the_current') }}。</p>
          </div>
        </header>

        <form class="panel-card__body editor-form" novalidate @submit.prevent="saveProfile">
          <div class="form-grid">
            <label class="form-field">
              <span class="form-field__label">{{ $t('english_name') }}</span>
              <input
                id="assistant-profile-nick-name"
                v-model.trim="draft.nickName"
                class="form-input"
                type="text"
                maxlength="30"
                :placeholder="$t('please_enter_english_name')"
              />
              <span v-if="fieldErrors.nickName" class="field-error">{{ fieldErrors.nickName }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ $t('gender') }}</span>
              <select id="assistant-profile-sex" v-model="draft.sex" class="form-select">
                <option value="0">男</option>
                <option value="1">女</option>
                <option value="2">{{ $t('not_set') }}</option>
              </select>
              <span v-if="fieldErrors.sex" class="field-error">{{ fieldErrors.sex }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ $t('email') }}</span>
              <input
                id="assistant-profile-email"
                v-model.trim="draft.email"
                class="form-input"
                type="email"
                maxlength="50"
                :placeholder="$t('please_enter_your_email')"
              />
              <span v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ $t('phone_number') }}</span>
              <input
                id="assistant-profile-phone"
                v-model.trim="draft.phonenumber"
                class="form-input"
                type="tel"
                maxlength="11"
                :placeholder="$t('please_enter_an_11_digit_phone_number')"
              />
              <span v-if="fieldErrors.phonenumber" class="field-error">{{ fieldErrors.phonenumber }}</span>
            </label>
          </div>

          <section
            v-if="editorNotice"
            class="feedback-banner feedback-banner--compact"
            :class="feedbackToneClass(editorNotice.type)"
          >
            <strong>{{ editorNotice.title }}</strong>
            <span>{{ editorNotice.text }}</span>
          </section>

          <div class="editor-actions">
            <button id="assistant-profile-cancel" type="button" class="ghost-button" @click="closeEditor">
              {{ $t('cancel') }}
            </button>
            <button
              id="assistant-profile-save"
              type="submit"
              class="primary-button"
              :disabled="saving"
            >
              {{ saving ? '保存中...' : $t('save_changes') }}
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getAssistantProfile,
  updateAssistantProfile,
  type AssistantProfile,
  type AssistantProfileUpdatePayload,
} from '@osg/shared/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface ProfileDraft {
  nickName: string
  email: string
  phonenumber: string
  sex: string
}

interface NoticeState {
  type: 'success' | 'error'
  title: string
  text: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^1\d{10}$/

const loading = ref(true)
const saving = ref(false)
const showEditor = ref(false)
const errorMessage = ref('')
const profile = ref<AssistantProfile | null>(null)
const pageNotice = ref<NoticeState | null>(null)
const editorNotice = ref<NoticeState | null>(null)

const draft = reactive<ProfileDraft>({
  nickName: '',
  email: '',
  phonenumber: '',
  sex: '0',
})

const fieldErrors = reactive<Record<keyof ProfileDraft, string>>({
  nickName: '',
  email: '',
  phonenumber: '',
  sex: '',
})

const displayName = computed(() => profile.value?.nickName?.trim() || profile.value?.userName || 'Assistant')
const avatarText = computed(() => displayName.value.replace(/\s+/g, '').slice(0, 2).toUpperCase())
const sexLabel = computed(() => {
  if (profile.value?.sex === '1') {
    return '女'
  }
  if (profile.value?.sex === '2') {
    return t('not_set')
  }
  return '男'
})
const statusLabel = computed(() => (profile.value?.status === '1' ? '停用' : t('active_3')))
const statusToneClass = computed(() =>
  profile.value?.status === '1' ? 'readonly-pill--danger' : 'readonly-pill--success',
)
const contactCompleteness = computed(() => {
  const score = [profile.value?.email, profile.value?.phonenumber].filter((value) => String(value || '').trim()).length
  return `${score}/2`
})
const loginDateLabel = computed(() => formatDateTime(profile.value?.loginDate))
const loginIpLabel = computed(() => profile.value?.loginIp || t('not_recorded'))

function formatDateTime(value?: string) {
  if (!value) {
    return t('not_recorded')
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function applyProfile(nextProfile: AssistantProfile | null) {
  profile.value = nextProfile
  draft.nickName = nextProfile?.nickName || ''
  draft.email = nextProfile?.email || ''
  draft.phonenumber = nextProfile?.phonenumber || ''
  draft.sex = nextProfile?.sex || '0'
}

function clearFieldErrors() {
  fieldErrors.nickName = ''
  fieldErrors.email = ''
  fieldErrors.phonenumber = ''
  fieldErrors.sex = ''
}

function openEditor() {
  applyProfile(profile.value)
  clearFieldErrors()
  editorNotice.value = null
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editorNotice.value = null
  clearFieldErrors()
}

function validateProfile() {
  clearFieldErrors()

  let valid = true
  if (draft.nickName.trim().length < 2) {
    fieldErrors.nickName = '请输入至少 2 个字符的英文名。'
    valid = false
  }

  if (!emailPattern.test(draft.email.trim())) {
    fieldErrors.email = '请输入正确的邮箱格式。'
    valid = false
  }

  if (draft.phonenumber && !phonePattern.test(draft.phonenumber.trim())) {
    fieldErrors.phonenumber = '手机号需为 11 位数字。'
    valid = false
  }

  if (!['0', '1', '2'].includes(draft.sex)) {
    fieldErrors.sex = '请选择有效的性别。'
    valid = false
  }

  if (!valid) {
    editorNotice.value = {
      type: 'error',
      title: t('cannot_save'),
      text: '请先修正表单中的错误信息。',
    }
  } else {
    editorNotice.value = null
  }

  return valid
}

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getAssistantProfile()
    applyProfile(response || {})
  } catch (error: any) {
    errorMessage.value = error?.message || '资料暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!profile.value || !validateProfile()) {
    return
  }

  saving.value = true

  const payload: AssistantProfileUpdatePayload = {
    ...profile.value,
    nickName: draft.nickName.trim(),
    email: draft.email.trim(),
    phonenumber: draft.phonenumber.trim(),
    sex: draft.sex,
  }

  try {
    await updateAssistantProfile(payload)
    await loadProfile()
    showEditor.value = false
    pageNotice.value = {
      type: 'success',
      title: t('saved_successfully'),
      text: '基本信息已更新，并同步显示最新内容。',
    }
  } catch (error: any) {
    editorNotice.value = {
      type: 'error',
      title: t('save_failed'),
      text: error?.message || '资料暂时无法保存，请稍后重试。',
    }
  } finally {
    saving.value = false
  }
}

function feedbackToneClass(type: NoticeState['type']) {
  return type === 'success' ? 'feedback-banner--success' : 'feedback-banner--error'
}

onMounted(() => {
  void loadProfile()
})
</script>

<style scoped lang="scss">
.profile-page {
  display: grid;
  gap: 24px;
  color: var(--text);
}

.page-header,
.page-header__actions,
.hero-card,
.hero-card__identity,
.hero-card__actions,
.editor-actions {
  display: flex;
  align-items: center;
}

.page-header,
.hero-card,
.content-grid {
  gap: 20px;
}

.page-header,
.hero-card,
.summary-card,
.panel-card,
.editor-card,
.state-card,
.feedback-banner {
  border-radius: 24px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: var(--card-shadow);
}

.page-header,
.hero-card,
.panel-card__header,
.panel-card__body,
.editor-form,
.state-card {
  padding: 24px 28px;
}

.page-header {
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
}

.page-title-en {
  margin-left: 10px;
  color: var(--muted);
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  margin: 10px 0 0;
  max-width: 720px;
  color: var(--text2);
  line-height: 1.7;
}

.page-header__actions,
.hero-card__actions,
.editor-actions {
  gap: 12px;
}

.status-pill,
.readonly-pill,
.tip-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.status-pill {
  padding: 10px 14px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
}

.readonly-pill {
  padding: 10px 14px;
}

.readonly-pill--success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.readonly-pill--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.hero-card {
  justify-content: space-between;
}

.hero-card__identity {
  gap: 16px;
}

.avatar {
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--primary), #9bb8d9);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

.hero-card__name {
  font-size: 24px;
  font-weight: 700;
}

.hero-card__meta {
  margin-top: 6px;
  color: var(--text2);
}

.feedback-banner {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
}

.feedback-banner strong {
  white-space: nowrap;
}

.feedback-banner span {
  line-height: 1.7;
}

.feedback-banner--compact {
  border-radius: 18px;
  padding: 14px 16px;
}

.feedback-banner--success {
  background: #f0fdf4;
  border-color: rgba(22, 163, 74, 0.16);
  color: #166534;
}

.feedback-banner--error {
  background: #fff7f7;
  border-color: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.summary-grid,
.info-grid,
.form-grid,
.content-grid {
  display: grid;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 22px;
}

.summary-card__label,
.summary-card__hint,
.info-item__label,
.tip-copy,
.form-field__label {
  color: var(--text2);
}

.summary-card__label,
.info-item__label,
.form-field__label {
  font-size: 13px;
  font-weight: 700;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--small {
  font-size: 20px;
}

.summary-card__hint,
.tip-copy,
.info-item__value {
  line-height: 1.7;
}

.content-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
}

.panel-card,
.editor-card {
  overflow: hidden;
}

.panel-card__header,
.panel-card__body {
  display: grid;
  gap: 8px;
}

.panel-card__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.panel-card__header p,
.state-card p {
  margin: 0;
  color: var(--text2);
  line-height: 1.7;
}

.info-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.info-item {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  background: var(--bg);
}

.info-item__value {
  font-size: 16px;
  font-weight: 700;
}

.panel-card__body--tips {
  gap: 12px;
}

.tip-chip {
  width: fit-content;
  padding: 8px 12px;
  background: var(--bg);
  color: var(--text2);
}

.editor-form {
  gap: 18px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: grid;
  gap: 8px;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  color: var(--text);
  padding: 0 14px;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(115, 153, 198, 0.16);
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.5;
}

.primary-button,
.ghost-button {
  min-height: 42px;
  border: 0;
  border-radius: 14px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.primary-button {
  background: var(--primary);
  color: #fff;
}

.ghost-button {
  background: var(--bg);
  color: var(--text2);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.state-card {
  display: grid;
  gap: 8px;
}

.state-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.state-card--error {
  background: #fff7f7;
}

@media (max-width: 1180px) {
  .summary-grid,
  .content-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header,
  .hero-card {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header,
  .hero-card,
  .panel-card__header,
  .panel-card__body,
  .editor-form,
  .state-card {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>

