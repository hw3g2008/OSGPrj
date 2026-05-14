<template>
  <div class="osg-page">
    <PageHeader title-zh="岗位管理" title-en="Job Tracker">
      <template #actions>
        <div style="display: flex; flex-direction: column; gap: var(--osg-toolbar-gap); align-items: flex-end">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
            <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
              <a-radio-button value="list">
                <i class="mdi mdi-format-list-bulleted" style="margin-right: 4px"></i>列表视图
              </a-radio-button>
              <a-radio-button value="drilldown">
                <i class="mdi mdi-file-tree" style="margin-right: 4px"></i>下钻视图
              </a-radio-button>
            </a-radio-group>
            <span v-if="meta.trafficSummary" style="color: var(--osg-text-muted); font-size: var(--osg-font-size-sm)">总浏览 {{ meta.trafficSummary.totalViews.toLocaleString('en-US') }} 次</span>
          </div>
          <a-space wrap>
            <a-button :loading="downloading" @click="handleExport(false)">
              <template #icon><ExportOutlined /></template>
              导出
            </a-button>
            <a-button @click="batchVisible = true">
              <template #icon><UploadOutlined /></template>
              批量上传
            </a-button>
            <a-button :loading="downloading" @click="handleExport(true)">
              <template #icon><DownloadOutlined /></template>
              下载模板
            </a-button>
            <a-button type="primary" @click="openCreateModal()">
              <template #icon><PlusOutlined /></template>
              新增岗位
            </a-button>
          </a-space>
        </div>
      </template>
    </PageHeader>

    <div style="display: flex; gap: 12px;">
      <div v-for="card in statsCards" :key="card.key" style="flex: 1; min-width: 0;">
        <a-card :bordered="false" :body-style="{ padding: '16px', textAlign: 'center' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ color: statColorMap[card.tone] || '#1890ff', fontSize: '24px', fontWeight: 700 }" />
        </a-card>
      </div>
    </div>

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: var(--osg-toolbar-gap); flex-wrap: wrap">
        <a-form-item>
          <a-select v-model:value="filters.positionCategory" placeholder="全部分类" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.categories" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.industry" placeholder="公司类别" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.industries" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.companyName" placeholder="全部公司" allow-clear style="width: 140px" show-search>
            <a-select-option v-for="option in companyOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.region" placeholder="全部地区" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.regions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.city" placeholder="全部城市" allow-clear style="width: 120px">
            <a-select-option v-for="option in cityOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.displayStatus" placeholder="全部状态" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.displayStatuses" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.recruitmentCycle" placeholder="招聘周期" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.recruitmentCycles" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <MultiSelect
            v-model:value="targetMajorsFilter"
            placeholder="主攻方向"
            style="width: 180px"
            :options="meta.majorDirections"
          />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="publishPreset" placeholder="展示起始" allow-clear style="width: 120px">
            <a-select-option v-for="option in meta.publishPresets" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.keyword" placeholder="搜索岗位名称..." allow-clear style="width: 180px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-spin :spinning="loading" tip="正在加载岗位数据...">
        <template v-if="viewMode === 'drilldown'">
          <a-empty v-if="!loading && !drillDownRows.length" description="当前筛选条件下暂无岗位数据" />

          <div v-else class="positions-drilldown">
            <section v-for="industry in drillDownRows" :key="industry.industry" class="positions-drilldown__industry">
              <div
                :class="['positions-drilldown__industry-head', `positions-drilldown__industry-head--${getIndustryTone(industry.industry)}`]"
              >
                <button
                  type="button"
                  class="positions-drilldown__industry-main positions-drilldown__industry-toggle"
                  :aria-expanded="expandedIndustries.has(industry.industry)"
                  @click="toggleIndustry(industry.industry)"
                >
                  <i :class="['mdi', expandedIndustries.has(industry.industry) ? 'mdi-chevron-down' : 'mdi-chevron-right']" :style="{ color: toneTextColor[getIndustryTone(industry.industry) || 'slate'] }" aria-hidden="true"></i>
                  <i :class="['mdi', getIndustryIcon(industry.industry)]" :style="{ color: toneTextColor[getIndustryTone(industry.industry) || 'slate'] }" aria-hidden="true"></i>
                  <strong :style="{ color: toneTextColor[getIndustryTone(industry.industry) || 'slate'] }">{{ formatIndustry(industry.industry) }}</strong>
                  <span :style="{ background: toneTextColor[getIndustryTone(industry.industry) || 'slate'], color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }">{{ industry.companyCount }} 家公司</span>
                  <a-tag color="purple">{{ industry.positionCount }} 个岗位</a-tag>
                </button>
                <div style="display: flex; align-items: center; gap: 8px">
                  <a-tag class="positions-drilldown__filter-tag" color="green" role="button" tabindex="0" @click.stop="applyIndustryFilter(industry.industry, 'open')" @keydown.enter.stop.prevent="applyIndustryFilter(industry.industry, 'open')" @keydown.space.stop.prevent="applyIndustryFilter(industry.industry, 'open')">{{ getIndustryStatusCount(industry, 'open') }} 开放</a-tag>
                  <a-tag v-if="getIndustryStatusCount(industry, 'not_started') > 0" class="positions-drilldown__filter-tag" color="blue" role="button" tabindex="0" @click.stop="applyIndustryFilter(industry.industry, 'not_started')" @keydown.enter.stop.prevent="applyIndustryFilter(industry.industry, 'not_started')" @keydown.space.stop.prevent="applyIndustryFilter(industry.industry, 'not_started')">{{ getIndustryStatusCount(industry, 'not_started') }} 未开始</a-tag>
                  <a-tag v-if="getIndustryStatusCount(industry, 'closed') > 0" class="positions-drilldown__filter-tag" color="default" role="button" tabindex="0" @click.stop="applyIndustryFilter(industry.industry, 'closed')" @keydown.enter.stop.prevent="applyIndustryFilter(industry.industry, 'closed')" @keydown.space.stop.prevent="applyIndustryFilter(industry.industry, 'closed')">{{ getIndustryStatusCount(industry, 'closed') }} 已关闭</a-tag>
                  <span class="positions-drilldown__filter-tag" :style="{ fontSize: '12px', fontWeight: 700, color: toneTextColor[getIndustryTone(industry.industry) || 'slate'] }" role="button" tabindex="0" @click.stop="applyIndustryFilter(industry.industry, 'has_students')" @keydown.enter.stop.prevent="applyIndustryFilter(industry.industry, 'has_students')" @keydown.space.stop.prevent="applyIndustryFilter(industry.industry, 'has_students')">{{ industry.studentCount }} 投递学员</span>
                </div>
              </div>

              <div v-if="expandedIndustries.has(industry.industry)" class="positions-drilldown__companies">
                <section v-for="company in getVisibleCompanies(industry)" :key="`${industry.industry}-${company.companyName}`" class="positions-drilldown__company">
                  <div class="positions-drilldown__company-head">
                    <button
                      type="button"
                      class="positions-drilldown__company-main positions-drilldown__company-main-button"
                      :aria-expanded="isCompanyExpanded(industry.industry, company.companyName)"
                      @click="toggleCompany(industry.industry, company.companyName)"
                    >
                      <i :class="['mdi', isCompanyExpanded(industry.industry, company.companyName) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
                      <div :class="['positions-drilldown__company-logo', `positions-drilldown__company-logo--${getIndustryTone(industry.industry)}`]">
                        {{ getCompanyInitials(company.companyName) }}
                      </div>
                      <div>
                        <strong>{{ company.companyName }}</strong>
                        <span>{{ getVisibleCompanyPositions(industry.industry, company).length }} 个岗位</span>
                      </div>
                    </button>
                    <a-space>
                      <a-tag>{{ getVisibleCompanyPositions(industry.industry, company).length }} 个岗位</a-tag>
                      <a-tag color="green">{{ getVisibleCompanyStatusCount(industry.industry, company, 'open') }} 开放</a-tag>
                      <a-button type="link" size="small" @click="openStudentsModal(company.positions[0])">{{ company.studentCount }}人</a-button>
                      <a v-if="company.companyWebsite" :href="company.companyWebsite" target="_blank" rel="noreferrer" style="font-size: var(--osg-font-size-sm)">
                        <i class="mdi mdi-web" aria-hidden="true" /> {{ company.companyName }} 官网
                      </a>
                    </a-space>
                  </div>

                  <div v-if="isCompanyExpanded(industry.industry, company.companyName)" class="positions-drilldown__position-list">
                    <a-table :columns="drilldownColumns" :data-source="getVisibleCompanyPositions(industry.industry, company)" :row-key="(r: PositionListItem) => r.positionId" :pagination="false" size="small" :scroll="{ x: 'max-content' }">
                      <template #headerCell="{ column }">
                        <span class="positions-drilldown__column-title">
                          <span v-for="line in formatDrilldownColumnTitle(String(column.title || ''))" :key="line">{{ line }}</span>
                        </span>
                      </template>
                      <template #bodyCell="{ column, record: position }">
                        <template v-if="column.dataIndex === 'positionName'">
                          <a v-if="position.positionUrl" :href="position.positionUrl" target="_blank" rel="noreferrer" style="font-weight: 700">
                            {{ position.positionName }} <i class="mdi mdi-open-in-new" style="font-size: var(--osg-font-size-xs)" aria-hidden="true" />
                          </a>
                          <span v-else>{{ position.positionName }}</span>
                          <div v-if="position.applicationNote" style="color: #f59e0b; font-size: 10px; margin-top: 2px">{{ position.applicationNote }}</div>
                        </template>
                        <template v-else-if="column.dataIndex === 'positionCategory'">{{ formatCategory(position.positionCategory) }}</template>
                        <template v-else-if="column.dataIndex === 'department'">{{ formatDepartment(position.department) }}</template>
                        <template v-else-if="column.dataIndex === 'recruitmentCycle'">
                          <div class="positions-cycle-tags">
                            <a-tag v-for="cycle in splitCycles(position.recruitmentCycle)" :key="cycle" color="blue">{{ formatCycle(cycle) }}</a-tag>
                            <span v-if="!splitCycles(position.recruitmentCycle).length">-</span>
                          </div>
                        </template>
                        <template v-else-if="column.dataIndex === 'targetMajors'">
                          <div class="positions-cycle-tags">
                            <a-tag v-for="major in splitCycles(position.targetMajors)" :key="major" color="cyan">{{ formatMajor(major) }}</a-tag>
                            <span v-if="!splitCycles(position.targetMajors).length">-</span>
                          </div>
                        </template>
                        <template v-else-if="column.dataIndex === 'displayStartTime'">{{ formatShortDate(position.displayStartTime) }}</template>
                        <template v-else-if="column.dataIndex === 'createTime'">{{ formatShortDate(position.createTime) }}</template>
                        <template v-else-if="column.dataIndex === 'deadline'">
                          <template v-if="position.deadline">
                            <span :style="isDeadlineSoon(position.deadline) ? { color: '#dc2626', fontWeight: 700 } : {}">{{ formatShortDate(position.deadline) }}</span>
                          </template>
                          <template v-else-if="position.deadlineText">{{ position.deadlineText }}</template>
                          <template v-else>—</template>
                        </template>
                        <template v-else-if="column.dataIndex === 'displayStatus'">
                          <a-tag :color="statusToneToColor[getStatusTone(position.displayStatus)] || 'green'">{{ formatStatus(position.displayStatus) }}</a-tag>
                        </template>
                        <template v-else-if="column.dataIndex === 'studentCount'">
                          <a-button type="link" size="small" @click="openStudentsModal(position)">{{ position.studentCount || 0 }}人</a-button>
                        </template>
                        <template v-else-if="column.dataIndex === 'action'">
                          <a-button type="link" size="small" @click="openEditModal(position)">编辑</a-button>
                        </template>
                      </template>
                    </a-table>

                    <div style="display: flex; justify-content: flex-end; padding: 6px 10px">
                      <a-button size="small" @click="openCreateModal(industry, company)">
                        <template #icon><PlusOutlined /></template>
                        {{ company.companyName }} 添加岗位
                      </a-button>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </template>

        <template v-else>
          <a-table class="positions-list-table" :columns="listColumns" :data-source="sortedListRows" :row-key="(r: PositionListItem) => r.positionId" :pagination="tablePagination" :locale="{ emptyText: '当前筛选条件下暂无岗位数据' }" :scroll="{ x: 1400 }" @change="handleTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'positionName'">
                <a-tooltip :title="record.positionName || '-'">
                  <a v-if="record.positionUrl" :href="record.positionUrl" target="_blank" rel="noreferrer" class="positions-list__cell-text positions-list__cell-link">
                    {{ record.positionName }} <i class="mdi mdi-open-in-new" style="font-size: var(--osg-font-size-xs)" aria-hidden="true" />
                  </a>
                  <span v-else class="positions-list__cell-text">{{ record.positionName }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'companyName'">
                <a-tooltip :title="record.companyName || '-'">
                  <div class="positions-list__company-cell">
                    <div :class="['positions-drilldown__company-logo', `positions-drilldown__company-logo--${getIndustryTone(record.industry || record.companyType)}`]">
                      {{ getCompanyInitials(record.companyName || '') || '—' }}
                    </div>
                    <span class="positions-list__cell-text">{{ record.companyName || '-' }}</span>
                  </div>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'companyType'">
                <a-tag v-if="record.companyType" :color="industryTagColor(record.companyType)" style="font-size: 11px">
                  {{ formatIndustry(record.companyType) }}
                </a-tag>
                <span v-else class="positions-list__cell-text">-</span>
              </template>
              <template v-else-if="column.dataIndex === 'companyIndustry'">
                <div style="display: flex; align-items: center; gap: 8px; text-align: left">
                  <div :class="['positions-drilldown__company-logo', `positions-drilldown__company-logo--${getIndustryTone(record.industry)}`]">
                    {{ getCompanyInitials(record.industry) }}
                  </div>
                  <span>{{ formatIndustry(record.industry) }}</span>
                </div>
              </template>
              <template v-else-if="column.dataIndex === 'department'">
                <a-tooltip :title="formatDepartment(record.department)">
                  <span class="positions-list__cell-text">{{ formatDepartment(record.department) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'positionCategory'">
                <a-tooltip :title="formatCategory(record.positionCategory)">
                  <span class="positions-list__cell-text">{{ formatCategory(record.positionCategory) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'city'">
                <a-tooltip :title="record.city || '-'">
                  <span class="positions-list__cell-text">{{ record.city || '-' }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'recruitmentCycle'">
                <a-tooltip :title="formatCycleTooltip(record.recruitmentCycle)">
                  <div class="positions-list__tag-line">
                    <a-tag v-for="cycle in splitCycles(record.recruitmentCycle)" :key="cycle" color="blue">{{ formatCycle(cycle) }}</a-tag>
                    <span v-if="!splitCycles(record.recruitmentCycle).length">-</span>
                  </div>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'targetMajors'">
                <a-tooltip :title="formatMajorTooltip(record.targetMajors)">
                  <div class="positions-list__tag-line">
                    <a-tag v-for="major in splitCycles(record.targetMajors)" :key="major" color="cyan">{{ formatMajor(major) }}</a-tag>
                    <span v-if="!splitCycles(record.targetMajors).length">-</span>
                  </div>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'displayStartTime'">
                {{ formatShortDate(record.displayStartTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'createTime'">{{ formatShortDate(record.createTime) }}</template>
              <template v-else-if="column.dataIndex === 'deadlineDisplay'">
                <template v-if="record.deadline">
                  <a-tooltip :title="formatShortDate(record.deadline)">
                    <span class="positions-list__cell-text" :style="isDeadlineSoon(record.deadline) ? { color: '#dc2626', fontWeight: 700 } : {}">{{ formatShortDate(record.deadline) }}</span>
                  </a-tooltip>
                </template>
                <template v-else-if="record.deadlineText">
                  <a-tooltip :title="record.deadlineText">
                    <span class="positions-list__cell-text">{{ record.deadlineText }}</span>
                  </a-tooltip>
                </template>
                <template v-else>—</template>
              </template>
              <template v-else-if="column.dataIndex === 'displayStatus'">
                <a-tag :color="statusToneToColor[getStatusTone(record.displayStatus)] || 'green'">{{ formatStatus(record.displayStatus) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'studentCount'">
                <a-button type="link" size="small" @click="openStudentsModal(record)">{{ record.studentCount || 0 }}人</a-button>
              </template>
              <template v-else-if="column.dataIndex === 'createBy'">
                <a-tooltip :title="record.createBy || '-'">
                  <span class="positions-list__cell-text">{{ record.createBy || '-' }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
              </template>
            </template>
          </a-table>
        </template>

        <div style="display: flex; align-items: center; gap: var(--osg-toolbar-gap); padding: 8px 0; color: #6e80a4; font-size: 13px; font-weight: 600">
          <span>共 {{ summary.companyCount }} 家公司</span>
          <span style="color: #c1cad9">|</span>
          <span style="color: #6b6ef7">● {{ summary.positionCount }} 个岗位</span>
          <span style="color: #22c55e">● {{ drilldownStatusSummary.openPositions }} 开放中</span>
          <span v-if="drilldownStatusSummary.notStartedPositions > 0" style="color: #3b82f6">● {{ drilldownStatusSummary.notStartedPositions }} 未开始</span>
          <span style="color: #94a3b8">● {{ drilldownStatusSummary.closedPositions }} 已关闭</span>
        </div>
      </a-spin>
    </a-card>

    <PositionFormModal
      v-model:visible="formVisible"
      :position="editingPosition"
      :defaults="createDefaults"
      :meta="meta"
      :company-options="companyOptions"
      @submit="handleSavePosition"
    />
    <BatchUploadModal
      v-model:visible="batchVisible"
      :upload-rule-copy="meta.uploadRuleCopy"
      :upload-steps="meta.uploadSteps"
      @submit="handleBatchUpload"
    />
    <PositionStudentsModal
      v-model:visible="studentsVisible"
      :company-name="selectedPosition?.companyName || '公司'"
      :position-name="selectedPosition?.positionName || '岗位'"
      :loading="studentsLoading"
      :rows="studentRows"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined, ExportOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { MultiSelect } from '@osg/shared/components'
import { getToken } from '@osg/shared/utils'
import {
  createPosition,
  getPositionCompanyOptions,
  getPositionDrillDown,
  getPositionList,
  getPositionMeta,
  getPositionStats,
  getPositionStudents,
  updatePosition,
  uploadPositionFile,
  type DrillDownCompany,
  type DrillDownIndustry,
  type PositionCompanyOption,
  type PositionListItem,
  type PositionListParams,
  type PositionMeta,
  type PositionMetaOption,
  type PositionPayload,
  type PositionStudentRow,
  type PositionStats
} from '@osg/shared/api/admin/position'
import BatchUploadModal from './components/BatchUploadModal.vue'
import PositionFormModal from './components/PositionFormModal.vue'
import PositionStudentsModal from './components/PositionStudentsModal.vue'

const statColorMap: Record<string, string> = {
  primary: '#6b6ef7',
  success: '#22c55e',
  warning: '#f59e0b',
  muted: '#94a3b8',
  info: '#3b82f6'
}

const statusToneToColor: Record<string, string> = {
  success: 'green',
  muted: 'default',
  danger: 'red',
  default: 'default'
}

const toneTextColor: Record<string, string> = {
  gold: '#92400E',
  indigo: '#4F46E5',
  violet: '#7C3AED',
  teal: '#0F766E',
  blue: '#1D4ED8',
  amber: '#D97706',
  slate: '#64748b'
}


const drilldownColumns = [
  { title: '岗位名称', dataIndex: 'positionName', key: 'positionName', width: 280, ellipsis: false, fixed: 'left' as const },
  { title: '岗位分类', dataIndex: 'positionCategory', key: 'positionCategory', width: 90 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 80 },
  { title: '地区', dataIndex: 'city', key: 'city', width: 70 },
  { title: '招聘周期', dataIndex: 'recruitmentCycle', key: 'recruitmentCycle', width: 100 },
  { title: '主攻方向', dataIndex: 'targetMajors', key: 'targetMajors', width: 140 },
  { title: '展示起始', dataIndex: 'displayStartTime', key: 'displayStartTime', width: 80 },
  { title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 80 },
  { title: '状态', dataIndex: 'displayStatus', key: 'displayStatus', width: 80 },
  { title: '投递学员', dataIndex: 'studentCount', key: 'studentCount', width: 80 },
  { title: '添加人', dataIndex: 'createBy', key: 'createBy', width: 90 },
  { title: '添加日期', dataIndex: 'createTime', key: 'createTime', width: 90 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 60, fixed: 'right' as const },
]

const formatDrilldownColumnTitle = (title: string) => {
  if (title.length === 4) {
    return [title.slice(0, 2), title.slice(2)]
  }
  return [title]
}

const listColumns = [
  { title: '岗位名称', dataIndex: 'positionName', key: 'positionName', width: 280, ellipsis: false, fixed: 'left' as const },
  { title: '公司', dataIndex: 'companyName', key: 'companyName', width: 160 },
  { title: '公司类别', dataIndex: 'companyType', key: 'companyType', width: 100 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 80 },
  { title: '岗位分类', dataIndex: 'positionCategory', key: 'positionCategory', width: 90 },
  { title: '地区', dataIndex: 'city', key: 'city', width: 70 },
  { title: '招聘周期', dataIndex: 'recruitmentCycle', key: 'recruitmentCycle', width: 100 },
  { title: '主攻方向', dataIndex: 'targetMajors', key: 'targetMajors', width: 140 },
  { title: '展示起始', dataIndex: 'displayStartTime', key: 'displayStartTime', width: 80 },
  { title: '截止时间', dataIndex: 'deadlineDisplay', key: 'deadlineDisplay', width: 100 },
  { title: '状态', dataIndex: 'displayStatus', key: 'displayStatus', width: 80 },
  { title: '投递学员', dataIndex: 'studentCount', key: 'studentCount', width: 80 },
  { title: '添加人', dataIndex: 'createBy', key: 'createBy', width: 90 },
  { title: '添加日期', dataIndex: 'createTime', key: 'createTime', width: 90 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 60, fixed: 'right' as const },
]

type DrilldownFilter = 'all' | 'open' | 'not_started' | 'closed' | 'has_students'

const createEmptyMeta = (): PositionMeta => ({
  categories: [],
  displayStatuses: [],
  industries: [],
  departments: [],
  recruitmentCycles: [],
  majorDirections: [],
  projectYears: [],
  regions: [],
  citiesByRegion: {},
  publishPresets: [],
  processGlossary: [],
  uploadSteps: [],
  trafficSummary: null
})

const loading = ref(false)
const downloading = ref(false)
const positions = ref<PositionListItem[]>([])
const drillDownRows = ref<DrillDownIndustry[]>([])
const meta = ref<PositionMeta>(createEmptyMeta())
const companyOptions = ref<PositionCompanyOption[]>([])
const studentRows = ref<PositionStudentRow[]>([])
const stats = ref<PositionStats>({
  totalPositions: 0,
  openPositions: 0,
  closingSoonPositions: 0,
  closedPositions: 0,
  studentApplications: 0
})
const viewMode = ref<'drilldown' | 'list'>('list')
const publishSort = ref<'desc' | 'asc'>('desc')
const publishPreset = ref<string | undefined>(undefined)
const formVisible = ref(false)
const batchVisible = ref(false)
const studentsVisible = ref(false)
const studentsLoading = ref(false)
const editingPosition = ref<PositionListItem | null>(null)
const selectedPosition = ref<PositionListItem | null>(null)
const createDefaults = ref<Partial<PositionPayload> | null>(null)
const expandedIndustries = ref(new Set<string>())
const expandedCompanies = ref(new Set<string>())
const activeDrilldownFilters = ref<Record<string, DrilldownFilter>>({})

const filters = reactive<PositionListParams>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  positionCategory: undefined,
  industry: undefined,
  companyName: undefined,
  region: undefined,
  city: undefined,
  displayStatus: undefined,
  recruitmentCycle: undefined,
  targetMajors: undefined
})

const targetMajorsFilter = ref<string[]>([])

const total = ref(0)

const tablePagination = computed(() => ({
  current: filters.pageNum,
  pageSize: filters.pageSize,
  total: total.value,
  showSizeChanger: false,
  showTotal: (value: number) => `共 ${value} 条记录`
}))

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  filters.pageNum = pag.current ?? 1
  filters.pageSize = pag.pageSize ?? 10
  void loadPage()
}

const statsCards = computed(() => [
  { key: 'total', label: '总岗位数', value: summary.value.positionCount, tone: 'primary' },
  { key: 'open', label: '开放中', value: drilldownStatusSummary.value.openPositions, tone: 'success' },
  { key: 'closing', label: '即将截止', value: stats.value.closingSoonPositions, tone: 'warning' },
  { key: 'not-started', label: '未开始', value: drilldownStatusSummary.value.notStartedPositions, tone: 'info' },
  { key: 'closed', label: '已关闭', value: drilldownStatusSummary.value.closedPositions, tone: 'muted' },
  { key: 'students', label: '投递学员', value: stats.value.studentApplications, tone: 'info' }
])

const cityOptions = computed<PositionMetaOption[]>(() => {
  const merged: PositionMetaOption[] = []
  const seen = new Set<string>()
  Object.values(meta.value.citiesByRegion).forEach((items) => {
    items.forEach((item) => {
      if (!seen.has(item.value)) {
        seen.add(item.value)
        merged.push(item)
      }
    })
  })
  return merged
})

const buildOptionMap = (options: PositionMetaOption[]) =>
  new Map(options.map((option) => [option.value, option]))

const categoryMap = computed(() => buildOptionMap(meta.value.categories))
const statusMap = computed(() => buildOptionMap(meta.value.displayStatuses))
const industryMap = computed(() => buildOptionMap(meta.value.industries))
const departmentMap = computed(() => buildOptionMap(meta.value.departments))
const cycleMap = computed(() => buildOptionMap(meta.value.recruitmentCycles))
const majorMap = computed(() => buildOptionMap(meta.value.majorDirections))

const sortedListRows = computed(() => {
  const rows = [...positions.value]
  rows.sort((left, right) => {
    const leftTime = left.displayStartTime ? new Date(left.displayStartTime).getTime() : 0
    const rightTime = right.displayStartTime ? new Date(right.displayStartTime).getTime() : 0
    return publishSort.value === 'desc' ? rightTime - leftTime : leftTime - rightTime
  })
  return rows
})

const getIndustryPositions = (industry: DrillDownIndustry) =>
  industry.companies.flatMap((company) => company.positions)

const normalizePositionStatus = (status?: string) => (status || '').trim().toLowerCase()

const matchesDrilldownFilter = (position: PositionListItem, filter: DrilldownFilter) => {
  const status = normalizePositionStatus(position.displayStatus)
  if (filter === 'open') {
    return status === 'visible'
  }
  if (filter === 'not_started') {
    return status === 'not_started'
  }
  if (filter === 'closed') {
    return status === 'hidden' || status === 'expired'
  }
  if (filter === 'has_students') {
    return (position.studentCount || 0) > 0
  }
  return true
}

const summary = computed(() => ({
  companyCount: drillDownRows.value.reduce((total, industry) => total + industry.companyCount, 0),
  positionCount: drillDownRows.value.reduce((total, industry) => total + industry.positionCount, 0)
}))

const drilldownStatusSummary = computed(() => {
  const rows = drillDownRows.value.flatMap(getIndustryPositions)
  return {
    openPositions: rows.filter((position) => matchesDrilldownFilter(position, 'open')).length,
    notStartedPositions: rows.filter((position) => matchesDrilldownFilter(position, 'not_started')).length,
    closedPositions: rows.filter((position) => matchesDrilldownFilter(position, 'closed')).length
  }
})

const hasExpandedContext = () =>
  Boolean(
    filters.keyword
      || filters.positionCategory
      || filters.companyName
      || filters.industry
      || filters.region
      || filters.city
      || filters.displayStatus
      || filters.recruitmentCycle
      || publishPreset.value
  )

const buildPublishRange = () => {
  if (!publishPreset.value) {
    return {}
  }

  const end = new Date()
  const start = new Date(end)
  if (publishPreset.value === 'week') {
    start.setDate(end.getDate() - 7)
  } else if (publishPreset.value === 'month') {
    start.setMonth(end.getMonth() - 1)
  } else {
    start.setMonth(end.getMonth() - 3)
  }

  return {
    beginDisplayStartTime: start.toISOString().slice(0, 10),
    endDisplayStartTime: end.toISOString().slice(0, 10)
  }
}

const toRequestParams = (): PositionListParams => {
  const params: PositionListParams = {
    pageNum: filters.pageNum,
    pageSize: filters.pageSize,
    keyword: filters.keyword?.trim() || undefined,
    positionCategory: filters.positionCategory || undefined,
    industry: filters.industry || undefined,
    companyName: filters.companyName || undefined,
    region: filters.region || undefined,
    city: filters.city || undefined,
    displayStatus: filters.displayStatus || undefined,
    recruitmentCycle: filters.recruitmentCycle || undefined,
    targetMajors: targetMajorsFilter.value.length ? targetMajorsFilter.value.join(',') : undefined
  }

  return {
    ...params,
    ...buildPublishRange()
  }
}

const syncExpandedState = (rows: DrillDownIndustry[]) => {
  activeDrilldownFilters.value = {}
  if (!hasExpandedContext()) {
    expandedIndustries.value = new Set()
    expandedCompanies.value = new Set()
    return
  }

  expandedIndustries.value = new Set(rows.map((item) => item.industry))
  expandedCompanies.value = new Set(
    rows.flatMap((item) => item.companies.map((company) => `${item.industry}::${company.companyName}`))
  )
}

const loadReferenceData = async () => {
  const [metaResponse, companyResponse] = await Promise.all([
    getPositionMeta(),
    getPositionCompanyOptions()
  ])
  meta.value = {
    ...createEmptyMeta(),
    ...metaResponse,
    citiesByRegion: metaResponse.citiesByRegion || {},
    uploadSteps: metaResponse.uploadSteps || [],
    trafficSummary: metaResponse.trafficSummary ?? null
  }
  companyOptions.value = companyResponse || []
}

const loadPage = async () => {
  try {
    loading.value = true
    const params = toRequestParams()
    const [listRes, statsRes, drillRes] = await Promise.all([
      getPositionList(params),
      getPositionStats(params),
      getPositionDrillDown(params)
    ])
    positions.value = listRes.rows || []
    total.value = listRes.total || 0
    stats.value = statsRes
    drillDownRows.value = drillRes || []
    syncExpandedState(drillDownRows.value)
  } catch (_error) {
    message.error('加载岗位数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  filters.pageNum = 1
  await loadPage()
}

const handleReset = async () => {
  filters.keyword = ''
  filters.positionCategory = undefined
  filters.industry = undefined
  filters.companyName = undefined
  filters.region = undefined
  filters.city = undefined
  filters.displayStatus = undefined
  filters.recruitmentCycle = undefined
  targetMajorsFilter.value = []
  publishPreset.value = undefined
  filters.pageNum = 1
  await loadPage()
}

const openCreateModal = (industry?: DrillDownIndustry, company?: DrillDownCompany) => {
  editingPosition.value = null
  createDefaults.value = industry || company
    ? {
        industry: industry?.industry || company?.companyType || '',
        companyType: company?.companyType || industry?.industry || '',
        companyName: company?.companyName || '',
        companyWebsite: company?.companyWebsite || ''
      }
    : null
  formVisible.value = true
}

const openEditModal = (record: PositionListItem) => {
  createDefaults.value = null
  editingPosition.value = record
  formVisible.value = true
}

const openStudentsModal = async (record: PositionListItem) => {
  selectedPosition.value = record
  studentsVisible.value = true
  studentsLoading.value = true
  studentRows.value = []

  try {
    studentRows.value = await getPositionStudents(record.positionId)
  } catch (_error) {
    message.error('加载岗位申请学员失败')
  } finally {
    studentsLoading.value = false
  }
}

const handleSavePosition = async (payload: PositionPayload) => {
  try {
    if (payload.positionId) {
      await updatePosition(payload)
      message.success('岗位已更新')
    } else {
      await createPosition(payload)
      message.success('岗位已新增')
    }
    formVisible.value = false
    createDefaults.value = null
    await Promise.all([loadReferenceData(), loadPage()])
  } catch (_error) {
    message.error(payload.positionId ? '岗位更新失败' : '岗位新增失败')
  }
}

const handleBatchUpload = async (file: File) => {
  try {
    const result = await uploadPositionFile(file)
    batchVisible.value = false
    await Promise.all([loadReferenceData(), loadPage()])

    const parts: string[] = []
    if (result.successCount > 0) parts.push(`成功导入 ${result.successCount} 条`)
    if (result.duplicateCount > 0) parts.push(`重复跳过 ${result.duplicateCount} 条`)
    if (result.failedCount > 0) {
      const reasons = result.failedRows.map((f) => f.reason).join('\n')
      parts.push(`失败 ${result.failedCount} 条`)
      message.warning(parts.join('，') + '\n\n失败明细:\n' + reasons, 10)
    } else if (result.duplicateCount > 0) {
      message.warning(parts.join('，'))
    } else {
      message.success(parts.join('，') || `成功导入 ${result.successCount} 条岗位`)
    }
  } catch (_error) {
    message.error('岗位批量上传失败')
  }
}

const getExportFilename = (contentDisposition: string | null, template: boolean) => {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)
  const plainMatch = contentDisposition?.match(/filename="?([^";]+?)"?(?:;|$)/i)
  const raw = utf8Match?.[1] || plainMatch?.[1]
  if (raw) {
    return decodeURIComponent(raw.trim())
  }
  return template ? 'position-template.xlsx' : 'positions.xlsx'
}

const handleExport = async (template: boolean) => {
  try {
    downloading.value = true
    const params = new URLSearchParams()
    const token = getToken()
    const requestParams = toRequestParams()

    Object.entries(requestParams).forEach(([key, value]) => {
      if (!value) {
        return
      }
      params.append(key, String(value))
    })
    if (template) {
      params.append('template', 'true')
    }

    const response = await fetch(`/api/admin/position/export?${params.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    })

    if (!response.ok) {
      throw new Error('export failed')
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const errJson = await response.json().catch(() => null)
      throw new Error(errJson?.msg || '导出请求未通过认证，请重新登录')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getExportFilename(response.headers.get('content-disposition'), template)
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success(template ? '模板下载成功' : '岗位导出成功')
  } catch (error) {
    const reason = error instanceof Error && error.message && !['export failed'].includes(error.message)
      ? error.message
      : ''
    message.error((template ? '模板下载失败' : '岗位导出失败') + (reason ? `：${reason}` : ''))
  } finally {
    downloading.value = false
  }
}

const toggleIndustry = (industry: string) => {
  activeDrilldownFilters.value = {
    ...activeDrilldownFilters.value,
    [industry]: 'all'
  }
  const next = new Set(expandedIndustries.value)
  if (next.has(industry)) {
    next.delete(industry)
  } else {
    next.add(industry)
  }
  expandedIndustries.value = next
}

const toggleCompany = (industry: string, companyName: string) => {
  const key = `${industry}::${companyName}`
  const next = new Set(expandedCompanies.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedCompanies.value = next
}

const isCompanyExpanded = (industry: string, companyName: string) =>
  expandedCompanies.value.has(`${industry}::${companyName}`)

const expandIndustry = (industry: string) => {
  const next = new Set(expandedIndustries.value)
  next.add(industry)
  expandedIndustries.value = next
}

const getIndustryFilter = (industry: string): DrilldownFilter =>
  activeDrilldownFilters.value[industry] || 'all'

const applyIndustryFilter = (industry: string, filter: DrilldownFilter) => {
  activeDrilldownFilters.value = {
    ...activeDrilldownFilters.value,
    [industry]: filter
  }
  expandIndustry(industry)
  const row = drillDownRows.value.find((item) => item.industry === industry)
  if (row) {
    const next = new Set(expandedCompanies.value)
    row.companies
      .filter((company) => company.positions.some((position) => matchesDrilldownFilter(position, filter)))
      .forEach((company) => next.add(`${industry}::${company.companyName}`))
    expandedCompanies.value = next
  }
}

const getVisibleCompanyPositions = (industry: string, company: DrillDownCompany) =>
  company.positions.filter((position) => matchesDrilldownFilter(position, getIndustryFilter(industry)))

const getVisibleCompanies = (industry: DrillDownIndustry) =>
  industry.companies.filter((company) => getVisibleCompanyPositions(industry.industry, company).length > 0)

const getIndustryStatusCount = (industry: DrillDownIndustry, filter: DrilldownFilter) =>
  getIndustryPositions(industry).filter((position) => matchesDrilldownFilter(position, filter)).length

const getVisibleCompanyStatusCount = (industry: string, company: DrillDownCompany, filter: DrilldownFilter) =>
  getVisibleCompanyPositions(industry, company).filter((position) => matchesDrilldownFilter(position, filter)).length

const togglePublishSort = () => {
  publishSort.value = publishSort.value === 'desc' ? 'asc' : 'desc'
}

const getIndustryMeta = (industry?: string) =>
  industryMap.value.get(industry || '') || { value: industry || 'Other', label: industry || 'Other', tone: 'slate', icon: 'mdi-briefcase-search' }

const getIndustryTone = (industry?: string) => getIndustryMeta(industry).tone

const industryToneToTagColor: Record<string, string> = {
  gold: 'gold',
  amber: 'gold',
  indigo: 'purple',
  violet: 'purple',
  blue: 'blue',
  teal: 'cyan',
  slate: 'default'
}

const industryTagColor = (industry?: string) => {
  const tone = getIndustryMeta(industry).tone || 'slate'
  return industryToneToTagColor[tone] || 'default'
}
const getIndustryIcon = (industry?: string) => getIndustryMeta(industry).icon
const formatIndustry = (industry?: string) => getIndustryMeta(industry).label

const getCompanyInitials = (companyName: string) =>
  companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

const formatCategory = (value?: string) => categoryMap.value.get(value || '')?.label || value || '-'

const formatDepartment = (value?: string) => departmentMap.value.get(value || '')?.label || value || '-'

const formatStatus = (value?: string) => statusMap.value.get(value || '')?.label || value || '展示中'

const getStatusTone = (value?: string) => statusMap.value.get(value || '')?.tone || 'success'

const splitCycles = (value?: string | string[] | null) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

const formatCycle = (value?: string) => {
  if (!value) {
    return '-'
  }
  return cycleMap.value.get(value)?.label || value
}

const formatMajor = (value?: string) => {
  if (!value) {
    return '-'
  }
  return majorMap.value.get(value)?.label || value
}

const formatCycleTooltip = (value?: string | string[] | null) => {
  const labels = splitCycles(value).map((item) => formatCycle(item))
  return labels.length ? labels.join('、') : '-'
}

const formatMajorTooltip = (value?: string | string[] | null) => {
  const labels = splitCycles(value).map((item) => formatMajor(item))
  return labels.length ? labels.join('、') : '-'
}

const formatShortDate = (value?: string) => {
  if (!value) {
    return '—'
  }
  if (value.length >= 10) {
    return value.slice(5, 10)
  }
  return value
}

const isDeadlineSoon = (value?: string) => {
  if (!value) {
    return false
  }
  const deadline = new Date(value).getTime()
  const now = Date.now()
  return deadline >= now && deadline - now <= 7 * 24 * 60 * 60 * 1000
}

onMounted(() => {
  void Promise.all([loadReferenceData(), loadPage()])
})
</script>

<style scoped>
:deep(.ant-table-cell) {
  word-break: break-word;
  overflow-wrap: break-word;
}
.positions-list-table :deep(.ant-table-thead > tr > th) {
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}
.positions-list-table :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}
.positions-list__cell-text {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.positions-list__cell-link {
  font-weight: 700;
}
.positions-list__company-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.positions-list__company-cell .positions-list__cell-text {
  flex: 1;
  min-width: 0;
}
.positions-list__company-cell .positions-drilldown__company-logo {
  width: 24px;
  height: 24px;
  font-size: 9px;
  border-radius: 4px;
}
.positions-list__tag-line {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
}
.positions-list__tag-line .ant-tag {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.positions-drilldown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.positions-drilldown__industry {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 12px rgba(134, 148, 196, 0.08);
  overflow: hidden;
}
.positions-drilldown__industry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  padding: 12px 16px;
  text-align: left;
}
.positions-drilldown__industry-head--gold { background: linear-gradient(90deg, #fff1bf 0%, #fffdf6 100%); }
.positions-drilldown__industry-head--indigo { background: linear-gradient(90deg, #e0e7ff 0%, #f8faff 100%); }
.positions-drilldown__industry-head--violet { background: linear-gradient(90deg, #f2e7ff 0%, #f8f5ff 100%); }
.positions-drilldown__industry-head--teal { background: linear-gradient(90deg, #ccfbf1 0%, #f6fffd 100%); }
.positions-drilldown__industry-head--blue { background: linear-gradient(90deg, #ddebff 0%, #f8fbff 100%); }
.positions-drilldown__industry-head--amber { background: linear-gradient(90deg, #fff2c9 0%, #fffdf6 100%); }
.positions-drilldown__industry-head--slate { background: linear-gradient(90deg, #edf2f7 0%, #f8fafc 100%); }
.positions-drilldown__industry-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.positions-drilldown__industry-main strong {
  font-size: 15px;
}
.positions-drilldown__industry-toggle {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.positions-drilldown__filter-tag {
  cursor: pointer;
}
.positions-drilldown__companies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
}
.positions-drilldown__company {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.positions-drilldown__company-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #fff;
}
.positions-drilldown__company-main-button {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.positions-drilldown__company-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}
.positions-drilldown__company-logo--gold { background: #a85a18; }
.positions-drilldown__company-logo--indigo { background: #4f46e5; }
.positions-drilldown__company-logo--violet { background: #7c3aed; }
.positions-drilldown__company-logo--teal { background: #0f766e; }
.positions-drilldown__company-logo--blue { background: #2563eb; }
.positions-drilldown__company-logo--amber { background: #d97706; }
.positions-drilldown__company-logo--slate { background: #64748b; }
.positions-drilldown__column-title {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.25;
  white-space: nowrap;
}
.positions-drilldown__column-title span {
  white-space: nowrap;
}
.positions-cycle-tags {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.positions-cycle-tags .ant-tag {
  margin-right: 0;
}
.positions-drilldown__company-main strong {
  display: block;
  color: #1f2937;
}
.positions-drilldown__company-main span {
  color: #64748b;
  font-size: 12px;
}
.positions-drilldown__position-list {
  margin-left: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
@media (max-width: 1120px) {
  .positions-drilldown__industry-head,
  .positions-drilldown__company-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .positions-drilldown__position-list {
    margin-left: 0;
  }
}
</style>
