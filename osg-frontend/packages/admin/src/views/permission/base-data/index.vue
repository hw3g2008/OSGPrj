<template>
  <div class="base-data-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">基础数据管理</h2>
        <p class="page-sub subtitle">管理系统基础配置数据</p>
      </div>
    </div>

    <div class="base-data-page__categories category-cards">
      <button
        v-for="cat in categories"
        :key="cat.key"
        type="button"
        :class="['category-card', { 'category-card--active': selectedCategory === cat.key }]"
        @click="selectCategory(cat.key)"
      >
        <span class="category-card__icon" :style="{ background: cat.iconBg }">
          <i class="mdi" :class="cat.iconClass" :style="{ color: cat.iconColor }" aria-hidden="true"></i>
        </span>
        <span class="category-card__label">{{ cat.label }}</span>
        <span class="category-card__desc">{{ cat.description }}</span>
      </button>
    </div>

    <div class="base-data-tabs">
      <button
        v-for="tab in currentTabs"
        :key="tab.key"
        type="button"
        :class="['base-data-tabs__tab', { 'base-data-tabs__tab--active': selectedTab === tab.key }]"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="content-toolbar">
      <div class="content-toolbar__search">
        <a-input
          v-model:value="searchName"
          class="content-toolbar__input"
          :placeholder="`搜索${currentTabLabel}...`"
          allow-clear
          @pressEnter="handleSearch"
        />
        <button type="button" class="permission-button permission-button--outline" @click="handleSearch">
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <span>搜索</span>
        </button>
      </div>
      <button type="button" class="permission-button permission-button--primary" @click="handleAdd">
        <i class="mdi mdi-plus" aria-hidden="true"></i>
        <span>新增{{ currentAddLabel }}</span>
      </button>
    </div>

    <div class="permission-card">
      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ currentNameHeader }}</th>
              <th>状态</th>
              <th>排序</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in dataList" :key="record.id">
              <td>{{ record.id }}</td>
              <td><strong>{{ record.name }}</strong></td>
              <td>
                <span
                  :class="[
                    'permission-pill',
                    record.status === '0' ? 'permission-pill--success' : 'permission-pill--danger'
                  ]"
                >
                  {{ record.status === '0' ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ record.sort }}</td>
              <td>{{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}</td>
              <td>
                <div class="permission-actions">
                  <button type="button" class="permission-action" @click="handleEdit(record)">编辑</button>
                  <button
                    v-if="record.status === '0'"
                    type="button"
                    class="permission-action permission-action--danger"
                    @click="handleDisable(record)"
                  >
                    禁用
                  </button>
                  <button
                    v-if="record.status === '1'"
                    type="button"
                    class="permission-action permission-action--success"
                    @click="handleEnable(record)"
                  >
                    启用
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getBaseDataList, changeBaseDataStatus } from '@/api/baseData'
import BaseDataModal from './components/BaseDataModal.vue'
import dayjs from 'dayjs'

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
    description: '岗位分类、公司、地区、招聘周期',
    iconClass: 'mdi-briefcase',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    tabs: [
      { key: 'job_category', label: '岗位分类', createLabel: '分类', nameHeader: '分类名称' },
      { key: 'company_name', label: '公司/银行名称', createLabel: '银行', nameHeader: '公司名称' },
      { key: 'company_type', label: '公司/银行类别', createLabel: '类别', nameHeader: '类别名称' },
      { key: 'region', label: '大区', createLabel: '大区', nameHeader: '大区名称' },
      { key: 'city', label: '地区/城市', createLabel: '城市', nameHeader: '城市名称' },
      { key: 'recruit_cycle', label: '招聘周期', createLabel: '周期', nameHeader: '周期名称' }
    ]
  },
  {
    key: 'student',
    label: '学员相关',
    description: '学校、主攻方向、子方向',
    iconClass: 'mdi-account-school',
    iconBg: '#D1FAE5',
    iconColor: '#22C55E',
    tabs: [
      { key: 'school', label: '学校', createLabel: '学校', nameHeader: '学校名称' },
      { key: 'major_direction', label: '主攻方向', createLabel: '方向', nameHeader: '方向名称' },
      { key: 'sub_direction', label: '子方向', createLabel: '子方向', nameHeader: '子方向名称' }
    ]
  },
  {
    key: 'course',
    label: '课程相关',
    description: '课程类型',
    iconClass: 'mdi-book-open-variant',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    tabs: [
      { key: 'course_type', label: '课程类型', createLabel: '课程类型', nameHeader: '课程类型' }
    ]
  },
  {
    key: 'finance',
    label: '财务相关',
    description: '报销类型',
    iconClass: 'mdi-cash-multiple',
    iconBg: '#E0E7FF',
    iconColor: '#8B5CF6',
    tabs: [
      { key: 'expense_type', label: '报销类型', createLabel: '报销类型', nameHeader: '报销类型' }
    ]
  }
] as const

