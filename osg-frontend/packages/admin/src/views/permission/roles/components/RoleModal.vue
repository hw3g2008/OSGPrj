<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="650px"
    max-height="calc(100vh - 80px)"
    body-class="osg-modal-form role-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="role-modal__title">
        <span
          class="mdi role-modal__title-icon"
          :class="isEdit ? 'mdi-key-change' : 'mdi-key-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? t('admin.permission.roles.modal.titleEdit') : t('admin.permission.roles.modal.titleCreate') }}</span>
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
      <a-form-item name="roleName" data-field-name="角色名称">
        <template #label>
          <span class="role-modal__label">{{ t('admin.permission.roles.modal.nameLabel') }}<span class="role-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.roleName" :placeholder="t('admin.permission.roles.modal.namePlaceholder')" />
      </a-form-item>

      <a-form-item name="remark" data-field-name="角色描述">
        <template #label>
          <span class="role-modal__label">{{ t('admin.permission.roles.modal.descLabel') }}</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          :placeholder="t('admin.permission.roles.modal.descPlaceholder')"
          :rows="2"
          :maxlength="200"
        />
      </a-form-item>

      <a-form-item name="menuIds" data-field-name="权限模块">
        <template #label>
          <span class="role-modal__label">{{ t('admin.permission.roles.modal.permsLabel') }}<span class="role-modal__required">*</span></span>
        </template>
        <p class="role-modal__tip" data-content-part="supporting-text">{{ t('admin.permission.roles.modal.permsTip') }}</p>
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
      <a-button @click="handleClose">{{ t('admin.permission.roles.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">{{ t('admin.permission.roles.modal.save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { addRole, getRoleMenuIds, updateRole } from '@/api/role'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

type MenuNode = {
  id: number
  label: string
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

const rules = computed(() => ({
  roleName: [{ required: true, message: t('admin.permission.roles.modal.validNameRequired'), trigger: 'blur' }],
  menuIds: [{ required: true, message: t('admin.permission.roles.modal.validPermsRequired'), trigger: 'change', type: 'array' }],
}))

function collectLeafItems(nodes: MenuNode[] = []): Array<{ id: number; label: string }> {
  const items: Array<{ id: number; label: string }> = []
  const visit = (node: MenuNode) => {
    if (node.children?.length) {
      node.children.forEach(visit)
      return
    }
    items.push({ id: node.id, label: node.label })
  }
  nodes.forEach(visit)
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function inferGroupIcon(label: string): string {
  if (label.includes('首页')) return 'mdi-home' // i18n-skip-line: backend menu label
  if (label.includes('权限')) return 'mdi-shield-key' // i18n-skip-line: backend menu label
  if (label.includes('用户')) return 'mdi-account-group' // i18n-skip-line: backend menu label
  if (label.includes('教学')) return 'mdi-book-open-variant' // i18n-skip-line: backend menu label
  if (label.includes('求职')) return 'mdi-briefcase' // i18n-skip-line: backend menu label
  if (label.includes('财务')) return 'mdi-cash' // i18n-skip-line: backend menu label
  if (label.includes('资源')) return 'mdi-folder' // i18n-skip-line: backend menu label
  if (label.includes('个人')) return 'mdi-account-circle' // i18n-skip-line: backend menu label
  if (label.includes('系统')) return 'mdi-cog' // i18n-skip-line: backend menu label
  return 'mdi-circle-small'
}

const permissionGroups = computed<PermissionGroup[]>(() => {
  return (props.menuTree || [])
    .map((group) => ({
      id: group.id,
      label: group.label,
      icon: inferGroupIcon(group.label),
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

const resolveRoleSubmitErrorMessage = (rawMessage: string | undefined, roleName: string, editMode: boolean): string => {
  const normalizedRoleName = roleName.trim() || t('admin.permission.roles.modal.defaultRoleName')
  const actionLabel = editMode ? t('admin.permission.roles.modal.actionSave') : t('admin.permission.roles.modal.actionCreate')
  const messageText = rawMessage || ''

  if (messageText.includes('角色名称已存在')) { // i18n-skip-line: backend error message comparison
    return t('admin.permission.roles.modal.errorNameExists', { name: normalizedRoleName })
  }

  if (messageText.includes('角色权限已存在')) { // i18n-skip-line: backend error message comparison
    return t('admin.permission.roles.modal.errorPermExists', { name: normalizedRoleName })
  }

  if (messageText) {
    return t('admin.permission.roles.modal.errorWithMsg', { action: actionLabel, name: normalizedRoleName, msg: messageText })
  }

  return t('admin.permission.roles.modal.errorFallback', { action: actionLabel })
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
      message.success(t('admin.permission.roles.modal.updateSuccess'))
    } else {
      await addRole(payload, {
        skipErrorMessage: true,
      })
      message.success(t('admin.permission.roles.modal.createSuccess'))
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
