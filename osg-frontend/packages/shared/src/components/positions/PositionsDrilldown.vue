<template>
  <div class="osg-positions-drilldown">
    <section
      v-for="industry in industries"
      :key="industry.id"
      class="osg-positions-drilldown__industry"
    >
      <button
        type="button"
        :class="[
          'osg-positions-drilldown__industry-head',
          `osg-positions-drilldown__industry-head--${industry.tone}`,
        ]"
        :aria-expanded="isIndustryExpanded(industry.id)"
        @click="emit('toggleIndustry', industry.id)"
      >
        <div class="osg-positions-drilldown__industry-main">
          <i
            :class="[
              'mdi',
              isIndustryExpanded(industry.id) ? 'mdi-chevron-down' : 'mdi-chevron-right',
            ]"
            :style="{ color: toneTextColor(industry.tone) }"
            aria-hidden="true"
          />
          <i
            :class="['mdi', industry.icon]"
            :style="{ color: toneTextColor(industry.tone) }"
            aria-hidden="true"
          />
          <strong :style="{ color: toneTextColor(industry.tone) }">
            {{ industry.label }}
          </strong>
          <span
            :style="{
              background: toneTextColor(industry.tone),
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
            }"
          >
            {{ t('common.shared.positions.drilldown.companyCount', { n: industry.companyCount }) }}
          </span>
          <span
            :style="{
              background: '#22c55e',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
            }"
          >
            {{ t('common.shared.positions.drilldown.positionCount', { n: industry.positionCount }) }}
          </span>
        </div>
        <span
          :style="{
            fontSize: '12px',
            color: toneTextColor(industry.tone),
          }"
        >
          {{ t('common.shared.positions.drilldown.myStudents', { n: industry.studentCount }) }}
        </span>
      </button>

      <div
        v-if="isIndustryExpanded(industry.id)"
        class="osg-positions-drilldown__companies"
      >
        <section
          v-for="company in industry.companies"
          :key="company.id"
          class="osg-positions-drilldown__company"
        >
          <div class="osg-positions-drilldown__company-head">
            <button
              type="button"
              class="osg-positions-drilldown__company-main-button"
              :aria-expanded="isCompanyExpanded(company.id)"
              @click="emit('toggleCompany', industry.id, company.id)"
            >
              <i
                :class="[
                  'mdi',
                  isCompanyExpanded(company.id) ? 'mdi-chevron-down' : 'mdi-chevron-right',
                ]"
                aria-hidden="true"
              />
              <div
                :class="[
                  'osg-positions-drilldown__company-logo',
                  resolveCompanyLogoToneClass(company, industry),
                ]"
                :style="company.logoColor ? { background: company.logoColor } : undefined"
              >
                {{ company.logoText }}
              </div>
              <div class="osg-positions-drilldown__company-meta">
                <a-tooltip :title="company.name" placement="topLeft">
                  <strong>{{ company.name }}</strong>
                </a-tooltip>
                <span>{{ company.locations || '—' }}</span>
              </div>
            </button>
            <a-space :size="12">
              <i18n-t keypath="common.shared.positions.drilldown.companyPositionCount" tag="span" style="font-size: 12px">
                <template #count><strong style="color: #6b6ef7">{{ company.positionCount }}</strong></template>
              </i18n-t>
              <a-button
                v-if="company.studentCount > 0"
                type="link"
                size="small"
                @click="emit('openCompanyStudents', company)"
              >
                {{ t('common.shared.positions.drilldown.peopleCount', { n: company.studentCount }) }}
              </a-button>
              <span v-else style="color: #94a3b8; font-size: 12px">{{ t('common.shared.positions.drilldown.peopleCount', { n: 0 }) }}</span>
              <a
                v-if="company.officialUrl"
                :href="company.officialUrl"
                target="_blank"
                rel="noreferrer"
                class="osg-positions-drilldown__official-link"
                @click.stop
              >
                <i class="mdi mdi-web" aria-hidden="true" /> {{ t('common.shared.positions.drilldown.officialSite') }}
              </a>
            </a-space>
          </div>

          <div
            v-if="isCompanyExpanded(company.id)"
            class="osg-positions-drilldown__position-list"
          >
            <PositionsListTable
              :positions="company.positions"
              :columns="DRILLDOWN_COLUMNS"
              @open-students="(row) => emit('openPositionStudents', row)"
            />
          </div>
        </section>
      </div>
    </section>

    <a-empty v-if="!industries.length" :description="t('common.shared.positions.drilldown.emptyDescription')" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PositionsListTable from './PositionsListTable.vue'
import {
  INDUSTRY_TONE_TEXT_COLOR,
  type IndustryTone,
  type PositionCompanyGroup,
  type PositionIndustryGroup,
  type PositionTableRow,
} from './types'

/**
 * PositionsDrilldown — 岗位下钻视图（行业 → 公司 → 岗位 三级嵌套）
 *
 * 来源：osg-spec-docs/source/prototype/{lead-mentor,assistant}.html positions 页面下钻视图
 *
 * 数据：父组件预处理为 PositionIndustryGroup[]（含 companies/positions 三级嵌套）
 *
 * 受控展开：父组件维护 expandedIndustries / expandedCompanies (Set<string>)，
 *          通过 toggleIndustry / toggleCompany 事件控制。
 *
 * 用法：
 *   <PositionsDrilldown
 *     :industries="industryGroups"
 *     :expanded-industries="expandedIndustries"
 *     :expanded-companies="expandedCompanies"
 *     @toggle-industry="onToggleIndustry"
 *     @toggle-company="onToggleCompany"
 *     @open-company-students="onOpenCompanyStudents"
 *     @open-position-students="onOpenPositionStudents"
 *   />
 */

