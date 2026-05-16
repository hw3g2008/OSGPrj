<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="500px"
    body-class="osg-modal-form base-data-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="base-data-modal__title">
        <span
          class="mdi base-data-modal__title-icon"
          :class="isEdit ? 'mdi-database-edit' : 'mdi-database-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? t('admin.permission.dicts.modal.titleEdit', { label: tabLabel }) : t('admin.permission.dicts.modal.titleCreate', { label: tabLabel }) }}</span>
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
        <a-input v-model:value="formState.dictLabel" :placeholder="t('admin.permission.dicts.modal.nameInputPlaceholder', { field: nameFieldLabel })" />
      </a-form-item>

      <a-form-item name="dictValue" data-field-name="字典键值"><!-- i18n-skip-line: playwright selector -->
        <template #label>
          <span class="base-data-modal__label">{{ t('admin.permission.dicts.modal.dictValueLabel') }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.dictValue" :placeholder="t('admin.permission.dicts.modal.dictValuePlaceholder')" />
      </a-form-item>

      <a-form-item v-if="parentTabInfo" name="parentValue" :data-field-name="parentFieldLabel">
        <template #label>
          <span class="base-data-modal__label">{{ parentFieldLabel }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-select
          v-model:value="formState.parentValue"
          :placeholder="t('admin.permission.dicts.modal.parentSelectPlaceholder', { field: parentFieldLabel })"
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
        :label="t('admin.permission.dicts.modal.websiteLabel')"
        data-field-name="官网地址"><!-- i18n-skip-line: playwright selector -->
        <a-input v-model:value="formState.website" :placeholder="t('admin.permission.dicts.modal.websitePlaceholder')" />
      </a-form-item>

      <!-- 国家/地区字段，school Tab 特有，下拉来自 osg_region 字典 -->
      <a-form-item
        v-if="props.tab === 'osg_school'"
        name="country"
        :label="t('admin.permission.dicts.modal.countryLabel')"
        data-field-name="国家/地区"><!-- i18n-skip-line: playwright selector -->
        <a-select
          v-model:value="formState.country"
          :placeholder="t('admin.permission.dicts.modal.countryPlaceholder')"
          allow-clear
          :options="regionOptions"
        />
      </a-form-item>

      <!-- 国际电话区号字段，country_code Tab 特有 -->
      <a-form-item
        v-if="props.tab === 'osg_country_code'"
        name="callingCode"
        data-field-name="国际区号"><!-- i18n-skip-line: playwright selector -->
        <template #label>
          <span class="base-data-modal__label">{{ t('admin.permission.dicts.modal.callingCodeLabel') }}<span class="base-data-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.callingCode" :placeholder="t('admin.permission.dicts.modal.callingCodePlaceholder')" />
      </a-form-item>

      <a-form-item :label="t('admin.permission.dicts.modal.sortLabel')" name="dictSort" data-field-name="排序"><!-- i18n-skip-line: playwright selector -->
        <a-input-number
          v-model:value="formState.dictSort"
          :min="0"
          :placeholder="t('admin.permission.dicts.modal.sortPlaceholder')"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item :label="t('admin.permission.dicts.modal.statusLabel')" name="status" data-field-name="状态"><!-- i18n-skip-line: playwright selector -->
        <a-switch
          v-model:checked="statusChecked"
          :checked-children="t('admin.permission.dicts.modal.statusEnabled')"
          :un-checked-children="t('admin.permission.dicts.modal.statusDisabled')"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.permission.dicts.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">{{ t('admin.permission.dicts.modal.save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { createAdminDictItem, getAdminDictOptions, updateAdminDictItem } from '@/api/adminDict'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t, te } = useI18n()

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
const regionOptions = ref<{ value: string; label: string }[]>([])
const surfaceIdMap: Record<string, { create: string; edit: string }> = {
  osg_recruit_cycle: { create: 'modal-new-program', edit: 'modal-edit-program' },
  osg_major_direction: { create: 'modal-new-direction', edit: 'modal-edit-direction' },
  osg_sub_direction: { create: 'modal-new-sub-direction', edit: 'modal-edit-sub-direction' },
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

const nameFieldLabel = computed(() => {
  const key = `admin.permission.dicts.modal.nameLabelMap.${props.tab}`
  return te(key) ? t(key as never) : t('admin.permission.dicts.modal.nameFallback', { label: props.tabLabel })
})

const parentFieldLabel = computed(() => {
  if (!parentTabInfo.value) return ''
  const key = `admin.permission.dicts.modal.parentLabelMap.${props.tab}`
  return te(key) ? t(key as never) : t('admin.permission.dicts.modal.parentFallback', { label: parentTabInfo.value.label })
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
  type: '',
  callingCode: '',
})

const statusChecked = computed({
  get: () => formState.status === '0',
  set: (val: boolean) => { formState.status = val ? '0' : '1' }
})

const rules = computed(() => ({
  dictLabel: [{ required: true, message: t('admin.permission.dicts.modal.validNameRequired', { field: nameFieldLabel.value }), trigger: 'blur' }],
  // 字典键值是机器标识符，与后端 SQL 类型及代码 switch 联动；需严格限制为标识符格式
  dictValue: [
    { required: true, message: t('admin.permission.dicts.modal.validDictValueRequired'), trigger: 'blur' },
    {
      pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
      message: t('admin.permission.dicts.modal.validDictValuePattern'),
      trigger: 'blur',
    },
  ],
  parentValue: parentTabInfo.value
    ? [{ required: true, message: t('admin.permission.dicts.modal.validParentRequired', { field: parentFieldLabel.value }), trigger: 'change' }]
    : [],
  callingCode: props.tab === 'osg_country_code'
    ? [
        { required: true, message: t('admin.permission.dicts.modal.validCallingCodeRequired'), trigger: 'blur' },
        {
          pattern: /^\+\d{1,4}$/,
          message: t('admin.permission.dicts.modal.validCallingCodePattern'),
          trigger: 'blur',
        },
      ]
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

const loadRegionOptions = async () => {
  if (props.tab !== 'osg_school') {
    regionOptions.value = []
    return
  }
  try {
    const rows = await getAdminDictOptions('osg_region')
    regionOptions.value = (rows || [])
      .filter((r: any) => r.status === '0')
      .map((r: any) => ({ value: r.dictValue, label: r.dictLabel }))
  } catch (error) {
    regionOptions.value = []
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
    formState.callingCode = props.record.extra?.callingCode || ''
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
    formState.callingCode = ''
  }

  await Promise.all([loadParentOptions(), loadRegionOptions()])
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
    if (formState.callingCode) extra.callingCode = formState.callingCode
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
        customErrorMessage: t('admin.permission.dicts.modal.updateError')
      })
      message.success(t('admin.permission.dicts.modal.updateSuccess'))
    } else {
      await createAdminDictItem({
        dictType: props.tab,
        dictLabel: formState.dictLabel,
        dictValue: formState.dictValue,
        dictSort: formState.dictSort,
        status: formState.status,
        remark,
      }, {
        customErrorMessage: t('admin.permission.dicts.modal.createError')
      })
      message.success(t('admin.permission.dicts.modal.createSuccess'))
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
