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
        <span>{{ isEdit ? '编辑角色' : '新增角色' }}</span>
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
      <a-form-item name="roleName">
        <template #label>
          <span class="role-modal__label">角色名称<span class="role-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.roleName" placeholder="请输入角色名称，如：运营专员" />
      </a-form-item>

      <a-form-item name="remark">
        <template #label>
          <span class="role-modal__label">角色描述</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          placeholder="请输入角色描述，最多200字"
          :rows="2"
          :maxlength="200"
        />
      </a-form-item>

      <a-form-item name="menuIds">
        <template #label>
          <span class="role-modal__label">权限模块<span class="role-modal__required">*</span></span>
        </template>
        <p class="role-modal__tip" data-content-part="supporting-text">勾选该角色可访问的功能模块，点击分组名称可全选/取消该分组</p>
        <div class="role-modal__perm-panel">
          <section
            v-for="group in permissionGroups"
            :key="group.id"
            class="role-modal__perm-group"
          >
            <label class="role-modal__perm-group-label">
              <input
                class="role-modal__perm-group-checkbox"
                type="checkbox"
                :checked="isGroupChecked(group)"
                :indeterminate="false"
                @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
              />
              <span
                class="mdi role-modal__perm-group-icon"
                :class="group.icon"
                aria-hidden="true"
              />
              <span>{{ group.label }}</span>
            </label>

            <div class="role-modal__perm-items">
              <label
                v-for="item in group.items"
                :key="item.id"
                class="role-modal__perm-item"
              >
                <input
                  type="checkbox"
                  :checked="formState.menuIds.includes(item.id)"
                  @change="toggleMenu(item.id, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ item.label }}</span>
              </label>
            </div>
          </section>
        </div>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button class="role-modal__cancel-btn" @click="handleClose">取消</a-button>
      <a-button class="role-modal__confirm-btn" :loading="loading" @click="handleSubmit">
        <span class="mdi mdi-check" aria-hidden="true" />
        <span>保存</span>
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addRole, getRoleMenuIds, updateRole } from '@/api/role'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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

const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  menuIds: [{ required: true, message: '请选择权限模块', trigger: 'change', type: 'array' }],
}

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
  if (label.includes('权限')) return 'mdi-shield-key'
  if (label.includes('用户')) return 'mdi-account-group'
  if (label.includes('课程')) return 'mdi-book-open-variant'
  if (label.includes('求职')) return 'mdi-briefcase'
  if (label.includes('财务')) return 'mdi-cash'
  if (label.includes('资源')) return 'mdi-folder'
  if (label.includes('系统')) return 'mdi-cog'
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
        customErrorMessage: '角色修改失败，请检查输入信息' 
      })
      message.success('角色修改成功')
    } else {
      await addRole(payload, { 
        customErrorMessage: '角色新增失败，请检查输入信息' 
      })
      message.success('角色新增成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    // 移除组件内的错误提示，让拦截器处理
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

.role-modal__body {
  max-height: 434px;
  padding-bottom: 18px;

  :deep(.ant-form-item) {
    margin-bottom: 4px;
  }
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
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
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

.role-modal__perm-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--text-secondary, #475569);
}

.role-modal__cancel-btn {
  border-color: var(--border, #d0d7e2);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  min-width: 80px;
}

.role-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 96px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  background: var(--primary-gradient, linear-gradient(135deg, #4f46e5, #8b5cf6));
  box-shadow: none;

  &:hover,
  &:focus {
    color: #fff;
    background: var(--primary-gradient, linear-gradient(135deg, #4f46e5, #8b5cf6));
    opacity: 0.96;
  }
}
</style>
