<template>
  <div id="page-roles" class="osg-page">
    <PageHeader
      :title-zh="$t('permission_configuration')"
      title-en="Roles & Permissions"
      :description="$t('configure_the_functional_modules_backend')"
    >
      <template #actions>
        <a-button
          v-hasPermi="'system:role:add'"
          type="primary"
          data-surface-trigger="modal-new-role"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          {{ $t('add_role') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      type="info"
      show-icon
      banner
      :message="$t('tips')"
      style="border-radius: 12px"
    >
      <template #description>
        <p style="margin: 0">
          {{ $t('click') }}「{{ $t('edit') }}」{{ $t('modify_role_name_and_description_click') }}「{{ $t('configure_menu_tree') }}」{{ $t('manage_functional_modules_accessible_by_') }}。
        </p>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-table
        :columns="roleColumns"
        :data-source="roleList"
        :scroll="{ x: 'max-content' }"
        :row-key="(r: any) => r.roleId"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`,
          onChange: onPageChange,
        }"
        :loading="loading"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'roleName'">
            <strong>{{ resolveRoleDisplayName({ roleName: record.roleName, i18nKey: record.i18nKey }, t) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'remark'">
            <span style="color: var(--muted)">{{ resolveRoleDescription({ remark: record.remark, remarkI18nKey: record.remarkI18nKey }, t) || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'menuNames'">
            <template v-if="record.roleKey === 'super_admin'">
              <span :style="pillStyle('purple')">{{ $t('all_permissions') }}</span>
            </template>
            <template v-else>
              <span
                v-for="menu in record.menuNames?.slice(0, 5)"
                :key="menu"
                :style="pillStyle(getPermissionColor(menu))"
              >
                {{ menu }}
              </span>
              <span v-if="record.menuNames?.length > 5" :style="pillStyle('default')">
                +{{ record.menuNames.length - 5 }}
              </span>
            </template>
          </template>
          <template v-else-if="column.dataIndex === 'userCount'">
            {{ record.userCount || 0 }}{{ $t('people') }}
          </template>
          <template v-else-if="column.dataIndex === 'updateTime'">
            {{ formatDate(record.updateTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <template v-if="record.roleKey === 'super_admin'">
              <span style="color: var(--muted); font-size: 12px">{{ $t('system_role') }}</span>
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
                {{ $t('edit') }}
              </a-button>
              <a-button
                v-hasPermi="'system:role:edit'"
                type="link"
                size="small"
                data-surface-trigger="modal-role-menu-tree"
                :data-surface-sample-key="record.roleKey"
                @click="handleRoleTree(record)"
              >
                {{ $t('configure_menu_tree') }}
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
                {{ $t('delete') }}
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
import { reactive, ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getRoleList, getMenuTree, deleteRole, getRoleMenuIds, updateRole } from '@/api/role'
import { getPermissionColor, getPermissionColorConfig } from '@osg/shared/utils/permissionColors'
import type { PermissionColorType } from '@osg/shared/utils/permissionColors'
import RoleModal from './components/RoleModal.vue'
import RoleMenuTreeModal from './components/RoleMenuTreeModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PlusOutlined } from '@ant-design/icons-vue'
import { normalizeMenuTree } from './menuTree'
import { resolveMenuDisplayName } from '@osg/shared/utils/menuI18n'
import { resolveRoleDisplayName, resolveRoleDescription } from '@osg/shared/utils/roleI18n'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const roleColumns = [
  { title: 'ID', dataIndex: 'roleId', key: 'roleId', width: 80 },
  { title: t('role_name'), dataIndex: 'roleName', key: 'roleName' },
  { title: t('role_description'), dataIndex: 'remark', key: 'remark' },
  { title: t('permission_modules'), dataIndex: 'menuNames', key: 'menuNames', width: 300 },
  { title: t('members'), dataIndex: 'userCount', key: 'userCount', width: 80 },
  { title: t('updated_at'), dataIndex: 'updateTime', key: 'updateTime' },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 220 },
]

const pillStyle = (colorType: PermissionColorType) => {
  const cfg = getPermissionColorConfig(colorType)
  return {
    display: 'inline-flex',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    margin: '2px',
    background: cfg.bg,
    color: cfg.text,
  }
}

const loading = ref(false)
const roleList = ref<any[]>([])
const menuTree = ref<any[]>([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const onPageChange = (page: number) => {
  pagination.current = page
  loadRoleList()
}
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
      pageNum: pagination.current,
      pageSize: pagination.pageSize
    })
    const roles = res.rows || []
    pagination.total = res.total || 0
    
    // 为每个角色加载权限信息
    const rolesWithMenus = await Promise.all(
      roles.map(async (role) => {
        if (role.roleKey === 'super_admin') {
          // 超级管理员显示全部权限
          return {
            ...role,
            menuNames: [t('all_permissions')]
          }
        }
        
        try {
          const menuRes = await getRoleMenuIds(role.roleId)
          const checkedSet = new Set(menuRes.checkedKeys || [])
          
          // 收集被选中叶子所属的二级菜单名称（去重，走 i18n resolver）
          const secondLevelNames: string[] = []
          const menus = menuRes.menus || []
          for (const top of menus) {
            if (!top.children?.length) {
              // 一级无子项（如「首页」），跳过
              continue
            }
            for (const second of top.children) {
              // 检查二级菜单本身或其下任意子项是否被选中
              const hasChecked = checkedSet.has(second.id) ||
                (second.children || []).some((c: any) => checkedSet.has(c.id))
              if (!hasChecked) continue
              const display = resolveMenuDisplayName(
                { menuName: second.label, i18nKey: second.i18nKey },
                t
              )
              if (display && !secondLevelNames.includes(display)) {
                secondLevelNames.push(display)
              }
            }
          }
          const menuNames = secondLevelNames
          
          return {
            ...role,
            menuNames: menuNames.length > 0 ? menuNames : [t('no_permissions_assigned')]
          }
        } catch {
          return {
            ...role,
            menuNames: [t('failed_to_load_permissions')]
          }
        }
      })
    )
    
    roleList.value = rolesWithMenus
  } catch (error) {
    message.error(t('failed_to_load_role_list'))
  } finally {
    loading.value = false
  }
}

const loadMenuTree = async () => {
  try {
    const res = await getMenuTree()
    menuTree.value = normalizeMenuTree(res || [])
  } catch (error) {
    console.error(t('failed_to_load_menu_tree'), error)
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
      message.error(t('failed_to_load_role_menu_tree'))
    })
}

const handleDelete = (record: any) => {
  Modal.confirm({
    title: t('confirm_delete'),
    content: t('confirm_delete_role_content'),
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: async () => {
      try {
        await deleteRole(record.roleId)
        message.success(t('role_deleted_successfully'))
        loadRoleList()
      } catch (error) {
        message.error(t('delete_failed'))
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
    message.success(t('role_menu_tree_saved'))
    currentRoleTreeKeys.value = menuIds
    loadRoleList()
  } catch (error) {
    message.error(t('failed_to_save_role_menu_tree'))
  }
}
</script>

<style scoped>
</style>
