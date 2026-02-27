<template>
  <div class="base-data-page">
    <div class="page-header">
      <div>
        <h2>基础数据管理</h2>
        <p class="subtitle">管理系统基础配置数据</p>
      </div>
      <a-button type="primary" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        新增{{ currentTabLabel }}
      </a-button>
    </div>

    <div class="category-cards">
      <div
        v-for="cat in categories"
        :key="cat.key"
        :class="['category-card', { active: selectedCategory === cat.key }]"
        @click="selectCategory(cat.key)"
      >
        <span class="card-icon" :style="{ color: cat.iconColor }">
          <component :is="cat.iconComponent" />
        </span>
        <span class="card-label">{{ cat.label }}</span>
      </div>
    </div>

    <a-tabs v-model:activeKey="selectedTab" @change="handleTabChange">
      <a-tab-pane
        v-for="tab in currentTabs"
        :key="tab.key"
        :tab="tab.label"
      />
    </a-tabs>

    <div class="filter-bar">
      <a-input
        v-model:value="searchName"
        :placeholder="`搜索${currentTabLabel}...`"
        style="width: 200px"
        allow-clear
        @pressEnter="handleSearch"
      />
      <a-button type="primary" @click="handleSearch">搜索</a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataList"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <span class="data-name">{{ record.name }}</span>
        </template>

        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === '0' ? 'success' : 'error'">
            {{ record.status === '0' ? '启用' : '禁用' }}
          </a-tag>
        </template>

        <template v-if="column.key === 'updateTime'">
          {{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}
        </template>

        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
          <a-button
            v-if="record.status === '0'"
            type="link"
            size="small"
            danger
            @click="handleDisable(record)"
          >
            禁用
          </a-button>
          <a-button
            v-if="record.status === '1'"
            type="link"
            size="small"
            style="color: #52c41a"
            @click="handleEnable(record)"
          >
            启用
          </a-button>
        </template>
      </template>
    </a-table>

    <div class="pagination-bar">
      <span class="total">共 {{ pagination.total }} 条记录</span>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-size-changer
        @change="handlePageChange"
      />
    </div>

    <BaseDataModal
      v-model:visible="modalVisible"
      :record="currentRecord"
      :tab="selectedTab"
      :tab-label="currentTabLabel"
      :current-tabs="currentTabs"
      @success="loadDataList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  ScheduleOutlined,
  TeamOutlined,
  ReadOutlined,
  DollarOutlined
} from '@ant-design/icons-vue'
import { getBaseDataList, changeBaseDataStatus } from '@/api/baseData'
import BaseDataModal from './components/BaseDataModal.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const dataList = ref<any[]>([])
const modalVisible = ref(false)
const currentRecord = ref<any>(null)
const searchName = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const categories = [
  {
    key: 'job',
    label: '求职相关',
    iconComponent: ScheduleOutlined,
    iconColor: '#13c2c2',
    tabs: [
      { key: 'job_category', label: '岗位分类' },
      { key: 'company_name', label: '公司/银行名称', hasParent: true, parentTab: 'company_type' },
      { key: 'company_type', label: '公司/银行类别' },
      { key: 'region', label: '大区' },
      { key: 'city', label: '地区/城市', hasParent: true, parentTab: 'region' },
      { key: 'recruit_cycle', label: '招聘周期' }
    ]
  },
  {
    key: 'student',
    label: '学员相关',
    iconComponent: TeamOutlined,
    iconColor: '#52c41a',
    tabs: [
      { key: 'school', label: '学校' },
      { key: 'major_direction', label: '主攻方向' },
      { key: 'sub_direction', label: '子方向', hasParent: true, parentTab: 'major_direction' }
    ]
  },
  {
    key: 'course',
    label: '课程相关',
    iconComponent: ReadOutlined,
    iconColor: '#fa8c16',
    tabs: [
      { key: 'course_type', label: '课程类型' }
    ]
  },
  {
    key: 'finance',
    label: '财务相关',
    iconComponent: DollarOutlined,
    iconColor: '#1890ff',
    tabs: [
      { key: 'expense_type', label: '报销类型' }
    ]
  }
]

const selectedCategory = ref('job')
const selectedTab = ref('job_category')

const currentTabs = computed(() => {
  const cat = categories.find(c => c.key === selectedCategory.value)
  return cat ? cat.tabs : []
})

const currentTabLabel = computed(() => {
  const tab = currentTabs.value.find(t => t.key === selectedTab.value)
  return tab ? tab.label : ''
})

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '状态', key: 'status', width: 100 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '更新时间', key: 'updateTime', width: 150 },
  { title: '操作', key: 'action', width: 150 }
]

const selectCategory = (key: string) => {
  selectedCategory.value = key
  const cat = categories.find(c => c.key === key)
  if (cat && cat.tabs.length > 0) {
    selectedTab.value = cat.tabs[0].key
  }
}

const handleTabChange = () => {
  pagination.current = 1
  searchName.value = ''
  loadDataList()
}

watch(selectedTab, () => {
  pagination.current = 1
  searchName.value = ''
  loadDataList()
})

const loadDataList = async () => {
  try {
    loading.value = true
    const res = await getBaseDataList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      name: searchName.value || undefined,
      category: selectedCategory.value,
      tab: selectedTab.value
    })
    dataList.value = res.rows || []
    pagination.total = res.total || 0
  } catch (error) {
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadDataList()
}

const handlePageChange = () => {
  loadDataList()
}

const handleAdd = () => {
  currentRecord.value = null
  modalVisible.value = true
}

const handleEdit = (record: any) => {
  currentRecord.value = record
  modalVisible.value = true
}

const handleDisable = (record: any) => {
  Modal.confirm({
    title: '确认禁用',
    content: `确定要禁用「${record.name}」吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await changeBaseDataStatus({ id: record.id, status: '1' })
        message.success('已禁用')
        loadDataList()
      } catch (error) {
        message.error('操作失败')
      }
    }
  })
}

const handleEnable = async (record: any) => {
  try {
    await changeBaseDataStatus({ id: record.id, status: '0' })
    message.success('已启用')
    loadDataList()
  } catch (error) {
    message.error('操作失败')
  }
}

onMounted(() => {
  loadDataList()
})
</script>

<style scoped lang="scss">
.base-data-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;

    h2 {
      margin: 0 0 4px;
      font-size: 20px;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .category-cards {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;

    .category-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: 2px solid #f0f0f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #d9d9d9;
      }

      &.active {
        border-color: #1890ff;
        background: #e6f7ff;
      }

      .card-icon {
        font-size: 20px;
      }

      .card-label {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .data-name {
    font-weight: 600;
  }

  .pagination-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;

    .total {
      color: #666;
      font-size: 14px;
    }
  }
}
</style>
