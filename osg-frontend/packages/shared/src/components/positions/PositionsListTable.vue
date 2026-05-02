<template>
  <a-table
    class="osg-positions-list-table"
    :columns="effectiveColumns"
    :data-source="positions"
    :row-key="(r: PositionTableRow) => r.positionId"
    :pagination="pagination ?? false"
    :loading="loading"
    :scroll="{ x: 1400 }"
    size="small"
    @change="handleChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.dataIndex === 'positionName' || column.key === 'positionName'">
        <a
          v-if="record.positionUrl"
          :href="record.positionUrl"
          target="_blank"
          rel="noreferrer"
          class="osg-positions-list-table__title-link"
        >
          {{ record.positionName }}
          <i class="mdi mdi-open-in-new" aria-hidden="true" />
        </a>
        <span v-else class="osg-positions-list-table__title">{{ record.positionName }}</span>
      </template>

      <template v-else-if="column.dataIndex === 'companyName' || column.key === 'companyName'">
        <a-space :size="8" align="center">
          <div
            :class="['osg-positions-list-table__logo', resolveLogoToneClass(record)]"
            :style="record.logoColor ? { background: record.logoColor } : undefined"
          >
            {{ resolveLogoText(record) }}
          </div>
          <a
            v-if="record.companyWebsite"
            :href="record.companyWebsite"
            target="_blank"
            rel="noreferrer"
            class="osg-positions-list-table__company-link"
          >
            {{ record.companyName }}
            <i class="mdi mdi-open-in-new" aria-hidden="true" />
          </a>
          <span v-else>{{ record.companyName }}</span>
        </a-space>
      </template>

      <template v-else-if="column.dataIndex === 'industry' || column.key === 'industry'">
        <span
          v-if="record.industry"
          :class="['osg-industry-tag', `osg-industry-tag--${record.industryTone || 'slate'}`]"
        >
          {{ record.industry }}
        </span>
        <span v-else class="osg-positions-list-table__muted">未归类</span>
      </template>

      <template v-else-if="column.dataIndex === 'positionCategory' || column.key === 'positionCategory'">
        {{ record.positionCategory || '-' }}
      </template>

      <template v-else-if="column.dataIndex === 'location' || column.key === 'location'">
        {{ record.location || '-' }}
      </template>

      <template v-else-if="column.dataIndex === 'recruitmentCycle' || column.key === 'recruitmentCycle'">
        <a-tag v-if="record.recruitmentCycle" :color="record.recruitmentCycleTone || 'purple'">
          {{ record.recruitmentCycle }}
        </a-tag>
        <span v-else class="osg-positions-list-table__muted">-</span>
      </template>

      <template v-else-if="column.dataIndex === 'publishTime' || column.key === 'publishTime'">
        {{ record.publishTime || '-' }}
      </template>

      <template v-else-if="column.dataIndex === 'deadline' || column.key === 'deadline'">
        <span :class="resolveDeadlineToneClass(record.deadlineTone)">
          {{ record.deadline || '-' }}
        </span>
      </template>

      <template v-else-if="column.dataIndex === 'studentCount' || column.key === 'studentCount'">
        <a-button
          v-if="Number(record.studentCount || 0) > 0"
          type="link"
          size="small"
          @click="emit('openStudents', record)"
        >
          {{ record.studentCount }}人
        </a-button>
        <span v-else class="osg-positions-list-table__muted">0人</span>
      </template>

      <template v-else-if="column.dataIndex === 'targetMajors' || column.key === 'targetMajors'">
        <template v-if="record.targetMajors">
          <a-tag v-for="m in splitCsv(record.targetMajors)" :key="m" color="cyan">{{ m }}</a-tag>
        </template>
        <span v-else class="osg-positions-list-table__muted">-</span>
      </template>

      <template v-else-if="column.dataIndex === 'myStudentCount' || column.key === 'myStudentCount'">
        <a-button
          v-if="Number(record.myStudentCount || 0) > 0"
          type="link"
          size="small"
          @click="emit('openStudents', record)"
        >
          {{ record.myStudentCount }}人
        </a-button>
        <span v-else class="osg-positions-list-table__muted">0人</span>
      </template>

      <!-- 其他列：优先父组件 slot 透传；没有 slot 时回退为 record[dataIndex] 文本 -->
      <template v-else>
        <slot name="bodyCell" :column="column" :record="record">
          {{ resolveFallbackText(record, column) }}
        </slot>
      </template>
    </template>
  </a-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { PositionTableRow } from './types'
import {
  resolveLogoText,
  resolveLogoToneClass,
  deadlineToneClass as resolveDeadlineToneClassUtil,
} from '../../utils/positionsTone'

/**
 * PositionsListTable — 岗位列表视图（list 模式）
 *
 * 两端共用的 9 列岗位表：
 *   岗位名称 / 公司 / 行业 / 岗位分类 / 地区 / 招聘周期 / 发布时间 / 截止时间 / 我的学员
 *
 * 数据：父组件预处理 raw API 行 → PositionTableRow[]（统一 shape）
 *
 * 用法：
 *   <PositionsListTable
 *     :positions="rows"
 *     :pagination="paginationConfig"
 *     @open-students="handleOpenStudents"
 *   />
 *
 * 自定义列（如发布时间排序）：传入 :columns 覆盖默认列定义。
 */

