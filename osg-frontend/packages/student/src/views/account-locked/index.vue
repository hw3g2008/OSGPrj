<template>
  <div class="account-locked">
    <div class="account-locked__card">
      <div class="account-locked__icon" :class="iconToneClass">
        <i class="mdi mdi-lock-alert" aria-hidden="true" />
      </div>
      <h1 class="account-locked__title">{{ titleText }}</h1>
      <p class="account-locked__desc">{{ descText }}</p>
      <div class="account-locked__actions">
        <a-button type="primary" @click="handleContact">{{ t('student.accountLocked.k1') }}</a-button>
        <a-button @click="handleLogout">{{ t('student.accountLocked.k2') }}</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import { clearAuth } from '@osg/shared/utils'

const { t } = useI18n()

type LockReason = 'contract_ended' | 'blacklisted'

const route = useRoute()
const router = useRouter()

const reason = computed<LockReason>(() => {
  const raw = (route.query.reason ?? '') as string
  return raw === 'blacklisted' ? 'blacklisted' : 'contract_ended'
})

const titleText = computed(() =>
  reason.value === 'blacklisted' ? t('student.accountLocked.k7') : t('student.accountLocked.k3'),
)

const descText = computed(() =>
  reason.value === 'blacklisted'
    ? t('student.accountLocked.k4')
    : t('student.accountLocked.k5'),
)

const iconToneClass = computed(() =>
  reason.value === 'blacklisted'
    ? 'account-locked__icon--danger'
    : 'account-locked__icon--neutral',
)

function handleContact() {
  Modal.info({
    title: t('student.accountLocked.k1'),
    content: t('student.accountLocked.k6'),
  })
}

function handleLogout() {
  clearAuth()
  router.replace({ name: 'Login' })
}
</script>

<style scoped>
.account-locked {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  padding: 24px;
}

.account-locked__card {
  width: 100%;
  max-width: 480px;
  padding: 40px 32px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.account-locked__icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.account-locked__icon--neutral {
  background: #e5e7eb;
  color: #6b7280;
}

.account-locked__icon--danger {
  background: #fee2e2;
  color: #dc2626;
}

.account-locked__title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 600;
  color: #111827;
}

.account-locked__desc {
  margin: 0 0 32px;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.7;
}

.account-locked__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
