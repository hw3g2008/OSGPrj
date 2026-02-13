<template>
  <div class="roles-page">
    <div class="page-header">
      <div>
        <h2>权限配置</h2>
        <p class="subtitle">配置后台角色能访问的功能模块</p>
      </div>
      <a-button type="primary" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        新增角色
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="roleList"
      :loading="loading"
      :pagination="pagination"
      row-key="roleId"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'roleName'">
          <span class="role-name">{{ record.roleName }}</span>
        </template>

        <template v-if="column.key === 'remark'">
          <span class="role-desc">{{ record.remark || '-' }}</span>
        </template>

        <template v-if="column.key === 'menus'">
          <template v-if="record.roleKey === 'super_admin'">
            <a-tag color="gold">全部权限</a-tag>
          </template>
          <template v-else>
            <a-tag v-for="menu in record.menuNames?.slice(0, 5)" :key="menu" color="blue">
              {{ menu }}
            </a-tag>
            <a-tag v-if="record.menuNames?.length > 5">+{{ record.menuNames.length - 5 }}</a-tag>
          </template>
        </template>

        <template v-if="column.key === 'userCount'">
          {{ record.userCount || 0 }}人
        </template>

        <template v-if="column.key === 'updateTime'">
          {{ formatDate(record.updateTime) }}
        </template>

        <template v-if="column.key === 'action'">
          <template v-if="record.roleKey === 'super_admin'">
            <span class="system-role">系统角色</span>
          </template>
          <template v-else>
            <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
            <a-button
              v-if="!record.userCount"
              type="link"
              size="small"
              danger
              @click="handleDelete(record)"
            >
              删除
            </a-button>
          </template>
        </template>
      </template>
    </a-table>

    <RoleModal
      v-model:visible="modalVisible"
      :role="currentRole"
      :menu-tree="menuTree"
      @success="loadRoleList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getRoleList, getMenuTree, deleteRole } from '@/api/role'
import RoleModal from './components/RoleModal.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const roleList = ref<any[]>([])
const menuTree = ref<any[]>([])
const modalVisible = ref(false)
const currentRole = ref<any>(null)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const columns = [
  { title: 'ID', dataIndex: 'roleId', key: 'roleId', width: 80 },
  { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 150 },
  { title: '角色描述', dataIndex: 'remark', key: 'remark', width: 200 },
  { title: '权限模块', key: 'menus', width: 300 },
  { title: '员工数', key: 'userCount', width: 100 },
  { title: '更新时间', key: 'updateTime', width: 120 },
  { title: '操作', key: 'action', width: 150 }
]

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
    roleList.value = res.rows || []
    pagination.total = res.total || 0
  } catch (error) {
    message.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

const loadMenuTree = async () => {
  try {
    const res = await getMenuTree()
    menuTree.value = res || []
  } catch (error) {
    console.error('加载菜单树失败', error)
  }
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadRoleList()
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
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;

    h2 {
      margin: 0 0 4px;
      font-size: 20px;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .role-name {
    font-weight: 600;
  }

  .role-desc {
    color: #999;
  }

  .system-role {
    color: #999;
  }
}
</style>