const selectedCategory = ref('job')
const selectedTab = ref('job_category')

const currentTabs = computed(() => {
  const category = categories.find(cat => cat.key === selectedCategory.value)
  return category ? [...category.tabs] : []
})

const currentTabConfig = computed(() => {
  return currentTabs.value.find(tab => tab.key === selectedTab.value) ?? currentTabs.value[0]
})

const currentTabLabel = computed(() => currentTabConfig.value?.label ?? '')
const currentAddLabel = computed(() => currentTabConfig.value?.createLabel ?? currentTabLabel.value)
const currentNameHeader = computed(() => currentTabConfig.value?.nameHeader ?? '名称')

const selectCategory = (key: string) => {
  selectedCategory.value = key
  const category = categories.find(cat => cat.key === key)
  if (category?.tabs.length) {
    selectedTab.value = category.tabs[0].key
  }
}

const selectTab = (key: string) => {
  selectedTab.value = key
}

watch(selectedTab, () => {
  pagination.current = 1
  searchName.value = ''
  loadDataList()
})

const loadDataList = async () => {
  try {
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
  }
}

const handleSearch = () => {
  pagination.current = 1
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
        await changeBaseDataStatus({ id: record.id, status: '1' }, {
          customErrorMessage: '禁用基础数据失败，请重试'
        })
        message.success('已禁用')
        loadDataList()
      } catch (error) {
        // 移除组件内的错误提示，让拦截器处理
      }
    }
  })
}

const handleEnable = async (record: any) => {
  try {
    await changeBaseDataStatus({ id: record.id, status: '0' }, {
      customErrorMessage: '启用基础数据失败，请重试'
    })
    message.success('已启用')
    loadDataList()
  } catch (error) {
    // 移除组件内的错误提示，让拦截器处理
  }
}

onMounted(() => {
  loadDataList()
})
</script>

<style scoped lang="scss">
.base-data-page {
  padding: 8px 4px 0;

  .page-header {
    margin-bottom: 24px;
  }

  .page-title {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    line-height: normal;
    color: #1e293b;
  }

  .page-sub {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: normal;
    color: #64748b;
  }

  .base-data-page__categories {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .category-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px;
    border: none;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
    }

    &--active {
      outline: 2px solid #6366f1;
      outline-offset: 0;
    }
  }

  .category-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
    border-radius: 12px;
    font-size: 24px;
  }

  .category-card__label {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .category-card__desc {
    font-size: 12px;
    color: #6b7280;
    text-align: center;
    line-height: 1.45;
  }

  .base-data-tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    margin-bottom: 16px;
    border-radius: 12px;
    background: #f8fafc;
  }

  .base-data-tabs__tab {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #4b5563;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;

    &--active {
      background: #fff;
      color: #6366f1;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }
  }

  .content-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .content-toolbar__search {
    display: flex;
    gap: 12px;
  }

  .content-toolbar__input {
    width: 200px;

    :deep(.ant-input) {
      min-height: 42px;
      border-color: #d1d5db;
      border-radius: 10px;
      box-shadow: none;
      padding-inline: 14px;
    }
  }

  .permission-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    border: none;

    &--primary {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }

    &--outline {
      color: #64748b;
      background: #fff;
      border: 1px solid #e2e8f0;
    }
  }

  .permission-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
  }

  .permission-card__body--flush {
    padding: 0;
  }

  .permission-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 14px;
      line-height: normal;
      color: #1e293b;
      vertical-align: middle;
    }

    th {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      background: #f8fafc;
      letter-spacing: 0.02em;
    }

    tbody tr:hover {
      background: #f8fafc;
    }
  }

  .permission-pill {
    display: inline-flex;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;

    &--success {
      background: #d1fae5;
      color: #065f46;
    }

    &--danger {
      background: #fee2e2;
      color: #991b1b;
    }
  }

  .permission-actions {
    display: flex;
    gap: 0;
  }

  .permission-action {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #6366f1;
    font-size: 13px;
    cursor: pointer;

    &--danger {
      color: #ef4444;
    }

    &--success {
      color: #22c55e;
    }
  }
}
</style>
