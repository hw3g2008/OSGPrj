<template>
  <OverlaySurfaceModal
    surface-id="modal-menu-form"
    :open="visible"
    width="680px"
    max-height="90vh"
    body-class="osg-modal-form"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-tree" aria-hidden="true" />
        <span>{{ t('admin.permission.menu.modal.title') }}</span>
      </span>
    </template>

    <a-alert type="info" show-icon :message="t('admin.permission.menu.modal.infoAlert')" style="margin-bottom: 16px" />

    <a-form layout="vertical">
      <a-form-item :label="t('admin.permission.menu.modal.typeLabel')" required>
        <a-select v-model:value="formState.menuType" :disabled="!!formState.menuId">
          <a-select-option value="M">{{ t('admin.permission.menu.modal.typeDir') }}</a-select-option>
          <a-select-option value="C">{{ t('admin.permission.menu.modal.typeMenu') }}</a-select-option>
          <a-select-option value="F">{{ t('admin.permission.menu.modal.typeButton') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="t('admin.permission.menu.modal.parentDirLabel')">
        <a-select v-model:value="formState.parentId" :placeholder="t('admin.permission.menu.modal.parentDirPlaceholder')">
          <a-select-option v-for="item in parentDirOptions" :key="item.menuId" :value="item.menuId">{{ item.menuName }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" :label="t('admin.permission.menu.modal.parentMenuLabel')">
        <a-select v-model:value="formState.parentId" :placeholder="t('admin.permission.menu.modal.parentMenuPlaceholder')">
          <a-select-option v-for="item in parentMenuOptions" :key="item.menuId" :value="item.menuId">{{ item.menuName }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="t('admin.permission.menu.modal.nameLabel')" required>
        <a-input v-model:value="formState.menuName" :placeholder="t('admin.permission.menu.modal.namePlaceholder')" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="t('admin.permission.menu.modal.pathLabel')">
        <a-input v-model:value="formState.path" placeholder="如：permission/menu" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="t('admin.permission.menu.modal.componentLabel')">
        <a-input v-model:value="formState.component" placeholder="如：permission/menu/index" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" :label="t('admin.permission.menu.modal.permsLabel')" required>
        <a-input v-model:value="formState.perms" placeholder="如：system:menu:list" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="t('admin.permission.menu.modal.orderNumLabel')">
            <a-input-number v-model:value="formState.orderNum" size="middle" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('admin.permission.menu.modal.statusLabel')">
            <a-select v-model:value="formState.status">
              <a-select-option value="0">{{ t('admin.permission.menu.status.enabled') }}</a-select-option>
              <a-select-option value="1">{{ t('admin.permission.menu.status.disabled') }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.permission.menu.modal.cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">{{ t('admin.permission.menu.modal.save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { getAdminMenuList, type MenuListItem, type MenuMutationPayload } from '@osg/shared/api/admin/menu'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  record?: MenuListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [payload: MenuMutationPayload]
}>()

// 动态获取上级菜单选项
const parentDirOptions = ref<MenuListItem[]>([])   // dir list for menu-C parent
const parentMenuOptions = ref<MenuListItem[]>([])  // menu list for button-F parent
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
