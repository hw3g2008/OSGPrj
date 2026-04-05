<template>
  <OverlaySurfaceModal
    surface-id="modal-menu-form"
    :open="visible"
    width="680px"
    max-height="90vh"
    @cancel="handleClose"
  >
    <template #title>
      <span class="menu-form-modal__title">
        <span class="mdi mdi-file-tree menu-form-modal__title-icon" aria-hidden="true" />
        <span>菜单项配置</span>
      </span>
    </template>

    <div class="menu-form-modal__note">
      菜单类型决定字段联动：目录仅维护显示结构；菜单维护路由与组件；按钮仅维护权限标识。
    </div>

    <div data-content-part="field-group" class="menu-form-modal__fields">
      <label class="form-label">菜单类型 <span class="required">*</span></label>
      <select v-model="formState.menuType" class="form-select">
        <option>菜单 C</option>
        <option>目录 M</option>
        <option>按钮 F</option>
      </select>

      <label class="form-label">上级菜单</label>
      <select v-model="formState.parentId" class="form-select">
        <option :value="0">权限管理</option>
        <option :value="1">菜单管理</option>
        <option :value="2">角色管理</option>
      </select>

      <label class="form-label">菜单名称 <span class="required">*</span></label>
      <input v-model="formState.menuName" class="form-input" placeholder="请输入菜单名称" />

      <label class="form-label">路由地址</label>
      <input v-model="formState.path" class="form-input" placeholder="如：/permission/menu" />

      <label class="form-label">组件路径</label>
      <input v-model="formState.component" class="form-input" placeholder="如：permission/menu/index" />

      <label class="form-label">权限标识 <span class="required">*</span></label>
      <input v-model="formState.perms" class="form-input" placeholder="如：system:menu:list" />

      <label class="form-label">图标</label>
      <input v-model="formState.icon" class="form-input" placeholder="如：mdi-file-tree" />

      <div class="menu-form-modal__grid">
        <div class="menu-form-modal__field">
          <label class="form-label">显示排序</label>
          <input v-model="formState.orderNum" class="form-input" />
        </div>
        <div class="menu-form-modal__field">
          <label class="form-label">状态</label>
          <select v-model="formState.status" class="form-select">
            <option value="0">启用</option>
            <option value="1">停用</option>
          </select>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-outline" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" @click="handleSubmit">保存</button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { MenuListItem, MenuMutationPayload } from '@osg/shared/api/admin/menu'

const props = defineProps<{
  visible: boolean
  record?: MenuListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [payload: MenuMutationPayload]
}>()

const formState = reactive<MenuMutationPayload>({
  menuId: undefined,
  parentId: 0,
  menuName: '',
  menuType: 'C',
  orderNum: 90,
  path: '/permission/menu',
  component: 'permission/menu/index',
  perms: 'system:menu:list',
  icon: 'mdi-file-tree',
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
      formState.path = '/permission/menu'
      formState.component = 'permission/menu/index'
      formState.perms = 'system:menu:list'
      formState.icon = 'mdi-file-tree'
      formState.status = '0'
      formState.visible = '0'
      formState.isFrame = '1'
      formState.isCache = '0'
      formState.query = ''
      formState.routeName = ''
      return
    }

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

<style scoped lang="scss">
.menu-form-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.menu-form-modal__title-icon {
  font-size: 20px;
  line-height: 1;
  color: #6366f1;
}

.menu-form-modal__note {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 13px;
  line-height: 1.6;
}

.menu-form-modal__fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-form-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.menu-form-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: block;
  margin-bottom: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.required {
  color: #ef4444;
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

.btn-outline {
  background: #fff;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
}
</style>
