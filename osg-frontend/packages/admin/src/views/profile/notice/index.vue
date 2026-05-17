<template>
  <section class="osg-page">
    <PageHeader :title-zh="t('admin.profile.notice.title')">
      <template #actions>
        <a-button type="primary" @click="showSendNoticeModal = true">
          <template #icon><BellOutlined /></template>
          {{ t('admin.profile.notice.sendBtn') }}
        </a-button>
      </template>
    </PageHeader>

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="t('admin.profile.notice.filter.searchPlaceholder')" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="receiverType" :placeholder="t('admin.profile.notice.filter.typePlaceholder')" allow-clear style="width: 120px">
          <a-select-option value="">{{ t('admin.profile.notice.filter.typePlaceholder') }}</a-select-option>
          <a-select-option value="Lead">Lead</a-select-option>
          <a-select-option value="Mentor">Mentor</a-select-option>
          <a-select-option value="Student">Student</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-range-picker v-model:value="dateRange" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadNotices">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.profile.notice.filter.search') }}
        </a-button>
      </a-form-item>
    </a-form>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: NoticeRow) => record.noticeId"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'noticeId'">
            {{ record.noticeId }}
          </template>
          <template v-else-if="column.dataIndex === 'receiverLabel'">
            <strong v-if="record.receiverLabel">{{ record.receiverLabel }}</strong>
            <span v-else>--</span>
          </template>
          <template v-else-if="column.dataIndex === 'receiverType'">
            <a-tag v-if="record.receiverType" color="success">
              {{ record.receiverType }}
            </a-tag>
            <span v-else>--</span>
          </template>
          <template v-else-if="column.dataIndex === 'tag'">
            {{ record.tag || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'noticeTitle'">
            {{ record.noticeTitle }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="activeNotice = record">
              {{ t('admin.profile.notice.action.view') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <SendNoticeModal
      v-model="showSendNoticeModal"
      :submitting="submitting"
      @confirm="handleSendNotice"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { BellOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import type { Dayjs } from 'dayjs'
import SendNoticeModal from './components/SendNoticeModal.vue'
import {
  getNoticeList,
  sendNotice,
  type NoticeRow,
  type SendNoticePayload
} from '@osg/shared/api/admin/notice'

const { t } = useI18n()
const rows = ref<NoticeRow[]>([])
const keyword = ref('')
const receiverType = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const submitting = ref(false)
const showSendNoticeModal = ref(false)
const activeNotice = ref<NoticeRow | null>(null)

const columns = computed(() => [
  { title: 'ID', dataIndex: 'noticeId', key: 'noticeId', width: 120, fixed: 'left' as const },
  { title: t('admin.profile.notice.columns.receiver'), dataIndex: 'receiverLabel', key: 'receiverLabel' },
  { title: t('admin.profile.notice.columns.type'), dataIndex: 'receiverType', key: 'receiverType' },
  { title: 'Tag', dataIndex: 'tag', key: 'tag' },
  { title: t('admin.profile.notice.columns.title'), dataIndex: 'noticeTitle', key: 'noticeTitle' },
  { title: t('admin.profile.notice.columns.createTime'), dataIndex: 'createTime', key: 'createTime' },
  { title: t('admin.profile.notice.columns.action'), dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const }
])

const loadNotices = async () => {
  try {
    const response = await getNoticeList({
      keyword: keyword.value,
      receiverType: receiverType.value
    })
    rows.value = response.rows ?? []
  } catch (_error) {
  }
}

const handleSendNotice = async (payload: SendNoticePayload) => {
  submitting.value = true
  try {
    await sendNotice(payload)
    showSendNoticeModal.value = false
    message.success(t('admin.profile.notice.messages.sendSuccess'))
    await loadNotices()
  } catch (_error) {
    // request util handles error message
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadNotices()
})
</script>

<style scoped>
</style>
