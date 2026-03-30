<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="500px"
    body-class="base-data-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="base-data-modal__title">
        <span
          class="mdi base-data-modal__title-icon"
          :class="isEdit ? 'mdi-database-edit' : 'mdi-database-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? `编辑${tabLabel}` : `新增${tabLabel}` }}</span>
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
      <a-form-item name="name" :data-field-name="nameFieldLabel">
        <template #label>
          <span class="base-data-modal__label">{{ nameFieldLabel }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.name" :placeholder="`请输入${nameFieldLabel}`" />
      </a-form-item>

      <a-form-item v-if="parentTabInfo" name="parentId" :data-field-name="parentFieldLabel">
        <template #label>
          <span class="base-data-modal__label">{{ parentFieldLabel }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-select
          v-model:value="formState.parentId"
          :placeholder="`请选择${parentFieldLabel}`"
          allow-clear
        >
          <a-select-option
            v-for="item in parentOptions"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Fix 3: 官网地址字段，company_name Tab 特有，供 Playwright 定位 -->
      <a-form-item
        v-if="props.tab === 'company_name'"
        name="website"
        data-field-name="官网地址"
        label="官网地址"
      >
        <a-input v-model:value="formState.website" placeholder="请输入官网地址（选填）" />
      </a-form-item>

      <!-- Fix 4: 国家/地区字段，school Tab 特有，供 Playwright 定位 -->
      <a-form-item
        v-if="props.tab === 'school'"
        name="country"
        data-field-name="国家/地区"
        label="国家/地区"
      >
        <a-input v-model:value="formState.country" placeholder="请输入国家/地区（选填）" />
      </a-form-item>

      <!-- Fix 5: Type 字段，company_type Tab 特有（英文字段名），供 Playwright 定位 -->
      <a-form-item
        v-if="props.tab === 'company_type'"
        name="type"
        data-field-name="Type"
        label="Type"
      >
        <a-input v-model:value="formState.type" placeholder="请输入 Type（选填）" />
      </a-form-item>

      <a-form-item label="排序" name="sort" data-field-name="排序">
        <a-input-number
          v-model:value="formState.sort"
          :min="0"
          placeholder="数字越大越靠前"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="状态" name="status" data-field-name="状态">
        <a-switch
          v-model:checked="statusChecked"
          checked-children="启用"
          un-checked-children="禁用"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <div data-content-part="action-row" class="base-data-modal__actions">
        <a-button class="base-data-modal__cancel-btn" data-surface-part="cancel-control" @click="handleClose">取消</a-button>
        <a-button type="primary" class="base-data-modal__confirm-btn" :loading="loading" @click="handleSubmit">
          <span class="mdi mdi-check" aria-hidden="true" />
          <span>保存</span>
        </a-button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addBaseData, updateBaseData, getBaseDataList } from '@/api/baseData'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = defineProps<{
  visible: boolean
  category: string
  record: any
  tab: string
  tabLabel: string
  currentTabs: { key: string; label: string; hasParent?: boolean; parentTab?: string }[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const loading = ref(false)
const parentOptions = ref<any[]>([])
const surfaceIdMap: Record<string, { create: string; edit: string }> = {
  recruit_cycle: { create: 'modal-new-program', edit: 'modal-edit-program' },
  major_direction: { create: 'modal-new-direction', edit: 'modal-edit-direction' },
  sub_direction: { create: 'modal-new-sub-direction', edit: 'modal-edit-sub-direction' },
}
const nameFieldLabelMap: Record<string, string> = {
  job_category: '分类名称',
  company_name: '公司/银行名称',
  company_type: '类别名称',
  region: '大区名称',
  city: '地区/城市名称',
  recruit_cycle: '周期名称',
  school: '学校名称',
  major_direction: '方向名称',
  sub_direction: '子方向名称',
  course_type: '课程类型名称',
  expense_type: '报销类型名称',
}
const parentFieldLabelMap: Record<string, string> = {
  company_name: '所属公司/银行类别',
  city: '所属大区',
  sub_direction: '所属主攻方向',
}

const isEdit = computed(() => !!props.record)
const normalizedTab = computed(() => props.tab.replace(/_/g, '-'))
const surfaceId = computed(() => {
  const mapped = surfaceIdMap[props.tab]
  if (mapped) return isEdit.value ? mapped.edit : mapped.create
  return isEdit.value ? `modal-edit-${normalizedTab.value}` : `modal-new-${normalizedTab.value}`
})

const currentTabConfig = computed(() => {
  return props.currentTabs.find(t => t.key === props.tab)
})

const parentTabInfo = computed(() => {
  const cfg = currentTabConfig.value
  if (!cfg?.hasParent || !cfg.parentTab) return null
  const parentTab = props.currentTabs.find(t => t.key === cfg.parentTab)
  return parentTab ? { key: cfg.parentTab, label: parentTab.label } : null
})

const nameFieldLabel = computed(() => nameFieldLabelMap[props.tab] ?? `${props.tabLabel}名称`)
const parentFieldLabel = computed(() => {
  if (!parentTabInfo.value) return ''
  return parentFieldLabelMap[props.tab] ?? `所属${parentTabInfo.value.label}`
})

const formState = reactive({
  id: undefined as number | undefined,
  name: '',
  sort: 100,
  status: '0',
  parentId: undefined as number | undefined,
  website: '',
  country: '',
  type: ''
})

const statusChecked = computed({
  get: () => formState.status === '0',
  set: (val: boolean) => { formState.status = val ? '0' : '1' }
})

const rules = computed(() => ({
  name: [{ required: true, message: `请输入${nameFieldLabel.value}`, trigger: 'blur' }],
  parentId: parentTabInfo.value
    ? [{ required: true, message: `请选择${parentFieldLabel.value}`, trigger: 'change' }]
    : [],
}))

const loadParentOptions = async () => {
  if (!parentTabInfo.value) {
    parentOptions.value = []
    return
  }
  try {
    const res = await getBaseDataList({
      pageNum: 1,
      pageSize: 999,
      category: props.category,
      tab: parentTabInfo.value.key,
      status: '0'
    })
    parentOptions.value = res.rows || []
  } catch (error) {
    parentOptions.value = []
  }
}

const syncFormState = async () => {
  if (props.record) {
    formState.id = props.record.id
    formState.name = props.record.name || ''
    formState.sort = props.record.sort ?? 100
    formState.status = props.record.status || '0'
    formState.parentId = props.record.parentId || undefined
    formState.website = props.record.website || ''
    formState.country = props.record.country || ''
    formState.type = props.record.type || ''
  } else {
    formState.id = undefined
    formState.name = ''
    formState.sort = 100
    formState.status = '0'
    formState.parentId = undefined
    formState.website = ''
    formState.country = ''
    formState.type = ''
  }

  await loadParentOptions()
  await nextTick()
  formRef.value?.clearValidate?.()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    void syncFormState()
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (isEdit.value) {
      await updateBaseData({
        id: formState.id!,
        name: formState.name,
        sort: formState.sort,
        status: formState.status,
        parentId: formState.parentId,
        website: formState.website || undefined,
        country: formState.country || undefined,
        type: formState.type || undefined
      }, {
        customErrorMessage: '基础数据修改失败，请检查输入信息'
      })
      message.success('修改成功')
    } else {
      await addBaseData({
        name: formState.name,
        category: props.category,
        tab: props.tab,
        sort: formState.sort,
        status: formState.status,
        parentId: formState.parentId,
        website: formState.website || undefined,
        country: formState.country || undefined,
        type: formState.type || undefined
      }, {
        customErrorMessage: '基础数据新增失败，请检查输入信息'
      })
      message.success('新增成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error.errorFields) return
    // 移除组件内的错误提示，让拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.base-data-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.base-data-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

.base-data-modal__label {
  display: inline-flex;
  align-items: center;
  color: var(--text, #1e293b);
  font-size: 14px;
  font-weight: 600;
}

.base-data-modal__required {
  color: #ef4444;
}

.base-data-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.base-data-modal__cancel-btn {
  min-width: 80px;
  border-color: var(--border, #d0d7e2);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.base-data-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
