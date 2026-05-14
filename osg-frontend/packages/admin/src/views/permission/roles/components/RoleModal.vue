<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="650px"
    max-height="calc(100vh - 80px)"
    body-class="role-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="role-modal__title">
        <span
          class="mdi role-modal__title-icon"
          :class="isEdit ? 'mdi-key-change' : 'mdi-key-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? $t('edit_role') : $t('add_role') }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      data-content-part="field-group"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item name="roleName" :data-field-name="$t('role_name')">
        <template #label>
          <span class="role-modal__label">{{ $t('role_name') }}<span class="role-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.roleName" :placeholder="$t('enter_role_name_e_g_operations_specialis')" />
      </a-form-item>

      <a-form-item name="remark" :data-field-name="$t('role_description')">
        <template #label>
          <span class="role-modal__label">{{ $t('role_description') }}</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          :placeholder="$t('enter_role_description_max_200_character')"
          :rows="2"
          :maxlength="200"
        />
      </a-form-item>

      <a-form-item name="menuIds" :data-field-name="$t('permission_modules')">
        <template #label>
          <span class="role-modal__label">{{ $t('permission_modules') }}<span class="role-modal__required">*</span></span>
        </template>
        <p class="role-modal__tip" data-content-part="supporting-text">{{ $t('select_the_functional_modules_this_role_') }}</p>
        <div class="role-modal__perm-panel">
          <section
            v-for="group in permissionGroups"
            :key="group.id"
            class="role-modal__perm-group"
          >
            <div class="role-modal__perm-group-label">
              <a-checkbox
                :checked="isGroupChecked(group)"
                @change="(e: any) => toggleGroup(group, e.target.checked)"
              >
                <span
                  class="mdi role-modal__perm-group-icon"
                  :class="group.icon"
                  aria-hidden="true"
                />
                <span>{{ group.label }}</span>
              </a-checkbox>
            </div>

            <div class="role-modal__perm-items">
              <a-checkbox
                v-for="item in group.items"
                :key="item.id"
                :checked="formState.menuIds.includes(item.id)"
                @change="(e: any) => toggleMenu(item.id, e.target.checked)"
              >
                {{ item.label }}
              </a-checkbox>
            </div>
          </section>
        </div>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">{{ $t('save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addRole, getRoleMenuIds, updateRole } from '@/api/role'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { resolveMenuDisplayName } from '@osg/shared/utils/menuI18n'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
type MenuNode = {
  id: number
  label: string
  i18nKey?: string
  children?: MenuNode[]
}

type PermissionGroup = {
  id: number
  label: string
  icon: string
  items: Array<{ id: number; label: string }>
}

