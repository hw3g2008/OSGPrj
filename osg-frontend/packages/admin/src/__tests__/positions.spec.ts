import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const positionsViewPath = path.resolve(__dirname, '../views/career/positions/index.vue')
const positionFormModalPath = path.resolve(__dirname, '../views/career/positions/components/PositionFormModal.vue')
const batchUploadModalPath = path.resolve(__dirname, '../views/career/positions/components/BatchUploadModal.vue')
const positionStudentsModalPath = path.resolve(__dirname, '../views/career/positions/components/PositionStudentsModal.vue')
const positionApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/position.ts')
const positionServiceImplPath = path.resolve(__dirname, '../../../../../ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java')
const adminPositionsBackfillE2ePath = path.resolve(__dirname, '../../../../tests/e2e/admin-positions-backfill.e2e.spec.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

function readBlock(source: string, anchor: string, nextAnchor?: string) {
  const start = source.indexOf(anchor)
  if (start === -1) {
    throw new Error(`anchor not found: ${anchor}`)
  }
  if (!nextAnchor) {
    return source.slice(start)
  }
  const end = source.indexOf(nextAnchor, start + anchor.length)
  return end === -1 ? source.slice(start) : source.slice(start, end)
}

function readStyleRule(source: string, selector: string, nextSelector?: string) {
  const anchor = `${selector} {`
  const nextAnchor = nextSelector ? `\n\n${nextSelector} {` : undefined
  return readBlock(source, anchor, nextAnchor)
}

describe('岗位信息页面原型收口', () => {
  it('keeps the header as a two-row prototype action shell', () => {
    const source = readSource(positionsViewPath)
    const headerBlock = readBlock(source, '<div class="page-header">', '\n\n    <section class="positions-stats">')

    expect(headerBlock).toContain('岗位管理')
    expect(headerBlock).toContain('Job Tracker')
    expect(headerBlock).toContain('总浏览')
    expect(headerBlock).toContain('下钻视图')
    expect(headerBlock).toContain('列表视图')
    expect(headerBlock).toContain('导出')
    expect(headerBlock).toContain('批量上传')
    expect(headerBlock).toContain('下载模板')
    expect(headerBlock).toContain('新增岗位')
  })

  it('uses the compact prototype filter bar with publish preset and inline search', () => {
    const source = readSource(positionsViewPath)
    const filtersBlock = readBlock(source, '<div class="positions-filters">', '\n\n      <div v-if="loading"')

    expect(filtersBlock).toContain('岗位分类')
    expect(filtersBlock).toContain('行业')
    expect(filtersBlock).toContain('公司')
    expect(filtersBlock).toContain('地区')
    expect(filtersBlock).toContain('状态')
    expect(filtersBlock).toContain('招聘周期')
    expect(filtersBlock).toContain('发布时间')
    expect(filtersBlock).toContain('meta.publishPresets')
    expect(filtersBlock).toContain('placeholder="搜索岗位名称..."')
    expect(filtersBlock).toContain('重置')
    expect(filtersBlock).not.toContain('positions-date-range')
    expect(filtersBlock).not.toContain('>搜索<')
  })

  it('keeps the drilldown shell on prototype industry strips and summary footer', () => {
    const source = readSource(positionsViewPath)

    expect(source).toContain('positions-drilldown__industry-head')
    expect(source).toContain('positions-drilldown__company-head')
    expect(source).toContain('positions-drilldown__position-list')
    expect(source).toContain('getIndustryTone')
    expect(source).toContain('getIndustryIcon')
    expect(source).toContain('流程缩写')
    expect(source).toContain('processGlossaryText')
  })

  it('keeps the desktop shell on prototype-sized typography and spacing tokens', () => {
    const source = readSource(positionsViewPath)

    const titleRule = readStyleRule(source, '.page-title', '.page-title-en')
    const statsCardRule = readStyleRule(source, '.positions-stats__card', '.positions-stats__value')
    const statsValueRule = readStyleRule(source, '.positions-stats__value', '.positions-stats__label')
    const filtersRule = readStyleRule(source, '.positions-filters', '.positions-filter-select,\n.positions-filter-reset,\n.positions-filter-search')
    const searchRule = readStyleRule(source, '.positions-filter-search', '.positions-filter-search__input')
    const industryHeadRule = readStyleRule(source, '.positions-drilldown__industry-head', '.positions-drilldown__industry-head--gold')
    const industryTitleRule = readStyleRule(source, '.positions-drilldown__industry-main strong', '.positions-drilldown__industry-head--violet .positions-drilldown__industry-main strong,\n.positions-drilldown__industry-head--violet .positions-drilldown__industry-side')
    const summaryRule = readStyleRule(source, '.positions-summary', '.positions-summary__divider')
    const footerRule = readStyleRule(source, '.positions-footer', '@media (max-width: 1400px)')

    expect(titleRule).toContain('gap: 12px;')
    expect(titleRule).toContain('font-size: 36px;')

    expect(statsCardRule).toContain('padding: 16px;')
    expect(statsCardRule).toContain('border-radius: 10px;')
    expect(statsValueRule).toContain('font-size: 28px;')

    expect(filtersRule).toContain('gap: 10px;')
    expect(filtersRule).toContain('padding: 12px 16px;')
    expect(filtersRule).toContain('border-radius: 10px;')
    expect(searchRule).toContain('min-width: 160px;')

    expect(industryHeadRule).toContain('gap: 12px;')
    expect(industryHeadRule).toContain('padding: 12px 16px;')
    expect(industryTitleRule).toContain('font-size: 15px;')

    expect(summaryRule).toContain('gap: 10px;')
    expect(summaryRule).toContain('font-size: 13px;')
    expect(footerRule).toContain('padding: 12px 16px;')
    expect(footerRule).toContain('border-radius: 10px;')
    expect(footerRule).toContain('font-size: 13px;')
  })

  it('keeps the list view table in prototype column order with lightweight edit action', () => {
    const source = readSource(positionsViewPath)

    expect(source).toContain('岗位名称')
    expect(source).toContain('公司')
    expect(source).toContain('行业')
    expect(source).toContain('岗位分类')
    expect(source).toContain('地区')
    expect(source).toContain('招聘周期')
    expect(source).toContain('发布时间')
    expect(source).toContain('截止时间')
    expect(source).toContain('状态')
    expect(source).toContain('学员')
    expect(source).toContain('编辑')
    expect(source).not.toContain('positions-company-cell')
  })

  it('keeps add/edit position modal on the prototype sectioned form shell', () => {
    const source = readSource(positionFormModalPath)

    expect(source).toContain('基本信息')
    expect(source).toContain('公司信息')
    expect(source).toContain('展示时间')
    expect(source).toContain('投递备注')
    expect(source).toContain('到达结束时间后自动归档')
    expect(source).toContain('招聘周期')
    expect(source).toContain('可多选')
  })

  it('keeps the position modal shell on prototype scale and checkbox-style cycle layout', () => {
    const source = readSource(positionFormModalPath)
    const titleRule = readStyleRule(source, '.position-form-modal__title', '.position-form-modal__content')
    const sectionRule = readStyleRule(source, '.position-form-modal__section', '.position-form-modal__section h4')
    const footerRule = readStyleRule(source, '.position-form-modal__footer', '.position-form-modal__secondary,\n.position-form-modal__primary')

    expect(source).toContain('width="680px"')
    expect(source).toContain(":shell-class=\"'position-form-modal__shell'\"")
    expect(source).toContain('class="position-form-modal__cycle-option"')
    expect(source).toContain('type="checkbox"')
    expect(source).not.toContain('position-form-modal__cycle-chip')

    expect(titleRule).toContain('font-size: 18px;')
    expect(sectionRule).toContain('padding: 16px;')
    expect(sectionRule).toContain('border-radius: 10px;')
    expect(footerRule).toContain('padding-top: 22px;')
  })

  it('keeps region and city fields independently addressable for real ui automation', () => {
    const source = readSource(positionFormModalPath)

    expect(source).toContain('>大区 <')
    expect(source).toContain('>城市 <')
    expect(source).toContain("请先选择地区")
    expect(source).not.toContain("请先选择大区")
  })

  it('keeps edit status select inside the shared field shell for automation reuse', () => {
    const source = readSource(positionFormModalPath)

    expect(source).toContain('class="position-form-modal__field position-form-modal__status-field"')
  })

  it('keeps the batch upload modal on the prototype dropzone copy', () => {
    const source = readSource(batchUploadModalPath)

    expect(source).toContain('批量上传岗位')
    expect(source).toContain('拖拽文件到此处')
    expect(source).toContain('排重规则')
    expect(source).toContain('uploadRuleCopy')
    expect(source).toContain('uploadSteps')
  })

  it('keeps the position students modal on the prototype info strip and simple table', () => {
    const source = readSource(positionStudentsModalPath)

    expect(source).toContain('申请学员')
    expect(source).toContain('以下为该岗位的申请学员列表，求职状态由学员自行更新')
    expect(source).toContain('学生ID')
    expect(source).toContain('姓名')
    expect(source).toContain('岗位')
    expect(source).toContain('状态')
    expect(source).toContain('已上课时')
  })

  it('moves business metadata and candidates to formal position api sources', () => {
    const viewSource = readSource(positionsViewPath)
    const modalSource = readSource(positionFormModalPath)
    const apiSource = readSource(positionApiPath)

    expect(apiSource).toContain('export interface PositionMetaOption')
    expect(apiSource).toContain('export interface PositionMeta')
    expect(apiSource).toContain('getPositionMeta(')
    expect(apiSource).toContain('getPositionCompanyOptions(')
    expect(apiSource).toContain('getPositionStudents(')

    expect(viewSource).toContain('getPositionMeta')
    expect(viewSource).toContain('getPositionCompanyOptions')
    expect(viewSource).toContain('getPositionStudents')
    expect(viewSource).not.toContain('const trafficCount = 12580')
    expect(viewSource).not.toContain("const recruitmentCycleOptions = ['2024', '2025', '2026', '2027']")
    expect(viewSource).not.toContain('const industryPresentation: Record<string, { label: string; tone: string; icon: string }>')

    expect(modalSource).not.toContain('const categoryOptions = [')
    expect(modalSource).not.toContain("const companyTypeOptions = ['Investment Bank', 'Consulting', 'Tech', 'PE/VC', 'PE', 'VC', 'Other']")
    expect(modalSource).not.toContain("const recruitmentCycleOptions = ['2024', '2025', '2026', '2027']")
    expect(modalSource).not.toContain("const projectYearOptions = ['2024', '2025', '2026', '2027']")
    expect(modalSource).not.toContain('const regionOptions = [')
    expect(modalSource).not.toContain('const cityMap: Record<string, string[]> = {')
    expect(modalSource).toContain(':data-cycle-value="option.value"')
  })

  it('keeps recruitment cycles on formal business values instead of bare years', () => {
    const serviceSource = readSource(positionServiceImplPath)
    const e2eSource = readSource(adminPositionsBackfillE2ePath)

    expect(serviceSource).toContain('new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Summer", "2026 Summer"')
    expect(serviceSource).toContain('new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Full-time", "2026 Full-time"')
    expect(serviceSource).toContain('new DictSeed(DICT_RECRUITMENT_CYCLE, "Off-cycle", "Off-cycle"')
    expect(serviceSource).not.toContain('new DictSeed(DICT_RECRUITMENT_CYCLE, "2026", "2026"')
    expect(serviceSource).toContain('meta.put("recruitmentCycles", buildStaticOptions(DICT_RECRUITMENT_CYCLE));')
    expect(serviceSource).toContain('purgeObsoleteDictValues(DICT_RECRUITMENT_CYCLE, Set.of("2024", "2025", "2026", "2027"));')
    expect(serviceSource).toContain('normalizeLegacyRecruitmentCycles();')

    expect(e2eSource).toContain("recruitmentCycle: overrides.recruitmentCycle ?? '2026 Summer'")
    expect(e2eSource).toContain("recruitmentCycle: '2026 Summer'")
    expect(e2eSource).not.toContain("recruitmentCycle: overrides.recruitmentCycle ?? '2026'")
  })
})
