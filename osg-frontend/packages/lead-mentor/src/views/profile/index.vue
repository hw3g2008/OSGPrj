<template>
  <div class="profile-page">
    <OsgPageContainer :title="t('leadMentor.profile.k1')">
      <a-descriptions :title="t('leadMentor.profile.k2')" :column="2">
        <a-descriptions-item :label="t('leadMentor.profile.k3')">{{ userInfo?.userName }}</a-descriptions-item>
        <a-descriptions-item :label="t('leadMentor.profile.k4')">{{ userInfo?.nickName }}</a-descriptions-item>
        <a-descriptions-item :label="t('leadMentor.profile.k5')">{{ userInfo?.phonenumber || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="t('leadMentor.profile.k6')">{{ userInfo?.email || '-' }}</a-descriptions-item>
      </a-descriptions>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'
import { getUser } from '@osg/shared/utils'
import type { UserInfo } from '@osg/shared/types'
const userInfo = ref<UserInfo | null>(null)

const { t } = useI18n()
onMounted(() => { userInfo.value = getUser() })
</script>