interface ColumnConfig {
  title: string
  dataIndex?: string
  key: string
  width?: number
  fixed?: 'left' | 'right'
  ellipsis?: boolean
}

const props = defineProps<{
  industries: PositionIndustryGroup[]
  expandedIndustries: Set<string>
  expandedCompanies: Set<string>
}>()

const emit = defineEmits<{
  toggleIndustry: [industryId: string]
  toggleCompany: [industryId: string, companyId: string]
  openCompanyStudents: [company: PositionCompanyGroup]
  openPositionStudents: [row: PositionTableRow]
}>()

const { t } = useI18n()

/** drilldown 嵌套表 8 列定义（与原型一致：去掉 list 视图的"公司"和"行业"列） */
const DRILLDOWN_COLUMNS = computed<ColumnConfig[]>(() => [
  { title: t('common.shared.positions.col.positionName'), key: 'positionName', dataIndex: 'positionName', width: 240, fixed: 'left' },
  { title: t('common.shared.positions.col.positionCategory'), key: 'positionCategory', dataIndex: 'positionCategory', width: 100 },
  { title: t('common.shared.positions.col.department'), key: 'department', dataIndex: 'department', width: 100 },
  { title: t('common.shared.positions.col.location'), key: 'location', dataIndex: 'location', width: 110 },
  { title: t('common.shared.positions.col.recruitmentCycle'), key: 'recruitmentCycle', dataIndex: 'recruitmentCycle', width: 110 },
  { title: t('common.shared.positions.col.publishTime'), key: 'publishTime', dataIndex: 'publishTime', width: 100 },
  { title: t('common.shared.positions.col.deadline'), key: 'deadline', dataIndex: 'deadline', width: 100 },
  { title: t('common.shared.positions.col.myStudents'), key: 'studentCount', dataIndex: 'studentCount', width: 100, fixed: 'right' },
])

function isIndustryExpanded(industryId: string): boolean {
  return props.expandedIndustries.has(industryId)
}

function isCompanyExpanded(companyId: string): boolean {
  return props.expandedCompanies.has(companyId)
}

function toneTextColor(tone: IndustryTone | string): string {
  return INDUSTRY_TONE_TEXT_COLOR[tone as IndustryTone] || '#64748b'
}

function resolveCompanyLogoToneClass(
  company: PositionCompanyGroup,
  industry: PositionIndustryGroup,
): string {
  if (company.logoColor) return ''
  return `osg-positions-drilldown__company-logo--${industry.tone}`
}
</script>

<style scoped lang="scss">
.osg-positions-drilldown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.osg-positions-drilldown__industry {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 12px rgba(134, 148, 196, 0.08);
  overflow: hidden;
}

.osg-positions-drilldown__industry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  padding: 12px 16px;
  text-align: left;
  cursor: pointer;
}

.osg-positions-drilldown__industry-head--gold   { background: linear-gradient(90deg, #fff1bf 0%, #fffdf6 100%); }
.osg-positions-drilldown__industry-head--violet { background: linear-gradient(90deg, #f2e7ff 0%, #f8f5ff 100%); }
.osg-positions-drilldown__industry-head--blue   { background: linear-gradient(90deg, #ddebff 0%, #f8fbff 100%); }
.osg-positions-drilldown__industry-head--amber  { background: linear-gradient(90deg, #fff2c9 0%, #fffdf6 100%); }
.osg-positions-drilldown__industry-head--teal   { background: linear-gradient(90deg, #ccfbf1 0%, #f0fdfa 100%); }
.osg-positions-drilldown__industry-head--indigo { background: linear-gradient(90deg, #e0e7ff 0%, #f5f7ff 100%); }
.osg-positions-drilldown__industry-head--slate  { background: linear-gradient(90deg, #edf2f7 0%, #f8fafc 100%); }

.osg-positions-drilldown__industry-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.osg-positions-drilldown__industry-main strong {
  font-size: 15px;
}

.osg-positions-drilldown__companies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
}

.osg-positions-drilldown__company {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.osg-positions-drilldown__company-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #fff;
}

.osg-positions-drilldown__company-main-button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.osg-positions-drilldown__company-meta {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.osg-positions-drilldown__company-meta strong {
  display: block;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.osg-positions-drilldown__company-meta span {
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.osg-positions-drilldown__company-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.osg-positions-drilldown__company-logo--gold   { background: #a85a18; }
.osg-positions-drilldown__company-logo--violet { background: #7c3aed; }
.osg-positions-drilldown__company-logo--blue   { background: #2563eb; }
.osg-positions-drilldown__company-logo--amber  { background: #d97706; }
.osg-positions-drilldown__company-logo--teal   { background: #0f766e; }
.osg-positions-drilldown__company-logo--indigo { background: #4f46e5; }
.osg-positions-drilldown__company-logo--slate  { background: #64748b; }

.osg-positions-drilldown__official-link {
  font-size: 12px;
  color: #1f2937;
  text-decoration: none;
}

.osg-positions-drilldown__official-link:hover {
  color: #1677ff;
}

.osg-positions-drilldown__position-list {
  margin-left: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

@media (max-width: 1120px) {
  .osg-positions-drilldown__industry-head,
  .osg-positions-drilldown__company-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .osg-positions-drilldown__position-list {
    margin-left: 0;
  }
}
</style>
