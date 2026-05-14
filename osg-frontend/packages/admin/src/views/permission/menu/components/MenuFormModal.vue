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
        <span>{{ $t('menu_item_configuration') }}</span>
      </span>
    </template>

    <a-alert type="info" show-icon :message="$t('menu_type_determines_field_behavior_dire')" style="margin-bottom: 16px" />

    <a-form layout="vertical">
      <a-form-item :label="$t('menu_type')" required>
        <a-select v-model:value="formState.menuType" :disabled="!!formState.menuId">
          <a-select-option value="M">{{ $t('directory') }} M</a-select-option>
          <a-select-option value="C">{{ $t('menu') }} C</a-select-option>
          <a-select-option value="F">{{ $t('button') }} F</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="$t('parent_directory')">
        <a-select v-model:value="formState.parentId" :placeholder="$t('please_select_a_parent_directory')">
          <a-select-option v-for="item in parentDirOptions" :key="item.menuId" :value="item.menuId">{{ resolveMenuName(item) }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" :label="$t('parent_menu')">
        <a-select v-model:value="formState.parentId" :placeholder="$t('please_select_a_parent_menu')">
          <a-select-option v-for="item in parentMenuOptions" :key="item.menuId" :value="item.menuId">{{ resolveMenuName(item) }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="$t('menu_name')" required>
        <a-input v-model:value="formState.menuName" :placeholder="$t('please_enter_menu_name')" />
      </a-form-item>
      <a-form-item :label="$t('i18n_key')">
        <a-input v-model:value="formState.i18nKey" :placeholder="$t('please_enter_i18n_key')" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="$t('route_path')">
        <a-input v-model:value="formState.path" :placeholder="`${$t('for_example')}: permission/menu`" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'C'" :label="$t('component_path')">
        <a-input v-model:value="formState.component" :placeholder="`${$t('for_example')}: permission/menu/index`" />
      </a-form-item>
      <a-form-item v-if="formState.menuType === 'F'" :label="$t('permission_key')" required>
        <a-input v-model:value="formState.perms" :placeholder="`${$t('for_example')}: system:menu:list`" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('display_order')">
            <a-input-number v-model:value="formState.orderNum" size="middle" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('status')">
            <a-select v-model:value="formState.status">
              <a-select-option value="0">{{ $t('enable') }}</a-select-option>
              <a-select-option value="1">{{ $t('deactivate') }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">{{ $t('save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { getAdminMenuList, type MenuListItem, type MenuMutationPayload } from '@osg/shared/api/admin/menu'
import { resolveMenuDisplayName } from '@osg/shared/utils'
import { useI18n } from 'vue-i18n'

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

const resolveMenuName = (menu: MenuListItem) => resolveMenuDisplayName(menu, t)

const formState = reactive<MenuMutationPayload>({
  menuId: undefined,
  parentId: 0,
  menuName: '',
  i18nKey: '',
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
      formState.i18nKey = ''
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
    formState.i18nKey = record.i18nKey || ''
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
