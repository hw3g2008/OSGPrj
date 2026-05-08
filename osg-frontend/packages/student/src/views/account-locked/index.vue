<template>
  <div class="account-locked">
    <div class="account-locked__card">
      <div class="account-locked__icon" :class="iconToneClass">
        <i class="mdi mdi-lock-alert" aria-hidden="true" />
      </div>
      <h1 class="account-locked__title">{{ titleText }}</h1>
      <p class="account-locked__desc">{{ descText }}</p>
      <div class="account-locked__actions">
        <a-button type="primary" @click="handleContact">联系班主任</a-button>
        <a-button @click="handleLogout">退出登录</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import { clearAuth } from '@osg/shared/utils'

type LockReason = 'contract_ended' | 'blacklisted'

const route = useRoute()
const router = useRouter()

const reason = computed<LockReason>(() => {
  const raw = (route.query.reason ?? '') as string
  return raw === 'blacklisted' ? 'blacklisted' : 'contract_ended'
})

const titleText = computed(() =>
  reason.value === 'blacklisted' ? '账号已加入黑名单' : '合同已结束',
)

const descText = computed(() =>
  reason.value === 'blacklisted'
    ? '账号已加入黑名单，无法查看求职信息。如有疑问，请联系您的班主任。'
    : '合同已结束，无法查看求职信息。续签合同后将自动恢复正常状态。',
)

const iconToneClass = computed(() =>
  reason.value === 'blacklisted'
    ? 'account-locked__icon--danger'
    : 'account-locked__icon--neutral',
)

function handleContact() {
  Modal.info({
    title: '联系班主任',
    content: '请通过站内信或邮件联系您的班主任处理后续事宜。',
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
