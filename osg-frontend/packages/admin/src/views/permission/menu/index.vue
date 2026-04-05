<template>
  <div id="page-menu" class="menu-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">菜单管理 <span class="page-title-en">Menu Management</span></h1>
        <p class="page-sub">维护 `sys_menu` 菜单树、路由路径、组件路径与按钮级权限 Key</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-outline">
          <i class="mdi mdi-unfold-more-horizontal" aria-hidden="true"></i>
          <span>展开全部</span>
        </button>
        <button
          v-hasPermi="'system:menu:add'"
          type="button"
          class="btn btn-primary"
          data-surface-trigger="modal-menu-form"
          @click="openMenuForm"
        >
          <i class="mdi mdi-plus" aria-hidden="true"></i>
          <span>新增菜单</span>
        </button>
      </div>
    </div>

    <section class="card toolbar-card">
      <div class="card-body toolbar-card__body">
        <input
          v-model="searchName"
          class="form-input search-input"
          placeholder="搜索菜单名称 / 权限标识"
          @keyup.enter="handleSearch"
        />
        <select v-model="selectedStatus" class="form-select filter-select">
          <option>全部状态</option>
          <option>启用</option>
          <option>停用</option>
        </select>
        <select v-model="selectedMenuType" class="form-select filter-select">
          <option>全部类型</option>
          <option>目录 M</option>
          <option>菜单 C</option>
          <option>按钮 F</option>
        </select>
        <button type="button" class="btn btn-outline" @click="handleSearch">
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <span>搜索</span>
        </button>
        <div class="runtime-pill">运行时侧边栏真源：`sys_menu` / 当前用户菜单：`/getRouters`</div>
      </div>
    </section>

    <section class="card menu-tree-card" id="menu-tree-card">
      <div class="card-header">
        <h2 class="card-title">
          <i class="mdi mdi-file-tree" aria-hidden="true"></i>
          <span>菜单树与按钮权限</span>
        </h2>
        <span class="card-subtitle">目录、菜单、按钮三层结构</span>
      </div>
      <div class="card-body card-body--flush">
        <table class="table" id="menu-tree-table">
          <thead>
            <tr>
              <th>菜单名称</th>
              <th>类型</th>
              <th>排序</th>
              <th>权限标识</th>
              <th>组件路径</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dataList" :key="item.menuId">
              <td>
                <div class="menu-name-cell">
                  <i class="mdi" :class="resolveIconClass(item)" aria-hidden="true"></i>
                  <strong>{{ item.menuName }}</strong>
                </div>
              </td>
              <td><span :class="['tag', resolveTypeTagClass(item.menuType)]">{{ resolveTypeLabel(item.menuType) }}</span></td>
              <td>{{ item.orderNum ?? '--' }}</td>
              <td>{{ item.perms || '--' }}</td>
              <td>{{ item.component || '--' }}</td>
              <td><span :class="['tag', item.status === '0' ? 'tag-success' : 'tag-danger']">{{ item.status === '0' ? '启用' : '停用' }}</span></td>
              <td>
                <div class="action-row">
                  <button
                    v-hasPermi="'system:menu:add'"
                    type="button"
                    class="btn btn-text btn-sm"
                    data-surface-trigger="modal-menu-form"
                    @click="openMenuForm"
                  >
                    新增下级
                  </button>
                  <button
                    v-hasPermi="'system:menu:edit'"
                    type="button"
                    class="btn btn-text btn-sm"
                    data-surface-trigger="modal-menu-form"
                    @click="openMenuForm"
                  >
                    编辑
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!dataList.length" class="empty-row">
              <td colspan="7">暂无菜单数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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
  createAdminMenu,
  getAdminMenuList,
  updateAdminMenu,
  type MenuListItem,
  type MenuMutationPayload,
} from '@osg/shared/api/admin/menu'
import MenuFormModal from './components/MenuFormModal.vue'

const menuFormVisible = ref(false)
const dataList = ref<MenuListItem[]>([])
const editingMenu = ref<MenuListItem | null>(null)
const searchName = ref('')
const selectedStatus = ref('全部状态')
const selectedMenuType = ref('全部类型')

const resolveStatusValue = (value: string) => {
  if (value === '启用') return '0'
  if (value === '停用') return '1'
  return undefined
}

const resolveMenuTypeValue = (value: string) => {
  if (value === '目录 M') return 'M'
  if (value === '菜单 C') return 'C'
  if (value === '按钮 F') return 'F'
  return undefined
}

const resolveTypeLabel = (menuType: MenuListItem['menuType']) => {
  if (menuType === 'M') return '目录 M'
  if (menuType === 'F') return '按钮 F'
  return '菜单 C'
}

const resolveTypeTagClass = (menuType: MenuListItem['menuType']) => {
  if (menuType === 'M') return 'tag-purple'
  if (menuType === 'F') return 'tag-warning'
  return 'tag-info'
}

const resolveIconClass = (item: MenuListItem) => {
  if (item.icon) {
    return item.icon.startsWith('mdi-') ? item.icon : `mdi-${item.icon}`
  }
  if (item.menuType === 'M') return 'mdi-folder-key'
  if (item.menuType === 'F') return 'mdi-radiobox-marked'
  return 'mdi-view-list'
}

const loadMenuList = async () => {
  try {
    dataList.value = await getAdminMenuList({
      menuName: searchName.value.trim() || undefined,
      status: resolveStatusValue(selectedStatus.value),
      menuType: resolveMenuTypeValue(selectedMenuType.value),
    })
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

<style scoped lang="scss">
.menu-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: #94a3b8;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: #64748b;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
  margin-bottom: 16px;
}

.card-header {
  padding: 18px 22px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.card-title .mdi {
  color: #6366f1;
  font-size: 20px;
  line-height: 1;
}

.card-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.card-body {
  padding: 22px;
}

.card-body--flush {
  padding: 0;
}

.toolbar-card__body {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.runtime-pill {
  margin-left: auto;
  padding: 10px 12px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.btn .mdi {
  font-size: 18px;
  line-height: 1;
}

.btn-outline {
  background: #fff;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
}

.btn-text {
  padding: 6px 12px;
  background: transparent;
  color: #6366f1;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: #fff;
}

.search-input {
  width: 220px;
}

.filter-select {
  width: auto;
  min-width: 120px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 14px;
}

.table th {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  background: #f8fafc;
}

.menu-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.menu-name-cell .mdi {
  color: #6366f1;
  font-size: 18px;
  line-height: 1;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.tag-purple {
  color: #4f46e5;
  background: #eef2ff;
}

.tag-success {
  color: #065f46;
  background: #d1fae5;
}

.tag-info {
  color: #1e40af;
  background: #dbeafe;
}

.tag-warning {
  color: #92400e;
  background: #fef3c7;
}

.tag-danger {
  color: #991b1b;
  background: #fee2e2;
}

.action-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.empty-row td {
  color: #64748b;
  text-align: center;
}
</style>
