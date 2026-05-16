<template>
  <div id="page-roles" class="osg-page">
    <PageHeader
      :title-zh="t('admin.permission.roles.pageTitle')"
      title-en="Roles & Permissions"
    >
      <template #actions>
        <a-button
          v-hasPermi="'system:role:add'"
          type="primary"
          data-surface-trigger="modal-new-role"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          {{ t('admin.permission.roles.addButton') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      type="info"
      show-icon
      banner
      :message="t('admin.permission.roles.infoTitle')"
      style="border-radius: 12px"
    >
      <template #description>
        <p style="margin: 0">
          {{ t('admin.permission.roles.infoDesc') }}
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
          showTotal: (total: number) => t('admin.permission.roles.totalRecords', { total }),
          onChange: onPageChange,
        }"
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
              <span :style="pillStyle('purple')">{{ t('admin.permission.roles.allPerms') }}</span>
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
            {{ t('admin.permission.roles.userCount', { count: record.userCount || 0 }) }}
          </template>
          <template v-else-if="column.dataIndex === 'updateTime'">
            {{ formatDate(record.updateTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <template v-if="record.roleKey === 'super_admin'">
              <span style="color: var(--muted); font-size: 12px">{{ t('admin.permission.roles.systemRole') }}</span>
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
                {{ t('admin.permission.roles.action.edit') }}
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
                {{ t('admin.permission.roles.action.delete') }}
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
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { message, Modal } from 'ant-design-vue'
import { getRoleList, getMenuTree, deleteRole, getRoleMenuIds } from '@/api/role'
import { getPermissionColor, getPermissionColorConfig } from '@osg/shared/utils/permissionColors'
import type { PermissionColorType } from '@osg/shared/utils/permissionColors'
import RoleModal from './components/RoleModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PlusOutlined } from '@ant-design/icons-vue'
import { normalizeMenuTree } from './menuTree'
import dayjs from 'dayjs'

const { t } = useI18n()

const roleColumns = computed(() => [
  { title: 'ID', dataIndex: 'roleId', key: 'roleId', width: 80, fixed: 'left' as const },
  { title: t('admin.permission.roles.columns.name'), dataIndex: 'roleName', key: 'roleName' },
  { title: t('admin.permission.roles.columns.desc'), dataIndex: 'remark', key: 'remark' },
  { title: t('admin.permission.roles.columns.perms'), dataIndex: 'menuNames', key: 'menuNames', width: 300 },
  { title: t('admin.permission.roles.columns.userCount'), dataIndex: 'userCount', key: 'userCount', width: 80 },
  { title: t('admin.permission.roles.columns.updateTime'), dataIndex: 'updateTime', key: 'updateTime' },
  { title: t('admin.permission.roles.columns.action'), dataIndex: 'action', key: 'action', width: 220, fixed: 'right' as const },
])

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
const currentRole = ref<any>(null)

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
            menuNames: [t('admin.permission.roles.allPerms')]
          }
        }

        try {
          const menuRes = await getRoleMenuIds(role.roleId)
          const checkedSet = new Set(menuRes.checkedKeys || [])

          // 收集被选中叶子所属的二级菜单名称（去重）
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
              if (hasChecked && !secondLevelNames.includes(second.label)) {
                secondLevelNames.push(second.label)
              }
            }
          }
          const menuNames = secondLevelNames

          return {
            ...role,
            menuNames: menuNames.length > 0 ? menuNames : [t('admin.permission.roles.noPerms')]
          }
        } catch {
          return {
            ...role,
            menuNames: [t('admin.permission.roles.permsError')]
          }
        }
      })
    )

    roleList.value = rolesWithMenus
  } catch (error) {
    message.error(t('admin.permission.roles.messages.loadError'))
  } finally {
    loading.value = false
  }
}

const loadMenuTree = async () => {
  try {
    const res = await getMenuTree()
    menuTree.value = normalizeMenuTree(res || [])
  } catch (error) {
    console.error('Failed to load menu tree', error)
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
    title: t('admin.permission.roles.messages.deleteConfirmTitle'),
    content: t('admin.permission.roles.messages.deleteConfirmContent'),
    okText: t('admin.permission.roles.messages.confirmOk'),
    cancelText: t('admin.permission.roles.messages.confirmCancel'),
    onOk: async () => {
      try {
        await deleteRole(record.roleId)
        message.success(t('admin.permission.roles.messages.deleteSuccess'))
        loadRoleList()
      } catch (error) {
        message.error(t('admin.permission.roles.messages.deleteError'))
      }
    }
  })
}

onMounted(() => {
  loadRoleList()
  loadMenuTree()
})
</script>

<style scoped>
</style>
