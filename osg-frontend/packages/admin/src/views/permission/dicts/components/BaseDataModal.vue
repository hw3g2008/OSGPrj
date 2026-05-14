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
        <span>{{ (isEdit ? $t('edit') : $t('add')) + tabLabel }}</span>
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
      <a-form-item name="dictLabel" :data-field-name="nameFieldLabel">
        <template #label>
          <span class="base-data-modal__label">{{ nameFieldLabel }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.dictLabel" :placeholder="$t('please_enter_field', { field: nameFieldLabel })" />
      </a-form-item>

      <a-form-item name="dictValue" :data-field-name="$t('dictionary_key')" :label="$t('dictionary_key')">
        <a-input v-model:value="formState.dictValue" :placeholder="$t('please_enter_dictionary_key')" />
      </a-form-item>

      <a-form-item v-if="parentTabInfo" name="parentValue" :data-field-name="parentFieldLabel">
        <template #label>
          <span class="base-data-modal__label">{{ parentFieldLabel }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-select
          v-model:value="formState.parentValue"
          :placeholder="$t('please_select_field', { field: parentFieldLabel })"
          allow-clear
        >
          <a-select-option
            v-for="item in parentOptions"
            :key="item.dictValue"
            :value="item.dictValue"
          >
            {{ item.dictLabel }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Fix 3: 官网地址字段，company_name Tab 特有，供 Playwright 定位 -->
      <a-form-item
        v-if="props.tab === 'osg_company_name'"
        name="website"
        :data-field-name="$t('website_url')"
        :label="$t('website_url')"
      >
        <a-input v-model:value="formState.website" :placeholder="`${$t('enter_website_url_optional')}）`" />
      </a-form-item>

      <!-- Fix 4: 国家/地区字段，school Tab 特有，供 Playwright 定位 -->
      <a-form-item
        v-if="props.tab === 'osg_school'"
        name="country"
        :data-field-name="$t('country_region')"
        :label="$t('country_region')"
      >
        <a-input v-model:value="formState.country" :placeholder="`${$t('enter_country_region_optional')}）`" />
      </a-form-item>

      <a-form-item :label="$t('sort_order')" name="dictSort" :data-field-name="$t('sort_order')">
        <a-input-number
          v-model:value="formState.dictSort"
          :min="0"
          :placeholder="$t('higher_number_higher_priority')"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item :label="$t('status')" name="status" :data-field-name="$t('status')">
        <a-switch
          v-model:checked="statusChecked"
          :checked-children="$t('enable')"
          :un-checked-children="$t('disable')"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">{{ $t('save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createAdminDictItem, getAdminDictOptions, updateAdminDictItem } from '@/api/adminDict'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
  osg_recruit_cycle: { create: 'modal-new-program', edit: 'modal-edit-program' },
  osg_major_direction: { create: 'modal-new-direction', edit: 'modal-edit-direction' },
  osg_sub_direction: { create: 'modal-new-sub-direction', edit: 'modal-edit-sub-direction' },
}
const nameFieldLabelMap: Record<string, string> = {
  osg_job_category: t('category_name'),
  osg_company_name: t('company_bank_name'),
  osg_region: t('region_name'),
  osg_city: t('region_city_name'),
  osg_recruit_cycle: t('cycle_name'),
  osg_school: t('school_name'),
  osg_major_direction: t('focus_name'),
  osg_sub_direction: t('sub_focus_name'),
  osg_course_type: t('course_type_name'),
  osg_expense_type: t('expense_type_name'),
}
const parentFieldLabelMap: Record<string, string> = {
  osg_company_name: t('company_bank_category'),
  osg_city: t('region_2'),
  osg_sub_direction: t('major_focus_2'),
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

const nameFieldLabel = computed(() => nameFieldLabelMap[props.tab] ?? t('field_name_header', { field: props.tabLabel }))
const parentFieldLabel = computed(() => {
  if (!parentTabInfo.value) return ''
  return parentFieldLabelMap[props.tab] ?? t('parent_field_label', { field: parentTabInfo.value.label })
})

const formState = reactive({
  dictCode: undefined as number | undefined,
  dictLabel: '',
  dictValue: '',
  dictSort: 100,
  status: '0',
  parentValue: undefined as string | undefined,
  website: '',
  country: '',
  type: ''
})

const statusChecked = computed({
  get: () => formState.status === '0',
  set: (val: boolean) => { formState.status = val ? '0' : '1' }
})

const rules = computed(() => ({
  dictLabel: [{ required: true, message: t('please_enter_field', { field: nameFieldLabel.value }), trigger: 'blur' }],
  dictValue: [{ required: true, message: t('please_enter_dictionary_key'), trigger: 'blur' }],
  parentValue: parentTabInfo.value
    ? [{ required: true, message: t('please_select_field', { field: parentFieldLabel.value }), trigger: 'change' }]
    : [],
}))

const loadParentOptions = async () => {
  if (!parentTabInfo.value) {
    parentOptions.value = []
    return
  }
  try {
    parentOptions.value = await getAdminDictOptions(parentTabInfo.value.key)
  } catch (error) {
    parentOptions.value = []
  }
}

const syncFormState = async () => {
  if (props.record) {
    formState.dictCode = props.record.dictCode
    formState.dictLabel = props.record.dictLabel || ''
    formState.dictValue = props.record.dictValue || ''
    formState.dictSort = props.record.dictSort ?? 100
    formState.status = props.record.status || '0'
    formState.parentValue = props.record.parentValue || undefined
    formState.website = props.record.extra?.website || ''
    formState.country = props.record.extra?.country || ''
    formState.type = props.record.extra?.type || ''
  } else {
    formState.dictCode = undefined
    formState.dictLabel = ''
    formState.dictValue = ''
    formState.dictSort = 100
    formState.status = '0'
    formState.parentValue = undefined
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

    const extra: Record<string, string> = {}
    if (formState.website) extra.website = formState.website
    if (formState.country) extra.country = formState.country
    if (formState.type) extra.type = formState.type
    const remark = JSON.stringify({
      parentValue: formState.parentValue,
      extra,
    })

    if (isEdit.value) {
      await updateAdminDictItem({
        dictCode: formState.dictCode!,
        dictType: props.tab,
        dictLabel: formState.dictLabel,
        dictValue: formState.dictValue,
        dictSort: formState.dictSort,
        status: formState.status,
        remark,
      }, {
        customErrorMessage: t('failed_to_update_dictionary_item_please_')
      })
      message.success(t('updated_successfully'))
    } else {
      await createAdminDictItem({
        dictType: props.tab,
        dictLabel: formState.dictLabel,
        dictValue: formState.dictValue,
        dictSort: formState.dictSort,
        status: formState.status,
        remark,
      }, {
        customErrorMessage: t('failed_to_add_dictionary_item_please_che')
      })
      message.success(t('added_successfully'))
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

</style>