interface ColumnConfig {
  title: string
  dataIndex?: string
  key: string
  width?: number
  fixed?: 'left' | 'right'
  ellipsis?: boolean
  sorter?: boolean
  sortOrder?: 'ascend' | 'descend' | null
  sortDirections?: readonly ('ascend' | 'descend')[]
}

const props = withDefaults(
  defineProps<{
    /** 岗位行数据（已经预处理好的 PositionTableRow） */
    positions: PositionTableRow[]
    /** 分页配置；传 false 关闭分页 */
    pagination?: TablePaginationConfig | false
    /** loading 状态 */
    loading?: boolean
    /** 自定义列定义（覆盖默认 9 列）；不传时用 DEFAULT_COLUMNS */
    columns?: ColumnConfig[]
  }>(),
  {
    pagination: false,
    loading: false,
    columns: undefined,
  },
)

const emit = defineEmits<{
  /** 用户操作分页 / 排序 / 筛选时触发（透传 a-table change 事件） */
  change: [
    pagination: TablePaginationConfig,
    filters: Record<string, unknown>,
    sorter: unknown,
  ]
  /** 用户点击"X 人"链接，请求打开学员 modal */
  openStudents: [row: PositionTableRow]
}>()

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { title: '岗位名称', key: 'positionName', dataIndex: 'positionName', width: 240, fixed: 'left' },
  { title: '公司', key: 'companyName', dataIndex: 'companyName', width: 200 },
  { title: '行业', key: 'industry', dataIndex: 'industry', width: 130 },
  { title: '岗位分类', key: 'positionCategory', dataIndex: 'positionCategory', width: 110 },
  { title: '地区', key: 'location', dataIndex: 'location', width: 130 },
  { title: '招聘周期', key: 'recruitmentCycle', dataIndex: 'recruitmentCycle', width: 110 },
  { title: '主攻方向', key: 'targetMajors', dataIndex: 'targetMajors', width: 140 },
  { title: '发布时间', key: 'publishTime', dataIndex: 'publishTime', width: 110 },
  { title: '截止时间', key: 'deadline', dataIndex: 'deadline', width: 110 },
  { title: '我的学员', key: 'studentCount', dataIndex: 'studentCount', width: 100, fixed: 'right' },
]

const effectiveColumns = computed<ColumnConfig[]>(() => props.columns ?? DEFAULT_COLUMNS)

function handleChange(
  pagination: TablePaginationConfig,
  filters: Record<string, unknown>,
  sorter: unknown,
) {
  emit('change', pagination, filters, sorter)
}

function resolveDeadlineToneClass(tone?: 'normal' | 'urgent' | 'closed'): string {
  return resolveDeadlineToneClassUtil(tone)
}

function splitCsv(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function resolveFallbackText(record: PositionTableRow, column: ColumnConfig): string {
  const key = column.dataIndex || column.key
  if (!key) return '-'
  const value = (record as unknown as Record<string, unknown>)[key]
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}
</script>

<style scoped lang="scss">
.osg-positions-list-table__title-link,
.osg-positions-list-table__company-link {
  color: #1f2937;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.osg-positions-list-table__title-link:hover,
.osg-positions-list-table__company-link:hover {
  color: #1677ff;
}

.osg-positions-list-table__title-link .mdi,
.osg-positions-list-table__company-link .mdi {
  font-size: 11px;
  color: #94a3b8;
}

.osg-positions-list-table__title {
  font-weight: 500;
  color: #1f2937;
}

.osg-positions-list-table__muted {
  color: #94a3b8;
  font-size: 12px;
}

.osg-positions-list-table__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.osg-positions-list-table__logo--gold   { background: #a85a18; }
.osg-positions-list-table__logo--violet { background: #7c3aed; }
.osg-positions-list-table__logo--blue   { background: #2563eb; }
.osg-positions-list-table__logo--amber  { background: #d97706; }
.osg-positions-list-table__logo--teal   { background: #0f766e; }
.osg-positions-list-table__logo--indigo { background: #4f46e5; }
.osg-positions-list-table__logo--slate  { background: #64748b; }

.osg-industry-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff !important;
  border: 0;
}

.osg-industry-tag--gold   { background: #a85a18; }
.osg-industry-tag--violet { background: #7c3aed; }
.osg-industry-tag--blue   { background: #2563eb; }
.osg-industry-tag--amber  { background: #d97706; }
.osg-industry-tag--teal   { background: #0f766e; }
.osg-industry-tag--indigo { background: #4f46e5; }
.osg-industry-tag--slate  { background: #64748b; }

.osg-deadline--urgent {
  color: #ef4444;
  font-weight: 600;
}

.osg-deadline--closed {
  color: #94a3b8;
  text-decoration: line-through;
}
</style>
