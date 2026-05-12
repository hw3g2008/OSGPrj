<template>
  <div id="page-roles" class="osg-page">
    <PageHeader
      title-zh="权限配置"
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
          新增角色
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      type="info"
      show-icon
      banner
      message="操作提示"
      style="border-radius: 12px"
    >
      <template #description>
        <p style="margin: 0">
          点击「编辑」修改角色名称、描述及可访问的功能模块。员工数为 0 的角色可删除。
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
          showTotal: (total: number) => `共 ${total} 条记录`,
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
              <span :style="pillStyle('purple')">全部权限</span>
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
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getRoleList, getMenuTree, deleteRole, getRoleMenuIds } from '@/api/role'
import { getPermissionColor, getPermissionColorConfig } from '@osg/shared/utils/permissionColors'
import type { PermissionColorType } from '@osg/shared/utils/permissionColors'
import RoleModal from './components/RoleModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
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
            menuNames: ['全部权限']
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

<style scoped>
</style>
