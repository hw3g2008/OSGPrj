<template>
  <OverlaySurfaceModal
    surface-id="modal-role-menu-tree"
    :open="visible"
    width="720px"
    max-height="90vh"
    @cancel="handleClose"
  >
    <template #title>
      <span class="role-tree-modal__title">
        <span class="mdi mdi-account-key role-tree-modal__title-icon" aria-hidden="true" />
        <span>配置菜单树</span>
      </span>
    </template>

    <div class="role-tree-modal__meta">
      <div class="role-tree-modal__meta-card">
        <span class="role-tree-modal__meta-label">角色名称</span>
        <strong>{{ role?.roleName || '未选择角色' }}</strong>
      </div>
      <div class="role-tree-modal__meta-card">
        <span class="role-tree-modal__meta-label">角色 Key</span>
        <strong>{{ role?.roleKey || '--' }}</strong>
      </div>
    </div>

    <p class="role-tree-modal__tip">
      勾选目录会级联选中子菜单；勾选按钮权限后，前端 <code>v-hasPermi</code> 与后端
      <code>@PreAuthorize</code> 将使用相同的 <code>perms</code> Key。
    </p>
    <p class="role-tree-modal__hint">典型按钮节点包括：新增菜单、编辑菜单、删除菜单。</p>

    <div id="role-menu-tree" class="role-tree-modal__tree" data-content-part="tree-shell">
      <section
        v-for="group in menuTree"
        :key="group.id"
        class="role-tree-modal__group"
      >
        <label class="role-tree-modal__group-label">
          <input
            type="checkbox"
            :checked="isGroupChecked(group)"
            @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
          />
          <span class="mdi" :class="inferGroupIcon(group.label)" aria-hidden="true" />
          <span>{{ group.label }}</span>
        </label>

        <div class="role-tree-modal__children">
          <template v-for="node in group.children || []" :key="node.id">
            <label class="role-tree-modal__node-label role-tree-modal__node-label--menu">
              <input
                type="checkbox"
                :checked="selectedMenuIds.includes(node.id)"
                @change="toggleNode(node.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="mdi mdi-view-list" aria-hidden="true" />
              <span>{{ node.label }}</span>
            </label>

            <div v-if="node.children?.length" class="role-tree-modal__grand-children">
              <label
                v-for="child in node.children"
                :key="child.id"
                class="role-tree-modal__node-label role-tree-modal__node-label--action"
              >
                <input
                  type="checkbox"
                  :checked="selectedMenuIds.includes(child.id)"
                  @change="toggleNode(child.id, ($event.target as HTMLInputElement).checked)"
                />
                <span class="mdi mdi-radiobox-marked" aria-hidden="true" />
                <span>{{ child.label }}</span>
              </label>
            </div>
          </template>
        </div>
      </section>
    </div>

    <template #footer>
      <button type="button" class="btn btn-outline" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" @click="handleSubmit">保存授权</button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

type MenuNode = {
  id: number
  label: string
  children?: MenuNode[]
}

const props = defineProps<{
  visible: boolean
  role: any
  menuTree: MenuNode[]
  checkedKeys?: number[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [menuIds: number[]]
  success: []
}>()

const selectedMenuIds = ref<number[]>([])

watch(
  () => [props.visible, props.checkedKeys] as const,
  ([visible, checkedKeys]) => {
    if (!visible) return
    selectedMenuIds.value = Array.isArray(checkedKeys) ? [...checkedKeys] : []
  },
  { immediate: true },
)

function inferGroupIcon(label: string) {
  if (label.includes('权限')) return 'mdi-folder-key'
  if (label.includes('用户')) return 'mdi-account-group'
  return 'mdi-folder-key'
}

function collectNodeIds(node: MenuNode): number[] {
  return [node.id, ...(node.children?.flatMap(collectNodeIds) || [])]
}

function isGroupChecked(group: MenuNode) {
  const ids = collectNodeIds(group)
  return ids.every((id) => selectedMenuIds.value.includes(id))
}

function toggleNode(menuId: number, checked: boolean) {
  const next = new Set(selectedMenuIds.value)
  if (checked) next.add(menuId)
  else next.delete(menuId)
  selectedMenuIds.value = Array.from(next)
}

function toggleGroup(group: MenuNode, checked: boolean) {
  const ids = collectNodeIds(group)
  const next = new Set(selectedMenuIds.value)
  ids.forEach((id) => {
    if (checked) next.add(id)
    else next.delete(id)
  })
  selectedMenuIds.value = Array.from(next)
}

function handleClose() {
  emit('update:visible', false)
}

function handleSubmit() {
  emit('submit', [...selectedMenuIds.value])
  emit('success')
  handleClose()
}
</script>

<style scoped lang="scss">
.role-tree-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.role-tree-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

.role-tree-modal__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.role-tree-modal__meta-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-tree-modal__meta-label {
  font-size: 12px;
  color: #94a3b8;
}

.role-tree-modal__tip {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 13px;
  line-height: 1.6;

  code {
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.75);
  }
}

.role-tree-modal__hint {
  margin: -4px 0 16px;
  color: #64748b;
  font-size: 12px;
}

.role-tree-modal__tree {
  max-height: 420px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}

.role-tree-modal__group + .role-tree-modal__group {
  margin-top: 16px;
}

.role-tree-modal__group-label,
.role-tree-modal__node-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  cursor: pointer;
}

.role-tree-modal__group-label {
  font-weight: 700;
  margin-bottom: 12px;
}

.role-tree-modal__children {
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-tree-modal__grand-children {
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-tree-modal__node-label--menu {
  font-weight: 600;
}

.role-tree-modal__node-label--action {
  color: #475569;
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
