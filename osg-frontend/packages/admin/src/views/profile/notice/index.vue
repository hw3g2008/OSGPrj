<template>
  <section class="osg-page">
    <PageHeader :title-zh="$t('notification_management')" :description="$t('send_notifications_to_students_and_mento')">
      <template #actions>
        <a-button type="primary" @click="showSendNoticeModal = true">
          <template #icon><BellOutlined /></template>
          {{ $t('send_notification') }}
        </a-button>
      </template>
    </PageHeader>

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="$t('title_recipient')" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="receiverType" :placeholder="$t('type')" allow-clear style="width: 120px">
          <a-select-option value="">{{ $t('type') }}</a-select-option>
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
          {{ $t('search') }}
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
              {{ $t('view') }}
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
import { onMounted, ref } from 'vue'
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const rows = ref<NoticeRow[]>([])
const keyword = ref('')
const receiverType = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const submitting = ref(false)
const showSendNoticeModal = ref(false)
const activeNotice = ref<NoticeRow | null>(null)

const columns = [
  { title: 'ID', dataIndex: 'noticeId', key: 'noticeId' },
  { title: t('recipient'), dataIndex: 'receiverLabel', key: 'receiverLabel' },
  { title: t('type'), dataIndex: 'receiverType', key: 'receiverType' },
  { title: 'Tag', dataIndex: 'tag', key: 'tag' },
  { title: t('title'), dataIndex: 'noticeTitle', key: 'noticeTitle' },
  { title: t('updated_at'), dataIndex: 'createTime', key: 'createTime' },
  { title: t('operation'), dataIndex: 'action', key: 'action' }
]

const loadNotices = async () => {
  try {
    const response = await getNoticeList({
      keyword: keyword.value,
      receiverType: receiverType.value
    })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error(t('failed_to_load_notification_list'))
  }
}

const handleSendNotice = async (payload: SendNoticePayload) => {
  submitting.value = true
  try {
    await sendNotice(payload)
    showSendNoticeModal.value = false
    message.success(t('notification_sent_successfully'))
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
