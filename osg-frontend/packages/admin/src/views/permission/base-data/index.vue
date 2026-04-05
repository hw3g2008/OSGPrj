<template>
  <div class="base-data-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">字典管理</h2>
        <p class="page-sub subtitle">管理系统基础配置字典数据</p>
      </div>
    </div>

    <div class="base-data-page__categories category-cards">
      <button
        v-for="cat in categories"
        :key="cat.key"
        type="button"
        :aria-label="cat.label"
        :data-field-name="cat.label"
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
        :aria-label="tab.label"
        :data-field-name="tab.label"
        :data-surface-trigger="tab.key"
        :data-surface-active="selectedTab === tab.key"
        :class="['base-data-tabs__tab', { 'base-data-tabs__tab--active': selectedTab === tab.key }]"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="content-toolbar" data-field-name="基础数据页筛选区">
      <div class="content-toolbar__search">
        <a-input
          v-model:value="searchName"
          class="content-toolbar__input"
          :data-field-name="`${currentTabLabel}搜索`"
          :placeholder="`搜索${currentTabLabel}...`"
          allow-clear
          @pressEnter="handleSearch"
        />
        <button type="button" class="permission-button permission-button--outline" @click="handleSearch">
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <span>搜索</span>
        </button>
      </div>
      <button
        type="button"
        class="permission-button permission-button--primary"
        :data-surface-trigger="currentAddSurfaceId"
        :aria-label="`新增${currentAddLabel}`"
        @click="handleAdd"
      >
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
              <th>键值</th>
              <th>状态</th>
              <th>排序</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in dataList" :key="record.dictCode">
              <td>{{ record.dictCode }}</td>
              <td><strong>{{ record.dictLabel }}</strong></td>
              <td>{{ record.dictValue }}</td>
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
              <td>{{ record.dictSort }}</td>
              <td>{{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}</td>
              <td>
                <div class="permission-actions">
                  <button
                    type="button"
                    class="permission-action"
                    aria-label="编辑"
                    title="编辑"
                    :data-surface-trigger="currentEditSurfaceId"
                    :data-surface-sample-key="record.dictLabel"
                    @click="handleEdit(record)"
                  >
                    编辑
                  </button>
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
      :category="selectedCategory"
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
import {
  getAdminDictRegistry,
  getAdminDictList,
  updateAdminDictItem,
  type AdminDictListRow,
  type AdminDictRegistryGroup,
} from '@/api/adminDict'
import BaseDataModal from './components/BaseDataModal.vue'
import dayjs from 'dayjs'

const dataList = ref<AdminDictListRow[]>([])
const modalVisible = ref(false)
const currentRecord = ref<AdminDictListRow | null>(null)
const searchName = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const registryGroups = ref<AdminDictRegistryGroup[]>([])

const tabPresentationMap: Record<string, { createLabel: string; nameHeader: string }> = {
  osg_job_category: { createLabel: '岗位分类', nameHeader: '分类名称' },
  osg_company_name: { createLabel: '公司/银行名称', nameHeader: '公司名称' },
  osg_company_type: { createLabel: '公司/银行类别', nameHeader: '类别名称' },
  osg_region: { createLabel: '大区', nameHeader: '大区名称' },
  osg_city: { createLabel: '地区/城市', nameHeader: '城市名称' },
  osg_recruit_cycle: { createLabel: '招聘周期', nameHeader: '周期名称' },
  osg_school: { createLabel: '学校', nameHeader: '学校名称' },
  osg_major_direction: { createLabel: '方向', nameHeader: '方向名称' },
  osg_sub_direction: { createLabel: '子方向', nameHeader: '子方向名称' },
  osg_course_type: { createLabel: '课程类型', nameHeader: '课程类型' },
  osg_expense_type: { createLabel: '报销类型', nameHeader: '报销类型' },
}

const categories = computed(() => {
  return registryGroups.value
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(group => ({
      key: group.group_key,
      label: group.group_label,
      description: group.dict_types.map(item => item.dict_name).join('、'),
      iconClass: group.icon,
      iconBg: group.icon_bg,
      iconColor: group.icon_color,
      tabs: group.dict_types.map(item => {
        const presentation = tabPresentationMap[item.dict_type] ?? {
          createLabel: item.dict_name,
          nameHeader: `${item.dict_name}名称`,
        }
        return {
          key: item.dict_type,
          label: item.dict_name,
          createLabel: presentation.createLabel,
          nameHeader: presentation.nameHeader,
          hasParent: item.has_parent,
          parentTab: item.parent_dict_type,
        }
      }),
    }))
})

const selectedCategory = ref('')
const selectedTab = ref('')

const currentTabs = computed(() => {
  const category = categories.value.find(cat => cat.key === selectedCategory.value)
  return category ? [...category.tabs] : []
})

const currentTabConfig = computed(() => {
  return currentTabs.value.find(tab => tab.key === selectedTab.value) ?? currentTabs.value[0]
})

const currentTabLabel = computed(() => currentTabConfig.value?.label ?? '')
const currentAddLabel = computed(() => currentTabConfig.value?.createLabel ?? currentTabLabel.value)
const currentNameHeader = computed(() => currentTabConfig.value?.nameHeader ?? '名称')
const surfaceIdMap: Record<string, { create: string; edit: string }> = {
  osg_recruit_cycle: { create: 'modal-new-program', edit: 'modal-edit-program' },
  osg_major_direction: { create: 'modal-new-direction', edit: 'modal-edit-direction' },
  osg_sub_direction: { create: 'modal-new-sub-direction', edit: 'modal-edit-sub-direction' },
}

const resolveSurfaceId = (tab: string, mode: 'create' | 'edit') => {
  const mapped = surfaceIdMap[tab]
  if (mapped) return mapped[mode]
  const normalizedTab = tab.replace(/_/g, '-')
  return mode === 'create' ? `modal-new-${normalizedTab}` : `modal-edit-${normalizedTab}`
}

const currentAddSurfaceId = computed(() => resolveSurfaceId(selectedTab.value, 'create'))
const currentEditSurfaceId = computed(() => resolveSurfaceId(selectedTab.value, 'edit'))

const selectCategory = (key: string) => {
  selectedCategory.value = key
  const category = categories.value.find(cat => cat.key === key)
  if (category?.tabs.length) {
    selectedTab.value = category.tabs[0].key
  }
}

const selectTab = (key: string) => {
  selectedTab.value = key
}

watch(selectedTab, () => {
  if (!selectedTab.value) return
  pagination.current = 1
  searchName.value = ''
  loadDataList()
})

const loadRegistry = async () => {
  try {
    const groups = await getAdminDictRegistry()
    registryGroups.value = groups || []
    const firstGroup = categories.value[0]
    if (firstGroup) {
      selectedCategory.value = firstGroup.key
      selectedTab.value = firstGroup.tabs[0]?.key ?? ''
    }
  } catch (error) {
    registryGroups.value = []
    message.error('加载字典分类失败')
  }
}

const loadDataList = async () => {
  if (!selectedTab.value) return
  try {
    const res = await getAdminDictList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      dictType: selectedTab.value,
      dictLabel: searchName.value || undefined,
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

const handleEdit = (record: AdminDictListRow) => {
  currentRecord.value = record
  modalVisible.value = true
}

const handleDisable = (record: AdminDictListRow) => {
  Modal.confirm({
    title: '确认禁用',
    content: `确定要禁用「${record.dictLabel}」吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await updateAdminDictItem({
          dictCode: record.dictCode,
          dictType: record.dictType,
          dictLabel: record.dictLabel,
          dictValue: record.dictValue,
          dictSort: record.dictSort,
          status: '1',
          remark: record.remark,
        }, {
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

const handleEnable = async (record: AdminDictListRow) => {
  try {
    await updateAdminDictItem({
      dictCode: record.dictCode,
      dictType: record.dictType,
      dictLabel: record.dictLabel,
      dictValue: record.dictValue,
      dictSort: record.dictSort,
      status: '0',
      remark: record.remark,
    }, {
      customErrorMessage: '启用基础数据失败，请重试'
    })
    message.success('已启用')
    loadDataList()
  } catch (error) {
    // 移除组件内的错误提示，让拦截器处理
  }
}

onMounted(() => {
  void loadRegistry()
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
