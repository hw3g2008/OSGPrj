<template>
  <div class="roles-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          权限配置
          <span class="page-title-en">Roles &amp; Permissions</span>
        </h2>
        <p class="page-sub subtitle">配置后台角色能访问的功能模块</p>
      </div>
      <button
        type="button"
        class="permission-button permission-button--primary surface-trigger surface-trigger--primary"
        data-surface-trigger="modal-new-role"
        @click="handleAdd"
      >
        <i class="mdi mdi-plus" aria-hidden="true"></i>
        <span>新增角色</span>
      </button>
    </div>

    <div class="permission-card">
      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>角色名称</th>
              <th>角色描述</th>
              <th>权限模块</th>
              <th>员工数</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in roleList" :key="record.roleId">
              <td>{{ record.roleId }}</td>
              <td><strong>{{ record.roleName }}</strong></td>
              <td class="muted-copy">{{ record.remark || '-' }}</td>
              <td>
                <div class="permission-pill-group">
                  <template v-if="record.roleKey === 'super_admin'">
                    <span class="permission-pill permission-pill--purple">全部权限</span>
                  </template>
                  <template v-else>
                    <span
                      v-for="menu in record.menuNames?.slice(0, 5)"
                      :key="menu"
                      :class="['permission-pill', getPermissionClassName(menu)]"
                    >
                      {{ menu }}
                    </span>
                    <span
                      v-if="record.menuNames?.length > 5"
                      class="permission-pill permission-pill--default"
                    >
                      +{{ record.menuNames.length - 5 }}
                    </span>
                  </template>
                </div>
              </td>
              <td>{{ record.userCount || 0 }}人</td>
              <td>{{ formatDate(record.updateTime) }}</td>
              <td>
                <template v-if="record.roleKey === 'super_admin'">
                  <span class="system-role">系统角色</span>
                </template>
                <template v-else>
                  <div class="permission-actions">
                    <button
                      type="button"
                      class="permission-action surface-trigger surface-trigger--inline"
                      data-surface-trigger="modal-edit-role"
                      data-surface-sample="modal-edit-role"
                      :data-surface-sample-key="record.roleKey"
                      @click="handleEdit(record)"
                    >
                      编辑
                    </button>
                    <button
                      v-if="!record.userCount"
                      type="button"
                      class="permission-action permission-action--danger"
                      data-surface-part="delete-control"
                      @click="handleDelete(record)"
                    >
                      删除
                    </button>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <RoleModal
      v-model:visible="modalVisible"
      :role="currentRole"
      :menu-tree="menuTree"
      @success="loadRoleList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getRoleList, getMenuTree, deleteRole, getRoleMenuIds } from '@/api/role'
import { getPermissionClassName } from '@osg/shared/utils/permissionColors'
import RoleModal from './components/RoleModal.vue'
import { normalizeMenuTree } from './menuTree'
import dayjs from 'dayjs'

const loading = ref(false)
const roleList = ref<any[]>([])
const menuTree = ref<any[]>([])
const modalVisible = ref(false)
const currentRole = ref<any>(null)

const formatDate = (date: string) => {
  return date ? dayjs(date).format('MM/DD/YYYY') : '-'
}

const loadRoleList = async () => {
  try {
    loading.value = true
    const res = await getRoleList({
      pageNum: 1,
      pageSize: 10
    })
    const roles = res.rows || []
    
    // 为每个角色加载权限信息
    const rolesWithMenus = await Promise.all(
      roles.map(async (role) => {
        if (role.roleKey === 'super_admin') {
          // 超级管理员显示全部权限
          return {
            ...role,
            menuNames: ['全部权限']
          }
        }
        
        try {
          const menuRes = await getRoleMenuIds(role.roleId)
          const menuMap = new Map()
          
          // 构建菜单映射
          const buildMenuMap = (menus: any[]) => {
            menus.forEach(menu => {
              menuMap.set(menu.id, menu.label)
              if (menu.children) {
                buildMenuMap(menu.children)
              }
            })
          }
          buildMenuMap(menuRes.menus || [])
          
          // 获取已选权限的名称
          const menuNames = (menuRes.checkedKeys || [])
            .map(id => menuMap.get(id))
            .filter(Boolean)
          
          return {
            ...role,
            menuNames: menuNames.length > 0 ? menuNames : ['未分配权限']
          }
        } catch {
          return {
            ...role,
            menuNames: ['权限加载失败']
          }
        }
      })
    )
    
    roleList.value = rolesWithMenus
  } catch (error) {
    message.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

const loadMenuTree = async () => {
  try {
    const res = await getMenuTree()
    menuTree.value = normalizeMenuTree(res || [])
  } catch (error) {
    console.error('加载菜单树失败', error)
  }
}

const handleAdd = () => {
  currentRole.value = null
  modalVisible.value = true
}

const handleEdit = (record: any) => {
  currentRole.value = record
  modalVisible.value = true
}

const handleDelete = (record: any) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该角色吗？删除后不可恢复。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteRole(record.roleId)
        message.success('角色删除成功')
        loadRoleList()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(() => {
  loadRoleList()
  loadMenuTree()
})
</script>

<style scoped lang="scss">
.roles-page {
  padding: 8px 4px 0;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .page-title {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    line-height: normal;
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
    line-height: normal;
    color: #64748b;
  }

  .permission-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;

    &--primary {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
  }

  .permission-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
  }

  .permission-card__body {
    padding: 22px;
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

  .muted-copy {
    color: #94a3b8;
    font-size: 13px;
  }

  .permission-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .permission-pill {
    display: inline-flex;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;

    &--info {
      background: #dbeafe;
      color: #1e40af;
    }

    &--warning {
      background: #fef3c7;
      color: #92400e;
    }

    &--success {
      background: #d1fae5;
      color: #065f46;
    }

    &--danger {
      background: #fee2e2;
      color: #991b1b;
    }

    &--purple {
      background: #e0e7ff;
      color: #4f46e5;
    }

    &--teal {
      background: #ccfbf1;
      color: #115e59;
    }

    &--default {
      background: #f1f5f9;
      color: #64748b;
    }
  }

  .permission-actions {
    display: flex;
    align-items: center;
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
  }

  .system-role {
    font-size: 12px;
    color: #94a3b8;
  }
}
</style>
