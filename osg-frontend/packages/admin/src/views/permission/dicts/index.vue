<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.permission.dicts.pageTitle')" />

    <div class="category-cards">
      <a-button
        v-for="cat in categories"
        :key="cat.key"
        :aria-label="cat.label"
        :data-field-name="cat.label"
        :class="['category-card', { 'category-card--active': selectedCategory === cat.key }]"
        @click="selectCategory(cat.key)"
      >
        <span class="category-card__icon" :style="{ background: cat.iconBg }">
          <i class="mdi" :class="cat.iconClass" :style="{ color: cat.iconColor }" aria-hidden="true"></i>
        </span>
        <span class="category-card__label">{{ cat.label }}</span>
      </a-button>
    </div>

    <div class="base-data-tabs">
      <a-button
        v-for="tab in currentTabs"
        :key="tab.key"
        :aria-label="tab.label"
        :data-field-name="tab.label"
        :data-surface-trigger="tab.key"
        :data-surface-active="selectedTab === tab.key"
        :type="selectedTab === tab.key ? 'primary' : 'text'"
        :ghost="selectedTab === tab.key"
        size="small"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </a-button>
    </div>

    <div class="content-toolbar" data-field-name="基础数据页筛选区"><!-- i18n-skip-line: playwright selector -->
      <div class="content-toolbar__search">
        <a-input
          v-model:value="searchName"
          style="width: 200px"
          :placeholder="t('admin.permission.dicts.searchPlaceholder', { label: currentTabLabel })"
          allow-clear
          @pressEnter="handleSearch"
          :data-field-name="`${currentTabLabel}搜索`"/><!-- i18n-skip-line: playwright selector -->
        <a-button @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.permission.dicts.search') }}
        </a-button>
      </div>
      <a-button
        type="primary"
        :data-surface-trigger="currentAddSurfaceId"
        @click="handleAdd"
        :aria-label="`新增${currentAddLabel}`"><!-- i18n-skip-line: a11y dynamic label -->
        <template #icon><PlusOutlined /></template>
        {{ t('admin.permission.dicts.addButton', { label: currentAddLabel }) }}
      </a-button>
    </div>

    <a-card :bordered="false">
      <a-table
        :columns="dictColumns"
        :data-source="dataList"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: AdminDictListRow) => record.dictCode"
        :pagination="tablePagination"
        :locale="{ emptyText: t('admin.permission.dicts.empty') }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'dictLabel'">
            <strong>{{ record.dictLabel }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? t('admin.permission.dicts.status.enabled') : t('admin.permission.dicts.status.disabled') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'parentLabel'">
            <a-tag v-if="record.parentValue" :color="parentTagColor(record.parentValue)">
              {{ parentOptionsMap[record.parentValue] || record.parentValue }}
            </a-tag>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'callingCode'">
            <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 600">
              {{ record.extra?.callingCode || '-' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'country'">
            <a-tag v-if="record.extra?.country && regionLabelMap[record.extra.country]" color="blue">
              {{ regionLabelMap[record.extra.country] }}
            </a-tag>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'website'">
            <a
              v-if="record.extra?.website"
              :href="record.extra.website.startsWith('http') ? record.extra.website : 'https://' + record.extra.website"
              target="_blank"
              style="color: var(--primary); font-size: 12px"
            >
              {{ record.extra.website.replace(/^https?:\/\//, '') }}
              <i class="mdi mdi-open-in-new" style="font-size: 10px" />
            </a>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'updateTime'">
            {{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button
              type="link"
              size="small"
              :data-surface-trigger="currentEditSurfaceId"
              :data-surface-sample-key="record.dictLabel"
              @click="handleEdit(record)"
            >
              {{ t('admin.permission.dicts.actionEdit') }}
            </a-button>
            <a-button
              v-if="record.status === '0'"
              type="link"
              size="small"
              danger
              @click="handleDisable(record)"
            >
              {{ t('admin.permission.dicts.actionDisable') }}
            </a-button>
            <a-button
              v-if="record.status === '1'"
              type="link"
              size="small"
              @click="handleEnable(record)"
            >
              {{ t('admin.permission.dicts.actionEnable') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

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
import { useI18n } from 'vue-i18n'
import {
  getAdminDictRegistry,
  getAdminDictList,
  getAdminDictOptions,
  updateAdminDictItem,
  type AdminDictListRow,
  type AdminDictRegistryGroup,
} from '@/api/adminDict'
import BaseDataModal from './components/BaseDataModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const { t, te } = useI18n()

const dataList = ref<AdminDictListRow[]>([])
const modalVisible = ref(false)
const currentRecord = ref<AdminDictListRow | null>(null)
const searchName = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const tablePagination = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  simple: false,
  showSizeChanger: false,
  showTotal: (total: number) => t('admin.permission.dicts.totalRecords', { total }),
}))

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void loadDataList()
}

const registryGroups = ref<AdminDictRegistryGroup[]>([])

const getTabPresentation = (dictType: string, dictName: string): { createLabel: string; nameHeader: string } => {
  const createKey = `admin.permission.dicts.tabCreateLabel.${dictType}`
  const nameKey = `admin.permission.dicts.tabNameHeader.${dictType}`
  return {
    createLabel: te(createKey) ? t(createKey as never) : dictName,
    nameHeader: te(nameKey) ? t(nameKey as never) : t('admin.permission.dicts.nameHeaderFallback', { label: dictName }),
  }
}

const categories = computed(() => {
  return registryGroups.value
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(group => ({
      key: group.group_key,
      label: group.group_label,
      iconClass: group.icon,
      iconBg: group.icon_bg,
      iconColor: group.icon_color,
      tabs: group.dict_types.map(item => {
        const presentation = getTabPresentation(item.dict_type, item.dict_name)
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

const parentOptionsMap = ref<Record<string, string>>({})
const regionLabelMap = ref<Record<string, string>>({})

const parentTagColor = (value: string): string => {
  const colorMap: Record<string, string> = {
    bulge_bracket: 'blue',
    elite_boutique: 'purple',
    middle_market: 'geekblue',
    buyside: 'orange',
    consulting: 'green',
    swe_pm: 'cyan',
    other_company: 'default',
  }
  return colorMap[value] ?? 'default'
}

const loadParentOptions = async () => {
  const cfg = currentTabConfig.value
  if (cfg?.hasParent && cfg.parentTab) {
    try {
      const options = await getAdminDictOptions(cfg.parentTab)
      const map: Record<string, string> = {}
      for (const opt of options) {
        map[opt.dictValue] = opt.dictLabel
      }
      parentOptionsMap.value = map
    } catch {
      parentOptionsMap.value = {}
    }
  } else {
    parentOptionsMap.value = {}
  }
}

const loadRegionLabelMap = async () => {
  if (selectedTab.value !== 'osg_school') {
    regionLabelMap.value = {}
    return
  }
  try {
    const options = await getAdminDictOptions('osg_region')
    const map: Record<string, string> = {}
    for (const opt of options) {
      if (opt.status === '0') map[opt.dictValue] = opt.dictLabel
    }
    regionLabelMap.value = map
  } catch {
    regionLabelMap.value = {}
  }
}

const dictColumns = computed(() => {
  type DictTableColumn = {
    title: string
    dataIndex: string
    key: string
    width?: number
    fixed?: 'left' | 'right'
  }
  const base: DictTableColumn[] = [
    { title: 'ID', dataIndex: 'dictCode', key: 'dictCode', width: 80, fixed: 'left' },
    { title: currentNameHeader.value, dataIndex: 'dictLabel', key: 'dictLabel' },
  ]
  if (selectedTab.value === 'osg_company_name') {
    base.push({ title: t('admin.permission.dicts.columns.companyType'), dataIndex: 'parentLabel', key: 'parentLabel', width: 150 })
    base.push({ title: t('admin.permission.dicts.columns.website'), dataIndex: 'website', key: 'website', width: 220 })
  } else if (selectedTab.value === 'osg_country_code') {
    base.push({ title: t('admin.permission.dicts.columns.dictValue'), dataIndex: 'dictValue', key: 'dictValue', width: 100 })
    base.push({ title: t('admin.permission.dicts.columns.callingCode'), dataIndex: 'callingCode', key: 'callingCode', width: 120 })
  } else if (selectedTab.value === 'osg_school') {
    base.push({ title: t('admin.permission.dicts.columns.dictValue'), dataIndex: 'dictValue', key: 'dictValue' })
    base.push({ title: t('admin.permission.dicts.columns.country'), dataIndex: 'country', key: 'country', width: 140 })
  } else {
    base.push({ title: t('admin.permission.dicts.columns.dictValue'), dataIndex: 'dictValue', key: 'dictValue' })
  }
  base.push(
    { title: t('admin.permission.dicts.columns.status'), dataIndex: 'status', key: 'status', width: 80 },
    { title: t('admin.permission.dicts.columns.sort'), dataIndex: 'dictSort', key: 'dictSort', width: 80 },
    { title: t('admin.permission.dicts.columns.updateTime'), dataIndex: 'updateTime', key: 'updateTime' },
    { title: t('admin.permission.dicts.columns.action'), dataIndex: 'action', key: 'action', width: 180, fixed: 'right' },
  )
  return base
})

const currentTabs = computed(() => {
  const category = categories.value.find(cat => cat.key === selectedCategory.value)
  return category ? [...category.tabs] : []
})

const currentTabConfig = computed(() => {
  return currentTabs.value.find(tab => tab.key === selectedTab.value) ?? currentTabs.value[0]
})

const currentTabLabel = computed(() => currentTabConfig.value?.label ?? '')
const currentAddLabel = computed(() => currentTabConfig.value?.createLabel ?? currentTabLabel.value)
const currentNameHeader = computed(() => currentTabConfig.value?.nameHeader ?? t('admin.permission.dicts.columns.defaultName'))
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
  void loadParentOptions()
  void loadRegionLabelMap()
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
    message.error(t('admin.permission.dicts.messages.loadCategoryError'))
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
    message.error(t('admin.permission.dicts.messages.loadDataError'))
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
    title: t('admin.permission.dicts.messages.disableConfirmTitle'),
    content: t('admin.permission.dicts.messages.disableConfirmContent', { label: record.dictLabel }),
    okText: t('admin.permission.dicts.messages.confirmOk'),
    cancelText: t('admin.permission.dicts.messages.confirmCancel'),
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
          customErrorMessage: t('admin.permission.dicts.messages.disableError')
        })
        message.success(t('admin.permission.dicts.messages.disabledSuccess'))
        loadDataList()
      } catch (error) {
        // i18n-skip-line: dev comment — 移除组件内的错误提示，让拦截器处理
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
      customErrorMessage: t('admin.permission.dicts.messages.enableError')
    })
    message.success(t('admin.permission.dicts.messages.enabledSuccess'))
    loadDataList()
  } catch (error) {
    // i18n-skip-line: dev comment — 移除组件内的错误提示，让拦截器处理
  }
}

onMounted(() => {
  void loadRegistry()
})
</script>

<style scoped lang="scss">
.category-cards {
  display: grid;
  /* Force all category cards into one row with equal width; adapts as group count changes */
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 16px;
}

.category-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: auto;
  padding: 10px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &--active {
    outline: 2px solid var(--primary);
    outline-offset: 0;
  }
}

.category-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}

.category-card__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.base-data-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--bg);
}

.content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.content-toolbar__search {
  display: flex;
  gap: 12px;
}
</style>
