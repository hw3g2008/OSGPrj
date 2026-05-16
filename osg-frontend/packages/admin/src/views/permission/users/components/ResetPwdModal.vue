<template>
  <OverlaySurfaceModal
    surface-id="modal-reset-password"
    :open="visible"
    width="460px"
    body-class="osg-modal-form reset-pwd-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="reset-pwd-modal__title">
        <span class="mdi mdi-lock-reset reset-pwd-modal__title-icon" aria-hidden="true" />
        <span>{{ t('admin.permission.users.resetPwdModal.title') }}</span>
      </span>
    </template>

    <div class="reset-pwd-modal__warning" data-content-part="status-banner">
      <span class="mdi mdi-alert" aria-hidden="true" />
      <p data-content-part="supporting-text">
        {{ t('admin.permission.users.resetPwdModal.warningPrefix') }}<strong>{{ DEFAULT_PASSWORD }}</strong>{{ t('admin.permission.users.resetPwdModal.warningSuffix') }}
      </p>
    </div>

    <div class="reset-pwd-modal__identity">
      <span class="reset-pwd-modal__identity-name">
        {{ props.user?.nickName || props.user?.userName || t('admin.permission.users.resetPwdModal.noUser') }}
      </span>
      <span class="reset-pwd-modal__identity-account">@{{ props.user?.userName || 'unknown' }}</span>
    </div>

    <template #footer>
      <div data-content-part="action-row" class="reset-pwd-modal__actions">
        <a-button class="reset-pwd-modal__cancel-btn" data-surface-part="cancel-control" @click="handleClose">
          <span>{{ t('admin.permission.users.resetPwdModal.cancel') }}</span>
        </a-button>
        <a-button
          type="primary"
          :loading="loading"
          class="reset-pwd-modal__confirm-btn"
          @click="handleSubmit"
        >
          <span class="mdi mdi-check" aria-hidden="true" />
          <span>{{ t('admin.permission.users.resetPwdModal.confirm') }}</span>
        </a-button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { resetUserPwd } from '@/api/user'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

const DEFAULT_PASSWORD = 'Osg@2026'

const props = defineProps<{
  visible: boolean
  user: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const loading = ref(false)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  if (!props.user?.userId) return
  try {
    loading.value = true
    await resetUserPwd({
      userId: props.user.userId,
      password: DEFAULT_PASSWORD,
    }, {
      customErrorMessage: t('admin.permission.users.resetPwdModal.resetError'),
    })
    message.success(t('admin.permission.users.resetPwdModal.resetSuccess', { password: DEFAULT_PASSWORD }))
    emit('success')
    handleClose()
  } catch (_error) {
    // i18n-skip-line: dev comment — 交给拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
/* (keep all styles unchanged) */
.reset-pwd-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.reset-pwd-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.reset-pwd-modal__identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
  padding: 0 2px;
}

.reset-pwd-modal__identity-name {
  color: #1a2234;
  font-size: 15px;
  font-weight: 700;
}

.reset-pwd-modal__identity-account {
  color: #69758b;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 12px;
}

.reset-pwd-modal__warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: #eef2ff;
  border: 1px solid rgba(79, 116, 255, 0.12);

  .mdi,
  p {
    color: #4f46e5;
  }

  .mdi {
    font-size: 18px;
    line-height: 1;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
  }

  strong {
    font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
    color: #312e81;
  }
}

.reset-pwd-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.reset-pwd-modal__cancel-btn {
  min-width: 92px;
  height: 42px;
  border-color: rgba(26, 34, 52, 0.12);
  border-radius: 14px;
  color: #69758b;
  font-weight: 600;
}

.reset-pwd-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  height: 42px;
  border: none !important;
  border-radius: 14px;
  background: linear-gradient(135deg, #3f68ff, #6788ff) !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 16px 34px rgba(79, 116, 255, 0.2);

  &:hover,
  &:focus {
    background: linear-gradient(135deg, #3f68ff, #6788ff) !important;
    color: #fff !important;
    opacity: 0.96;
  }
}
</style>

<style lang="scss">
.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn {
  background-color: #4f74ff !important;
  background-image: none !important;
  border-color: #4f74ff !important;
  color: #fff !important;
}

.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:hover,
.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:focus {
  background-color: #4f74ff !important;
  background-image: none !important;
  border-color: #4f74ff !important;
  color: #fff !important;
}
</style>
