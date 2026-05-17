<template>
  <div id="page-menu" class="osg-page">
    <PageHeader :title-zh="t('admin.permission.menu.pageTitle')" title-en="Menu Management" />

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: 10px; flex-wrap: wrap">
        <a-form-item :label="t('admin.permission.menu.filter.keywordLabel')">
          <a-input v-model:value="searchName" :placeholder="t('admin.permission.menu.filter.keywordPlaceholder')" allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item :label="t('admin.permission.menu.filter.statusLabel')">
          <a-select v-model:value="selectedStatus" :placeholder="t('admin.permission.menu.filter.statusAll')" allow-clear style="width: 100px">
            <a-select-option value="0">{{ t('admin.permission.menu.filter.statusEnabled') }}</a-select-option>
            <a-select-option value="1">{{ t('admin.permission.menu.filter.statusDisabled') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('admin.permission.menu.filter.typeLabel')">
          <a-select v-model:value="selectedMenuType" :placeholder="t('admin.permission.menu.filter.typeAll')" allow-clear style="width: 110px">
            <a-select-option value="M">{{ t('admin.permission.menu.filter.typeDir') }}</a-select-option>
            <a-select-option value="C">{{ t('admin.permission.menu.filter.typeMenu') }}</a-select-option>
            <a-select-option value="F">{{ t('admin.permission.menu.filter.typeButton') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">{{ t('admin.permission.menu.filter.search') }}</a-button>
            <a-button @click="handleReset">{{ t('admin.permission.menu.filter.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" id="menu-tree-card">
      <template #title>
        <span class="menu-tree-card__title">
          <i class="mdi mdi-file-tree" aria-hidden="true"></i>
          {{ t('admin.permission.menu.cardTitle') }}
        </span>
      </template>
      <template #extra>
        <span class="menu-tree-card__subtitle">{{ t('admin.permission.menu.cardSubtitle') }}</span>
      </template>
      <a-table
        id="menu-tree-table"
        :columns="treeColumns"
        :data-source="dataList"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: MenuListItem) => record.menuId"
        :pagination="false"
        :locale="{ emptyText: t('admin.permission.menu.empty') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'menuName'">
            <span class="menu-name-cell">
              <strong>{{ record.i18nKey ? t(`admin.menu.${record.i18nKey}`) : menuLabelTranslate(record.menuName) }}</strong>
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'menuType'">
            <a-tag :color="typeColorMap[record.menuType]">
              {{ resolveTypeLabel(record.menuType) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'orderNum'">
            {{ record.orderNum ?? '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'perms'">
            {{ record.perms || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'component'">
            {{ record.component || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? t('admin.permission.menu.status.enabled') : t('admin.permission.menu.status.disabled') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button
              v-hasPermi="'system:menu:edit'"
              type="link"
              size="small"
              data-surface-trigger="modal-menu-form"
              @click="openMenuForm(record as MenuListItem)"
            >
              {{ t('admin.permission.menu.action.edit') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <MenuFormModal
      v-model:visible="menuFormVisible"
      :record="editingMenu"
      @submit="handleMenuSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  buildMenuTree,
  createAdminMenu,
  getAdminMenuList,
  updateAdminMenu,
  type MenuListItem,
  type MenuMutationPayload,
} from '@osg/shared/api/admin/menu'
import MenuFormModal from './components/MenuFormModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { createMenuLabelTranslate } from '@/utils/menuLabelTranslate'

const i18n = useI18n()
const { t } = i18n
const menuLabelTranslate = createMenuLabelTranslate(i18n)

const menuFormVisible = ref(false)
const dataList = ref<MenuListItem[]>([])
const editingMenu = ref<MenuListItem | null>(null)
const searchName = ref('')
const selectedStatus = ref<string | undefined>(undefined)
const selectedMenuType = ref<string | undefined>(undefined)

const treeColumns = computed(() => [
  { title: t('admin.permission.menu.col.menuName'), dataIndex: 'menuName', key: 'menuName', width: 240, fixed: 'left' as const },
  { title: t('admin.permission.menu.col.menuType'), dataIndex: 'menuType', key: 'menuType', width: 100 },
  { title: t('admin.permission.menu.col.orderNum'), dataIndex: 'orderNum', key: 'orderNum', width: 80 },
  { title: t('admin.permission.menu.col.perms'), dataIndex: 'perms', key: 'perms' },
  { title: t('admin.permission.menu.col.component'), dataIndex: 'component', key: 'component' },
  { title: t('admin.permission.menu.col.status'), dataIndex: 'status', key: 'status', width: 80 },
  { title: t('admin.permission.menu.col.action'), dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
])

const resolveTypeLabel = (menuType: MenuListItem['menuType']) => {
  if (menuType === 'M') return t('admin.permission.menu.filter.typeDir')
  if (menuType === 'F') return t('admin.permission.menu.filter.typeButton')
  return t('admin.permission.menu.filter.typeMenu')
}

const typeColorMap: Record<string, string> = {
  M: 'purple',
  C: 'blue',
  F: 'orange',
}

const loadMenuList = async () => {
  try {
    const flatList = await getAdminMenuList({
      menuName: searchName.value.trim() || undefined,
      status: selectedStatus.value,
      menuType: selectedMenuType.value,
    })
    dataList.value = buildMenuTree(flatList)
  } catch (_error) {
  }
}

const openMenuForm = (record: MenuListItem | null = null) => {
  editingMenu.value = record
  menuFormVisible.value = true
}

const handleSearch = () => {
  loadMenuList()
}

const handleReset = () => {
  searchName.value = ''
  selectedStatus.value = undefined
  selectedMenuType.value = undefined
  loadMenuList()
}

const handleMenuSubmit = async (payload: MenuMutationPayload) => {
  try {
    if (payload.menuId) {
      await updateAdminMenu(payload)
    } else {
      await createAdminMenu(payload)
    }
    message.success(t('admin.permission.menu.msg.saveSuccess'))
    menuFormVisible.value = false
    editingMenu.value = null
    await loadMenuList()
  } catch (_error) {
  }
}

onMounted(() => {
  loadMenuList()
})
</script>

<style scoped>
.menu-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  vertical-align: middle;
}
.menu-name-cell .mdi {
  color: var(--primary);
  font-size: 18px;
  line-height: 1;
}
.menu-tree-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.menu-tree-card__title .mdi {
  color: var(--primary);
  font-size: 20px;
  line-height: 1;
}
.menu-tree-card__subtitle {
  font-size: 12px;
  color: var(--muted);
}
:deep(td.ant-table-cell:first-child) {
  white-space: nowrap;
}
:deep(.ant-table-row-expand-icon) {
  float: none !important;
  display: inline-flex !important;
  vertical-align: middle;
  margin-right: 8px;
  flex-shrink: 0;
}
:deep(.ant-table-row-indent) {
  float: none !important;
  display: inline-block !important;
  vertical-align: middle;
}
</style>
