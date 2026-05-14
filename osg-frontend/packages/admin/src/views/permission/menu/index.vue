<template>
  <div id="page-menu" class="osg-page">
    <PageHeader :title-zh="$t('menu_management')" title-en="Menu Management" :description="$t('manage_system_menu_structure_including_d')">
      <template #actions>
        <a-button>
          <template #icon><i class="mdi mdi-unfold-more-horizontal" aria-hidden="true"></i></template>
          {{ $t('expand_all') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: 10px; flex-wrap: wrap">
        <a-form-item :label="$t('keyword')">
          <a-input v-model:value="searchName" :placeholder="$t('menu_name_permission_key')" allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item :label="$t('status')">
          <a-select v-model:value="selectedStatus" :placeholder="$t('all')" allow-clear style="width: 100px">
            <a-select-option value="0">{{ $t('enable') }}</a-select-option>
            <a-select-option value="1">{{ $t('deactivate') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('type')">
          <a-select v-model:value="selectedMenuType" :placeholder="$t('all')" allow-clear style="width: 110px">
            <a-select-option value="M">{{ $t('directory') }} M</a-select-option>
            <a-select-option value="C">{{ $t('menu') }} C</a-select-option>
            <a-select-option value="F">{{ $t('button') }} F</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">{{ $t('search') }}</a-button>
            <a-button @click="handleReset">{{ $t('reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" id="menu-tree-card">
      <template #title>
        <span class="menu-tree-card__title">
          <i class="mdi mdi-file-tree" aria-hidden="true"></i>
          {{ $t('menu_tree_button_permissions') }}
        </span>
      </template>
      <template #extra>
        <span class="menu-tree-card__subtitle">{{ $t('three_level_structure_directory_menu_but') }}</span>
      </template>
      <a-table
        id="menu-tree-table"
        :columns="treeColumns"
        :data-source="dataList"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: MenuListItem) => record.menuId"
        :pagination="false"
        :locale="{ emptyText: $t('no_menu_data_available') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'menuName'">
            <span class="menu-name-cell">
              <strong>{{ resolveMenuName(record as MenuListItem) }}</strong>
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
              {{ record.status === '0' ? $t('enable') : $t('deactivate') }}
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
              {{ $t('edit') }}
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
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  buildMenuTree,
  createAdminMenu,
  getAdminMenuList,
  updateAdminMenu,
  type MenuListItem,
  type MenuMutationPayload,
} from '@osg/shared/api/admin/menu'
import { resolveMenuDisplayName } from '@osg/shared/utils'
import MenuFormModal from './components/MenuFormModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const menuFormVisible = ref(false)
const dataList = ref<MenuListItem[]>([])
const editingMenu = ref<MenuListItem | null>(null)
const searchName = ref('')
const selectedStatus = ref<string | undefined>(undefined)
const selectedMenuType = ref<string | undefined>(undefined)

const treeColumns = [
  { title: t('menu_name'), dataIndex: 'menuName', key: 'menuName', width: 240 },
  { title: t('type'), dataIndex: 'menuType', key: 'menuType', width: 100 },
  { title: t('sort_order'), dataIndex: 'orderNum', key: 'orderNum', width: 80 },
  { title: t('permission_key'), dataIndex: 'perms', key: 'perms' },
  { title: t('component_path'), dataIndex: 'component', key: 'component' },
  { title: t('status'), dataIndex: 'status', key: 'status', width: 80 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 160 },
]

const resolveTypeLabel = (menuType: MenuListItem['menuType']) => {
  if (menuType === 'M') return `${t('directory')} M`
  if (menuType === 'F') return `${t('button')} F`
  return `${t('menu')} C`
}

const resolveMenuName = (menu: MenuListItem) => resolveMenuDisplayName(menu, t)

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
    message.error(t('failed_to_load_menu_list'))
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
    message.success(t('menu_saved'))
    menuFormVisible.value = false
    editingMenu.value = null
    await loadMenuList()
  } catch (_error) {
    message.error(t('failed_to_save_menu'))
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