const props = defineProps<{
  visible: boolean
  role: any
  menuTree: MenuNode[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const loading = ref(false)

const isEdit = computed(() => Boolean(props.role))
const surfaceId = computed(() => (isEdit.value ? 'modal-edit-role' : 'modal-new-role'))

const formState = reactive({
  roleId: undefined as number | undefined,
  roleName: '',
  roleKey: '',
  roleSort: 1,
  remark: '',
  menuIds: [] as number[],
})

const rules = {
  roleName: [{ required: true, message: t('please_enter_role_name'), trigger: 'blur' }],
  menuIds: [{ required: true, message: t('please_select_permission_modules'), trigger: 'change', type: 'array' }],
}

function collectLeafItems(nodes: MenuNode[] = []): Array<{ id: number; label: string }> {
  const items: Array<{ id: number; label: string }> = []
  const visit = (node: MenuNode) => {
    if (node.children?.length) {
      node.children.forEach(visit)
      return
    }
    items.push({
      id: node.id,
      label: resolveMenuDisplayName({ menuName: node.label, i18nKey: node.i18nKey }, t),
    })
  }
  nodes.forEach(visit)
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

// Stable icon map dispatching on i18nKey (locale-independent).
// Top-level group menu i18n keys are stable identifiers; raw `label` may be in any locale.
const GROUP_ICON_BY_I18N_KEY: Record<string, string> = {
  home_page: 'mdi-home',
  permission_management: 'mdi-shield-key',
  permission_configuration: 'mdi-shield-key',
  user_center: 'mdi-account-group',
  backend_user_management: 'mdi-account-group',
  job_search_center: 'mdi-briefcase',
  teaching_center: 'mdi-book-open-variant',
  financial_center: 'mdi-cash',
  resource_center: 'mdi-folder',
  personal_center: 'mdi-account-circle',
}

function inferGroupIcon(node: MenuNode): string {
  const key = node.i18nKey?.trim()
  if (key && GROUP_ICON_BY_I18N_KEY[key]) {
    return GROUP_ICON_BY_I18N_KEY[key]
  }
  return 'mdi-circle-small'
}

const permissionGroups = computed<PermissionGroup[]>(() => {
  return (props.menuTree || [])
    .map((group) => ({
      id: group.id,
      label: resolveMenuDisplayName({ menuName: group.label, i18nKey: group.i18nKey }, t),
      icon: inferGroupIcon(group),
      items: collectLeafItems(group.children?.length ? group.children : [group]),
    }))
    .filter((group) => group.items.length > 0)
})

const isGroupChecked = (group: PermissionGroup) => {
  return group.items.every((item) => formState.menuIds.includes(item.id))
}

const toggleMenu = (menuId: number, checked: boolean) => {
  const next = new Set(formState.menuIds)
  if (checked) next.add(menuId)
  else next.delete(menuId)
  formState.menuIds = Array.from(next)
}

const toggleGroup = (group: PermissionGroup, checked: boolean) => {
  const next = new Set(formState.menuIds)
  for (const item of group.items) {
    if (checked) next.add(item.id)
    else next.delete(item.id)
  }
  formState.menuIds = Array.from(next)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return

    if (props.role) {
      formState.roleId = props.role.roleId
      formState.roleName = props.role.roleName
      formState.roleKey = props.role.roleKey
      formState.roleSort = props.role.roleSort
      formState.remark = props.role.remark || ''
      try {
        const res = await getRoleMenuIds(props.role.roleId)
        formState.menuIds = res.checkedKeys || []
      } catch {
        formState.menuIds = []
      }
      return
    }

    formState.roleId = undefined
    formState.roleName = ''
    formState.roleKey = ''
    formState.roleSort = 1
    formState.remark = ''
    formState.menuIds = []
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const resolveRoleSubmitErrorMessage = (rawMessage: string | undefined, roleName: string, editMode: boolean) => {
  const normalizedRoleName = roleName.trim() || t('this_role')
  const actionLabel = editMode ? t('save') : t('add')
  const messageText = rawMessage || ''

  if (messageText.includes(t('role_name_already_exists'))) {
    return t('role_name_exists_with_name', { name: normalizedRoleName })
  }

  if (messageText.includes(t('role_permission_already_exists'))) {
    return t('role_permission_exists_with_name', { name: normalizedRoleName })
  }

  if (messageText) {
    return t('role_action_failed_with_message', { action: actionLabel, name: normalizedRoleName, message: messageText })
  }

  return t('role_action_failed', { action: actionLabel })
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const payload = {
      ...formState,
      status: '0',
      roleKey: formState.roleKey || formState.roleName.toLowerCase().replace(/\s+/g, '_'),
    }

    if (isEdit.value) {
      await updateRole(payload as any, {
        skipErrorMessage: true,
      })
      message.success(t('role_updated_successfully'))
    } else {
      await addRole(payload, {
        skipErrorMessage: true,
      })
      message.success(t('role_added_successfully'))
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    message.error(resolveRoleSubmitErrorMessage(error?.message, formState.roleName, isEdit.value))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.role-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.role-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

.role-modal__tip {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  margin: 0 0 6px;
}

.role-modal__label {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1e293b);
}

.role-modal__required {
  color: #ef4444;
}

.role-modal__perm-panel {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 8px;
  background: #fff;
}

.role-modal__perm-group {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.role-modal__perm-group-label {
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--text, #1e293b);
}

.role-modal__perm-group-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  font-size: 18px;
  line-height: 1;
}

.role-modal__perm-items {
  display: flex;
  column-gap: 10px;
  row-gap: 4px;
  flex-wrap: wrap;
  padding-left: 20px;
}
</style>
