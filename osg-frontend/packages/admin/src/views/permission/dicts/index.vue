<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('dictionary_management')" :description="$t('manage_system_base_configuration_diction')" />

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
        <span class="category-card__desc">{{ cat.description }}</span>
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

    <div class="content-toolbar" :data-field-name="$t('base_data_filter_panel')">
      <div class="content-toolbar__search">
        <a-input
          v-model:value="searchName"
          style="width: 200px"
          :data-field-name="$t('field_search_name', { field: currentTabLabel })"
          :placeholder="$t('search_field_placeholder', { field: currentTabLabel })"
          allow-clear
          @pressEnter="handleSearch"
        />
        <a-button @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ $t('search') }}
        </a-button>
      </div>
      <a-button
        type="primary"
        :data-surface-trigger="currentAddSurfaceId"
        :aria-label="$t('add_field_aria', { field: currentAddLabel })"
        @click="handleAdd"
      >
        <template #icon><PlusOutlined /></template>
        {{ $t('add') }}{{ currentAddLabel }}
      </a-button>
    </div>

    <a-card :bordered="false">
      <a-table
        :columns="dictColumns"
        :data-source="dataList"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: AdminDictListRow) => record.dictCode"
        :pagination="tablePagination"
        :locale="{ emptyText: $t('no_data_available') }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'dictLabel'">
            <strong>{{ resolveDictDisplayName({ label: record.dictLabel, i18nKey: record.i18nKey }, t) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? $t('enable') : $t('disable') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'parentLabel'">
            <a-tag v-if="record.parentValue" :color="parentTagColor(record.parentValue)">
              {{ parentOptionsMap[record.parentValue] || record.parentValue }}
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
              {{ $t('edit') }}
            </a-button>
            <a-button
              v-if="record.status === '0'"
              type="link"
              size="small"
              danger
              @click="handleDisable(record)"
            >
              {{ $t('disable') }}
            </a-button>
            <a-button
              v-if="record.status === '1'"
              type="link"
              size="small"
              @click="handleEnable(record)"
            >
              {{ $t('enable') }}
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
import { resolveDictDisplayName } from '@osg/shared/utils/dictI18n'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
  showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`,
}))

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void loadDataList()
}

const registryGroups = ref<AdminDictRegistryGroup[]>([])

const tabPresentationMap: Record<string, { createLabel: string; nameHeader: string }> = {
  osg_job_category: { createLabel: t('job_classification'), nameHeader: t('category_name') },
  osg_company_name: { createLabel: t('company_bank_name'), nameHeader: t('company_name') },
  osg_company_type: { createLabel: t('company_bank_type'), nameHeader: t('type_name') },
  osg_position_department: { createLabel: t('department'), nameHeader: t('department_name') },
  osg_region: { createLabel: t('region'), nameHeader: t('region_name') },
  osg_city: { createLabel: t('region_city_2'), nameHeader: t('city_name') },
  osg_recruit_cycle: { createLabel: t('recruitment_cycle'), nameHeader: t('cycle_name') },
  osg_school: { createLabel: t('school'), nameHeader: t('school_name') },
  osg_major_direction: { createLabel: t('focus'), nameHeader: t('focus_name') },
  osg_sub_direction: { createLabel: t('sub_focus'), nameHeader: t('sub_focus_name') },
  osg_visa_status: { createLabel: t('visa_status'), nameHeader: t('visa_status') },
  osg_course_type: { createLabel: t('course_type'), nameHeader: t('course_type') },
  osg_expense_type: { createLabel: t('expense_type'), nameHeader: t('expense_type') },
  osg_specialty: { createLabel: t('expertise'), nameHeader: t('expertise_name') },
  osg_rating: { createLabel: t('rating'), nameHeader: t('rating_name') },
}

const categoryDescMap: Record<string, string> = {
  job: t('position_category_company_department_reg'),
  student: t('school_major_focus_sub_focus_visa_status'),
  course: t('course_type'),
  finance: t('expense_type'),
}

const categories = computed(() => {
  return registryGroups.value
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(group => {
      const resolvedGroupLabel = resolveDictDisplayName(
        { label: group.group_label, i18nKey: group.group_i18n_key },
        t,
      )
      return {
        key: group.group_key,
        label: resolvedGroupLabel,
        description:
          categoryDescMap[group.group_key] ??
          group.dict_types
            .map(item => resolveDictDisplayName({ label: item.dict_name, i18nKey: item.dict_name_i18n_key }, t))
            .join('、'),
        iconClass: group.icon,
        iconBg: group.icon_bg,
        iconColor: group.icon_color,
        tabs: group.dict_types.map(item => {
          const resolvedTabLabel = resolveDictDisplayName(
            { label: item.dict_name, i18nKey: item.dict_name_i18n_key },
            t,
          )
          const presentation = tabPresentationMap[item.dict_type] ?? {
            createLabel: resolvedTabLabel,
            nameHeader: t('field_name_header', { field: resolvedTabLabel }),
          }
          return {
            key: item.dict_type,
            label: resolvedTabLabel,
            createLabel: presentation.createLabel,
            nameHeader: presentation.nameHeader,
            hasParent: item.has_parent,
            parentTab: item.parent_dict_type,
          }
        }),
      }
    })
})

const selectedCategory = ref('')
const selectedTab = ref('')

const parentOptionsMap = ref<Record<string, string>>({})

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
        map[opt.dictValue] = resolveDictDisplayName({ label: opt.dictLabel, i18nKey: opt.i18nKey }, t)
      }
      parentOptionsMap.value = map
    } catch {
      parentOptionsMap.value = {}
    }
  } else {
    parentOptionsMap.value = {}
  }
}

const dictColumns = computed(() => {
  const base = [
    { title: 'ID', dataIndex: 'dictCode', key: 'dictCode', width: 80 },
    { title: currentNameHeader.value, dataIndex: 'dictLabel', key: 'dictLabel' },
  ]
  if (selectedTab.value === 'osg_company_name') {
    base.push({ title: t('company_type'), dataIndex: 'parentLabel', key: 'parentLabel', width: 150 })
    base.push({ title: t('website_url'), dataIndex: 'website', key: 'website', width: 220 })
  } else {
    base.push({ title: t('key'), dataIndex: 'dictValue', key: 'dictValue' })
  }
  base.push(
    { title: t('status'), dataIndex: 'status', key: 'status', width: 80 },
    { title: t('sort_order'), dataIndex: 'dictSort', key: 'dictSort', width: 80 },
    { title: t('updated_at'), dataIndex: 'updateTime', key: 'updateTime' },
    { title: t('operation'), dataIndex: 'action', key: 'action', width: 180 },
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
const currentNameHeader = computed(() => currentTabConfig.value?.nameHeader ?? t('name_2'))
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
    message.error(t('failed_to_load_dictionary_categories'))
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
    message.error(t('failed_to_load_data'))
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
    title: t('confirm_disable'),
    content: t('confirm_disable_dict_item', {
      name: resolveDictDisplayName({ label: record.dictLabel, i18nKey: record.i18nKey }, t),
    }),
    okText: t('ok'),
    cancelText: t('cancel'),
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
          customErrorMessage: t('failed_to_disable_data_please_try_again')
        })
        message.success(t('disabled'))
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
      customErrorMessage: t('failed_to_enable_data_please_try_again')
    })
    message.success(t('enabled'))
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
.category-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: auto;
  padding: 16px;
  border-radius: 16px;
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
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  border-radius: 12px;
  font-size: 24px;
}

.category-card__label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.category-card__desc {
  font-size: 12px;
  color: var(--text2);
  text-align: center;
  line-height: 1.45;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
