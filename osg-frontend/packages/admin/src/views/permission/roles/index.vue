<template>
  <div id="page-roles" class="osg-page">
    <PageHeader
      title="权限配置"
      subtitle="Roles & Permissions"
      description="配置后台角色能访问的功能模块"
    >
      <template #actions>
        <a-button
          v-hasPermi="'system:role:add'"
          type="primary"
          data-surface-trigger="modal-new-role"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          新增角色
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      type="info"
      show-icon
      banner
      message="动态权限升级说明"
      style="border-radius: 12px"
    >
      <template #description>
        <p style="margin: 0">
          角色配置已从静态权限模块逐步升级为菜单树授权。保存后，菜单树授权会驱动
          <code>/getRouters</code> 和按钮级权限，确保菜单树授权与侧边栏/操作权限保持一致。
        </p>
        <p style="margin: 4px 0 0; color: #64748b">
          当前阶段：角色基础信息仍保留原入口，菜单树授权通过“配置菜单树”弹层收口。
        </p>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-table
        :columns="roleColumns"
        :data-source="roleList"
        :scroll="{ x: 'max-content' }"
        :row-key="(r: any) => r.roleId"
        :pagination="false"
        :loading="loading"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'roleName'">
            <strong>{{ record.roleName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'remark'">
            <span style="color: var(--muted)">{{ record.remark || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'menuNames'">
            <template v-if="record.roleKey === 'super_admin'">
              <a-tag color="purple">全部权限</a-tag>
            </template>
            <template v-else>
              <a-tag
                v-for="menu in record.menuNames?.slice(0, 5)"
                :key="menu"
                :color="getPermissionTagColor(menu)"
              >
                {{ menu }}
              </a-tag>
              <a-tag v-if="record.menuNames?.length > 5">
                +{{ record.menuNames.length - 5 }}
              </a-tag>
            </template>
          </template>
          <template v-else-if="column.dataIndex === 'userCount'">
            {{ record.userCount || 0 }}人
          </template>
          <template v-else-if="column.dataIndex === 'updateTime'">
            {{ formatDate(record.updateTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <template v-if="record.roleKey === 'super_admin'">
              <span style="color: var(--muted); font-size: 12px">系统角色</span>
            </template>
            <template v-else>
              <a-button
                v-hasPermi="'system:role:edit'"
                type="link"
                size="small"
                data-surface-trigger="modal-edit-role"
                data-surface-sample="modal-edit-role"
                :data-surface-sample-key="record.roleKey"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-hasPermi="'system:role:edit'"
                type="link"
                size="small"
                data-surface-trigger="modal-role-menu-tree"
                :data-surface-sample-key="record.roleKey"
                @click="handleRoleTree(record)"
              >
                配置菜单树
              </a-button>
              <a-button
                v-if="!record.userCount"
                v-hasPermi="'system:role:remove'"
                type="link"
                size="small"
                danger
                data-surface-part="delete-control"
                @click="handleDelete(record)"
              >
                删除
              </a-button>
            </template>
          </template>
        </template>
      </a-table>
    </a-card>

    <RoleModal
      v-model:visible="modalVisible"
      :role="currentRole"
      :menu-tree="menuTree"
      @success="loadRoleList"
    />

    <RoleMenuTreeModal
      v-model:visible="roleTreeVisible"
      :role="currentRole"
      :menu-tree="menuTree"
      :checked-keys="currentRoleTreeKeys"
      @submit="handleRoleTreeSubmit"
      @success="loadRoleList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getRoleList, getMenuTree, deleteRole, getRoleMenuIds, updateRole } from '@/api/role'
import { getPermissionClassName } from '@osg/shared/utils/permissionColors'
import RoleModal from './components/RoleModal.vue'
import RoleMenuTreeModal from './components/RoleMenuTreeModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { normalizeMenuTree } from './menuTree'
import dayjs from 'dayjs'

const roleColumns = [
  { title: 'ID', dataIndex: 'roleId', key: 'roleId', width: 80 },
  { title: '角色名称', dataIndex: 'roleName', key: 'roleName' },
  { title: '角色描述', dataIndex: 'remark', key: 'remark' },
  { title: '权限模块', dataIndex: 'menuNames', key: 'menuNames', width: 300 },
  { title: '员工数', dataIndex: 'userCount', key: 'userCount', width: 80 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime' },
  { title: '操作', dataIndex: 'action', key: 'action', width: 220 },
]

const permissionColorMap: Record<string, string> = {
  'permission-pill--info': 'blue',
  'permission-pill--warning': 'orange',
  'permission-pill--success': 'green',
  'permission-pill--danger': 'red',
  'permission-pill--purple': 'purple',
  'permission-pill--teal': 'cyan',
  'permission-pill--default': 'default',
}

const getPermissionTagColor = (menu: string) => {
  const cls = getPermissionClassName(menu)
  return permissionColorMap[cls] || 'default'
}

const loading = ref(false)
const roleList = ref<any[]>([])
const menuTree = ref<any[]>([])
const modalVisible = ref(false)
const roleTreeVisible = ref(false)
const currentRole = ref<any>(null)
const currentRoleTreeKeys = ref<number[]>([])

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

const handleRoleTree = (record: any) => {
  currentRole.value = record
  currentRoleTreeKeys.value = []
  roleTreeVisible.value = true
  getRoleMenuIds(record.roleId)
    .then((res) => {
      currentRoleTreeKeys.value = res.checkedKeys || []
    })
    .catch(() => {
      message.error('加载角色菜单树失败')
    })
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

const handleRoleTreeSubmit = async (menuIds: number[]) => {
  if (!currentRole.value) {
    return
  }

  try {
    await updateRole({
      roleId: currentRole.value.roleId,
      roleName: currentRole.value.roleName,
      roleKey: currentRole.value.roleKey,
      status: currentRole.value.status || '0',
      remark: currentRole.value.remark || '',
      menuIds,
    })
    message.success('角色菜单树已保存')
    currentRoleTreeKeys.value = menuIds
    loadRoleList()
  } catch (error) {
    message.error('保存角色菜单树失败')
  }
}
</script>

<style scoped>
</style>
