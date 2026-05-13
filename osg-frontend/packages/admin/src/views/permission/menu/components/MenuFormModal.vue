<template>
  <OverlaySurfaceModal
    surface-id="modal-menu-form"
    :open="visible"
    width="680px"
    max-height="90vh"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-tree" aria-hidden="true" />
        <span>菜单项配置</span>
      </span>
    </template>

    <a-alert type="info" show-icon :message="'菜单类型决定字段联动：目录仅维护显示结构；菜单维护路由与组件；按钮仅维护权限标识。'" style="margin-bottom: 16px" />

    <a-form layout="vertical">
      <a-form-item label="菜单类型" required>
        <a-select v-model:value="formState.menuType" :disabled="!!formState.menuId">
          <a-select-option value="M">目录 M</a-select-option>
          <a-select-option value="C">菜单 C</a-select-option>
          <a-select-option value="F">按钮 F</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" label="所属目录">
        <a-select v-model:value="formState.parentId" placeholder="请选择所属目录">
          <a-select-option v-for="item in parentDirOptions" :key="item.menuId" :value="item.menuId">{{ item.menuName }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" label="所属菜单">
        <a-select v-model:value="formState.parentId" placeholder="请选择所属菜单">
          <a-select-option v-for="item in parentMenuOptions" :key="item.menuId" :value="item.menuId">{{ item.menuName }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="菜单名称" required>
        <a-input v-model:value="formState.menuName" placeholder="请输入菜单名称" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" label="路由地址">
        <a-input v-model:value="formState.path" placeholder="如：permission/menu" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" label="组件路径">
        <a-input v-model:value="formState.component" placeholder="如：permission/menu/index" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" label="权限标识" required>
        <a-input v-model:value="formState.perms" placeholder="如：system:menu:list" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="显示排序">
            <a-input-number v-model:value="formState.orderNum" size="middle" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="状态">
            <a-select v-model:value="formState.status">
              <a-select-option value="0">启用</a-select-option>
              <a-select-option value="1">停用</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" @click="handleSubmit">保存</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { getAdminMenuList, type MenuListItem, type MenuMutationPayload } from '@osg/shared/api/admin/menu'

const props = defineProps<{
  visible: boolean
  record?: MenuListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [payload: MenuMutationPayload]
}>()

// 动态获取上级菜单选项
const parentDirOptions = ref<MenuListItem[]>([])   // 目录列表，供菜单 C 选择上级
const parentMenuOptions = ref<MenuListItem[]>([])  // 菜单列表，供按钮 F 选择上级
const loadParentMenus = async () => {
  try {
    const list = await getAdminMenuList()
    parentDirOptions.value = list.filter((m) => m.menuType === 'M')
    parentMenuOptions.value = list.filter((m) => m.menuType === 'C')
  } catch {
    // 静默
  }
}

const formState = reactive<MenuMutationPayload>({
  menuId: undefined,
  parentId: 0,
  menuName: '',
  menuType: 'C',
  orderNum: 90,
  path: '',
  component: '',
  perms: '',
  icon: '',
  status: '0',
  visible: '0',
  isFrame: '1',
  isCache: '0',
  query: '',
  routeName: ''
})

watch(
  () => props.record,
  (record) => {
    if (!record) {
      formState.menuId = undefined
      formState.parentId = 0
      formState.menuName = ''
      formState.menuType = 'C'
      formState.orderNum = 90
      formState.path = ''
      formState.component = ''
      formState.perms = ''
      formState.icon = ''
      formState.status = '0'
      formState.visible = '0'
      formState.isFrame = '1'
      formState.query = ''
      formState.routeName = ''
      return
    }

    loadParentMenus()
    formState.menuId = record.menuId
    formState.parentId = record.parentId ?? 0
    formState.menuName = record.menuName
    formState.menuType = record.menuType
    formState.orderNum = record.orderNum ?? 90
    formState.path = record.path || ''
    formState.component = record.component || ''
    formState.perms = record.perms || ''
    formState.icon = record.icon || ''
    formState.status = record.status
    formState.visible = (record.visible as '0' | '1') || '0'
    formState.isFrame = '1'
    formState.isCache = '0'
    formState.query = ''
    formState.routeName = ''
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  emit('submit', { ...formState })
}
</script>

<style scoped>
:deep(.ant-input-number) {
  height: 32px;
  display: flex;
  align-items: center;
}
</style>
