<template>
  <div id="page-menu" class="osg-page">
    <PageHeader title-zh="菜单管理" title-en="Menu Management" />

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: 10px; flex-wrap: wrap">
        <a-form-item label="关键词">
          <a-input v-model:value="searchName" placeholder="菜单名称 / 权限标识" allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="selectedStatus" placeholder="全部" allow-clear style="width: 100px">
            <a-select-option value="0">启用</a-select-option>
            <a-select-option value="1">停用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model:value="selectedMenuType" placeholder="全部" allow-clear style="width: 110px">
            <a-select-option value="M">目录 M</a-select-option>
            <a-select-option value="C">菜单 C</a-select-option>
            <a-select-option value="F">按钮 F</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">搜索</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" id="menu-tree-card">
      <template #title>
        <span class="menu-tree-card__title">
          <i class="mdi mdi-file-tree" aria-hidden="true"></i>
          菜单树与按钮权限
        </span>
      </template>
      <template #extra>
        <span class="menu-tree-card__subtitle">目录、菜单、按钮三层结构</span>
      </template>
      <a-table
        id="menu-tree-table"
        :columns="treeColumns"
        :data-source="dataList"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: MenuListItem) => record.menuId"
        :pagination="false"
        :locale="{ emptyText: '暂无菜单数据' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'menuName'">
            <span class="menu-name-cell">
              <strong>{{ record.menuName }}</strong>
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
              {{ record.status === '0' ? '启用' : '停用' }}
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
              编辑
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
import MenuFormModal from './components/MenuFormModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'

const menuFormVisible = ref(false)
const dataList = ref<MenuListItem[]>([])
const editingMenu = ref<MenuListItem | null>(null)
const searchName = ref('')
const selectedStatus = ref<string | undefined>(undefined)
const selectedMenuType = ref<string | undefined>(undefined)

const treeColumns = [
  { title: '菜单名称', dataIndex: 'menuName', key: 'menuName', width: 240 },
  { title: '类型', dataIndex: 'menuType', key: 'menuType', width: 100 },
  { title: '排序', dataIndex: 'orderNum', key: 'orderNum', width: 80 },
  { title: '权限标识', dataIndex: 'perms', key: 'perms' },
  { title: '组件路径', dataIndex: 'component', key: 'component' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 160 },
]

const resolveTypeLabel = (menuType: MenuListItem['menuType']) => {
  if (menuType === 'M') return '目录 M'
  if (menuType === 'F') return '按钮 F'
  return '菜单 C'
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
    message.error('加载菜单列表失败')
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
    message.success('菜单已保存')
    menuFormVisible.value = false
    editingMenu.value = null
    await loadMenuList()
  } catch (_error) {
    message.error('保存菜单失败')
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
