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
        <span>{{ $t('configure_menu_tree') }}</span>
      </span>
    </template>

    <div class="role-tree-modal__meta">
      <div class="role-tree-modal__meta-card">
        <span class="role-tree-modal__meta-label">{{ $t('role_name') }}</span>
        <strong>{{ role?.roleName || $t('no_role_selected') }}</strong>
      </div>
      <div class="role-tree-modal__meta-card">
        <span class="role-tree-modal__meta-label">{{ $t('role') }} Key</span>
        <strong>{{ role?.roleKey || '--' }}</strong>
      </div>
    </div>

    <p class="role-tree-modal__tip">
      {{ $t('selecting_a_directory_automatically_sele') }}。
    </p>

    <div id="role-menu-tree" class="role-tree-modal__tree" data-content-part="tree-shell">
      <section
        v-for="group in menuTree"
        :key="group.id"
        class="role-tree-modal__group"
      >
        <div class="role-tree-modal__group-label">
          <a-checkbox
            :checked="isGroupChecked(group)"
            @change="(e: any) => toggleGroup(group, e.target.checked)"
          >
            <span class="mdi" :class="inferGroupIcon(group)" aria-hidden="true" />
            <span>{{ displayLabel(group) }}</span>
          </a-checkbox>
        </div>

        <div class="role-tree-modal__children">
          <template v-for="node in group.children || []" :key="node.id">
            <div class="role-tree-modal__node-label role-tree-modal__node-label--menu">
              <a-checkbox
                :checked="selectedMenuIds.includes(node.id)"
                @change="(e: any) => toggleNode(node.id, e.target.checked)"
              >
                <span class="mdi mdi-view-list" aria-hidden="true" />
                <span>{{ displayLabel(node) }}</span>
              </a-checkbox>
            </div>

            <div v-if="node.children?.length" class="role-tree-modal__grand-children">
              <a-checkbox
                v-for="child in node.children"
                :key="child.id"
                :checked="selectedMenuIds.includes(child.id)"
                @change="(e: any) => toggleNode(child.id, e.target.checked)"
              >
                <span class="mdi mdi-radiobox-marked" aria-hidden="true" />
                <span>{{ displayLabel(child) }}</span>
              </a-checkbox>
            </div>
          </template>
        </div>
      </section>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" @click="handleSubmit">{{ $t('save_permissions') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

const displayLabel = (node: MenuNode) =>
  resolveMenuDisplayName({ menuName: node.label, i18nKey: node.i18nKey }, t)

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

// Stable icon map dispatching on i18nKey (locale-independent).
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

function inferGroupIcon(node: MenuNode) {
  const key = node.i18nKey?.trim()
  if (key && GROUP_ICON_BY_I18N_KEY[key]) {
    return GROUP_ICON_BY_I18N_KEY[key]
  }
  return 'mdi-circle-small'
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

.role-tree-modal__group-label {
  font-weight: 700;
  margin-bottom: 12px;
  color: #1e293b;
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
</style>
