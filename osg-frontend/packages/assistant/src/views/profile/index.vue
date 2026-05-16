<template>
  <div id="page-profile" class="profile-page">
    <PageHeader
      :title-zh="t('assistant.profile.title')"
      :title-en="t('assistant.profile.titleEn')"
    >
      <template #actions>
        <span class="status-pill">{{ t('assistant.profile.overviewBadge') }}</span>
        <button
          id="assistant-profile-edit"
          type="button"
          class="primary-button"
          @click="openEditor"
        >
          {{ t('assistant.profile.actions.edit') }}
        </button>
      </template>
    </PageHeader>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>{{ t('assistant.profile.states.loadFailedTitle') }}</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadProfile">{{ t('assistant.profile.actions.reload') }}</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>{{ t('assistant.profile.states.loadingTitle') }}</h2>
      <p>{{ t('assistant.profile.states.loadingHint') }}</p>
    </section>

    <template v-else-if="profile">
      <section class="hero-card">
        <div class="hero-card__identity">
          <div class="avatar">{{ avatarText }}</div>
          <div>
            <div class="hero-card__name">{{ displayName }}</div>
            <div class="hero-card__meta">{{ (profile.userName || '-') + ' · ' + t('assistant.profile.identity.metaSuffix') }}</div>
          </div>
        </div>

        <div class="hero-card__actions">
          <span class="readonly-pill" :class="statusToneClass">{{ statusLabel }}</span>
          <button type="button" class="ghost-button" @click="loadProfile">{{ t('assistant.profile.actions.refresh') }}</button>
        </div>
      </section>

      <section v-if="pageNotice" class="feedback-banner" :class="feedbackToneClass(pageNotice.type)">
        <strong>{{ pageNotice.title }}</strong>
        <span>{{ pageNotice.text }}</span>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <span class="summary-card__label">{{ t('assistant.profile.summary.statusLabel') }}</span>
          <strong class="summary-card__value">{{ statusLabel }}</strong>
          <span class="summary-card__hint">{{ t('assistant.profile.summary.statusHint') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ t('assistant.profile.summary.contactLabel') }}</span>
          <strong class="summary-card__value">{{ contactCompleteness }}</strong>
          <span class="summary-card__hint">{{ t('assistant.profile.summary.contactHint') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ t('assistant.profile.summary.loginDateLabel') }}</span>
          <strong class="summary-card__value summary-card__value--small">{{ loginDateLabel }}</strong>
          <span class="summary-card__hint">{{ t('assistant.profile.summary.loginDateHint') }}</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">{{ t('assistant.profile.summary.loginIpLabel') }}</span>
          <strong class="summary-card__value summary-card__value--small">{{ loginIpLabel }}</strong>
          <span class="summary-card__hint">{{ t('assistant.profile.summary.loginIpHint') }}</span>
        </article>
      </section>

      <div class="content-grid">
        <section class="panel-card">
          <header class="panel-card__header">
            <div>
              <h2>{{ t('assistant.profile.detail.title') }}</h2>
              <p>{{ t('assistant.profile.detail.subtitle') }}</p>
            </div>
          </header>

          <div class="panel-card__body info-grid">
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.nickName') }}</span>
              <strong class="info-item__value">{{ profile.nickName || t('assistant.common.notFilled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.sex') }}</span>
              <strong class="info-item__value">{{ sexLabel }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.email') }}</span>
              <strong class="info-item__value">{{ profile.email || t('assistant.common.notFilled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.phone') }}</span>
              <strong class="info-item__value">{{ profile.phonenumber || t('assistant.common.notFilled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.account') }}</span>
              <strong class="info-item__value">{{ profile.userName || t('assistant.common.notFilled') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-item__label">{{ t('assistant.profile.detail.remark') }}</span>
              <strong class="info-item__value">{{ profile.remark || t('assistant.common.notFilled') }}</strong>
            </article>
          </div>
        </section>

        <section class="panel-card panel-card--aside">
          <header class="panel-card__header">
            <div>
              <h2>{{ t('assistant.profile.tips.title') }}</h2>
              <p>{{ t('assistant.profile.tips.subtitle') }}</p>
            </div>
          </header>

          <div class="panel-card__body panel-card__body--tips">
            <div class="tip-chip">{{ t('assistant.profile.tips.chip1') }}</div>
            <div class="tip-chip">{{ t('assistant.profile.tips.chip2') }}</div>
            <div class="tip-chip">{{ t('assistant.profile.tips.chip3') }}</div>
            <p class="tip-copy">
              {{ t('assistant.profile.tips.copy') }}
            </p>
          </div>
        </section>
      </div>

      <section v-if="showEditor" class="editor-card">
        <header class="panel-card__header">
          <div>
            <h2>{{ t('assistant.profile.editor.title') }}</h2>
            <p>{{ t('assistant.profile.editor.subtitle') }}</p>
          </div>
        </header>

        <form class="panel-card__body editor-form" novalidate @submit.prevent="saveProfile">
          <div class="form-grid">
            <label class="form-field">
              <span class="form-field__label">{{ t('assistant.profile.detail.nickName') }}</span>
              <input
                id="assistant-profile-nick-name"
                v-model.trim="draft.nickName"
                class="form-input"
                type="text"
                maxlength="30"
                :placeholder="t('assistant.profile.editor.nickNamePlaceholder')"
              />
              <span v-if="fieldErrors.nickName" class="field-error">{{ fieldErrors.nickName }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ t('assistant.profile.detail.sex') }}</span>
              <select id="assistant-profile-sex" v-model="draft.sex" class="form-select">
                <option value="0">{{ t('assistant.profile.sex.male') }}</option>
                <option value="1">{{ t('assistant.profile.sex.female') }}</option>
                <option value="2">{{ t('assistant.profile.sex.unset') }}</option>
              </select>
              <span v-if="fieldErrors.sex" class="field-error">{{ fieldErrors.sex }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ t('assistant.profile.detail.email') }}</span>
              <input
                id="assistant-profile-email"
                v-model.trim="draft.email"
                class="form-input"
                type="email"
                maxlength="50"
                :placeholder="t('assistant.profile.editor.emailPlaceholder')"
              />
              <span v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</span>
            </label>

            <label class="form-field">
              <span class="form-field__label">{{ t('assistant.profile.detail.phone') }}</span>
              <input
                id="assistant-profile-phone"
                v-model.trim="draft.phonenumber"
                class="form-input"
                type="tel"
                maxlength="11"
                :placeholder="t('assistant.profile.editor.phonePlaceholder')"
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
              {{ t('assistant.profile.actions.cancel') }}
            </button>
            <button
              id="assistant-profile-save"
              type="submit"
              class="primary-button"
              :disabled="saving"
            >
              {{ saving ? t('assistant.profile.actions.saving') : t('assistant.profile.actions.save') }}
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getAssistantProfile,
  updateAssistantProfile,
  type AssistantProfile,
  type AssistantProfileUpdatePayload,
} from '@osg/shared/api'

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

