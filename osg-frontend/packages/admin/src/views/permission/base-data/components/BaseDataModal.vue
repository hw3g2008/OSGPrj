<template>
  <a-modal
    :open="visible"
    :title="isEdit ? `编辑${tabLabel}` : `新增${tabLabel}`"
    width="500px"
    @cancel="handleClose"
    @ok="handleSubmit"
    :confirmLoading="loading"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
    >
      <a-form-item label="名称" name="name">
        <a-input v-model:value="formState.name" :placeholder="`请输入${tabLabel}名称`" />
      </a-form-item>

      <a-form-item v-if="parentTabInfo" :label="parentTabInfo.label" name="parentId">
        <a-select
          v-model:value="formState.parentId"
          :placeholder="`请选择${parentTabInfo.label}`"
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

      <a-form-item label="排序" name="sort">
        <a-input-number
          v-model:value="formState.sort"
          :min="0"
          placeholder="数字越大越靠前"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="状态" name="status">
        <a-switch
          v-model:checked="statusChecked"
          checked-children="启用"
          un-checked-children="禁用"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { addBaseData, updateBaseData, getBaseDataList } from '@/api/baseData'

const props = defineProps<{
  visible: boolean
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

const isEdit = computed(() => !!props.record)

const currentTabConfig = computed(() => {
  return props.currentTabs.find(t => t.key === props.tab)
})

const parentTabInfo = computed(() => {
  const cfg = currentTabConfig.value
  if (!cfg?.hasParent || !cfg.parentTab) return null
  const parentTab = props.currentTabs.find(t => t.key === cfg.parentTab)
  return parentTab ? { key: cfg.parentTab, label: parentTab.label } : null
})

const formState = reactive({
  id: undefined as number | undefined,
  name: '',
  sort: 100,
  status: '0',
  parentId: undefined as number | undefined
})

const statusChecked = computed({
  get: () => formState.status === '0',
  set: (val: boolean) => { formState.status = val ? '0' : '1' }
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

const loadParentOptions = async () => {
  if (!parentTabInfo.value) {
    parentOptions.value = []
    return
  }
  try {
    const res = await getBaseDataList({
      pageNum: 1,
      pageSize: 999,
      tab: parentTabInfo.value.key,
      status: '0'
    })
    parentOptions.value = res.rows || []
  } catch (error) {
    parentOptions.value = []
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.record) {
      formState.id = props.record.id
      formState.name = props.record.name || ''
      formState.sort = props.record.sort ?? 100
      formState.status = props.record.status || '0'
      formState.parentId = props.record.parentId || undefined
    } else {
      formState.id = undefined
      formState.name = ''
      formState.sort = 100
      formState.status = '0'
      formState.parentId = undefined
    }
    loadParentOptions()
  }
})

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
        parentId: formState.parentId
      })
      message.success('修改成功')
    } else {
      await addBaseData({
        name: formState.name,
        category: '',
        tab: props.tab,
        sort: formState.sort,
        status: formState.status,
        parentId: formState.parentId
      })
      message.success('新增成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error.errorFields) return
    message.error(error.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>