const { t } = useI18n()

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

const displayName = computed(() => profile.value?.nickName?.trim() || profile.value?.userName || t('assistant.profile.identity.fallbackName'))
const avatarText = computed(() => displayName.value.replace(/\s+/g, '').slice(0, 2).toUpperCase())
const sexLabel = computed(() => {
  if (profile.value?.sex === '1') {
    return t('assistant.profile.sex.female')
  }
  if (profile.value?.sex === '2') {
    return t('assistant.profile.sex.unset')
  }
  return t('assistant.profile.sex.male')
})
const statusLabel = computed(() => (profile.value?.status === '1' ? t('assistant.profile.status.disabled') : t('assistant.profile.status.active')))
const statusToneClass = computed(() =>
  profile.value?.status === '1' ? 'readonly-pill--danger' : 'readonly-pill--success',
)
const contactCompleteness = computed(() => {
  const score = [profile.value?.email, profile.value?.phonenumber].filter((value) => String(value || '').trim()).length
  return `${score}/2`
})
const loginDateLabel = computed(() => formatDateTime(profile.value?.loginDate))
const loginIpLabel = computed(() => profile.value?.loginIp || t('assistant.common.notRecorded'))

function formatDateTime(value?: string) {
  if (!value) {
    return t('assistant.common.notRecorded')
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
    fieldErrors.nickName = t('assistant.profile.errors.nickNameTooShort')
    valid = false
  }

  if (!emailPattern.test(draft.email.trim())) {
    fieldErrors.email = t('assistant.profile.errors.emailInvalid')
    valid = false
  }

  if (draft.phonenumber && !phonePattern.test(draft.phonenumber.trim())) {
    fieldErrors.phonenumber = t('assistant.profile.errors.phoneInvalid')
    valid = false
  }

  if (!['0', '1', '2'].includes(draft.sex)) {
    fieldErrors.sex = t('assistant.profile.errors.sexInvalid')
    valid = false
  }

  if (!valid) {
    editorNotice.value = {
      type: 'error',
      title: t('assistant.profile.errors.cannotSaveTitle'),
      text: t('assistant.profile.errors.cannotSaveText'),
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
    errorMessage.value = error?.message || t('assistant.profile.states.loadFailedFallback')
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
      title: t('assistant.profile.success.title'),
      text: t('assistant.profile.success.text'),
    }
  } catch (error: any) {
    editorNotice.value = {
      type: 'error',
      title: t('assistant.profile.errors.saveFailedTitle'),
      text: error?.message || t('assistant.profile.errors.saveFailedFallback'),
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
