import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Bug-fix plan: docs/bugs/2026-05-08-admin-bug-fix-plan.md §T2
// AC-T2.1: 编辑导师排期弹窗不再显示节假日（无字段、无 class、无 tag、无图例、无 SCSS 样式）
// AC-T2.2: 列表页 ID 列独立呈现，第一列；staffName 单元格不再有 "ID: xxx" 副文本
// 表头折行修复：列宽与 students/staff 风格对齐（columns 独立文件 + 4 字汉字列 100 + ellipsis + fixed）

const schedulePagePath = path.resolve(
  __dirname,
  '../views/users/mentor-schedule/index.vue',
)
const columnsPath = path.resolve(
  __dirname,
  '../views/users/mentor-schedule/columns.ts',
)
const editModalPath = path.resolve(
  __dirname,
  '../views/users/mentor-schedule/components/EditScheduleModal.vue',
)

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

describe('AC-T2.2 mentor schedule list - ID independent column', () => {
  it('declares the ID column as the first entry of scheduleColumns', () => {
    const source = read(columnsPath)
    const start = source.indexOf('export const scheduleColumns = [')
    expect(start, 'scheduleColumns declaration must exist in columns.ts').toBeGreaterThan(-1)
    const end = source.indexOf(']', start)
    const block = source.slice(start, end + 1)

    // 第一列必须是 ID 列，宽度 80（与 students/columns 一致）
    const idIndex = block.indexOf("dataIndex: 'staffId'")
    const nameIndex = block.indexOf("dataIndex: 'staffName'")
    expect(idIndex, "scheduleColumns must include dataIndex: 'staffId'").toBeGreaterThan(-1)
    expect(nameIndex, "scheduleColumns must include dataIndex: 'staffName'").toBeGreaterThan(-1)
    expect(idIndex, 'staffId column must precede staffName column').toBeLessThan(nameIndex)
    expect(block).toContain("title: 'ID'")
    expect(block).toMatch(/dataIndex:\s*'staffId'[\s\S]*?width:\s*80/)
  })

  it('removes the secondary "ID: xxx" line from the staffName cell', () => {
    const source = read(schedulePagePath)

    // staffName 单元格内不再渲染 "ID: {{ record.staffId }}" 副文本
    expect(source).not.toMatch(/<div[^>]*>\s*ID:\s*\{\{\s*record\.staffId\s*\}\}\s*<\/div>/)
    // 兜底：原副文本的 inline style 标志也不应残留
    expect(source).not.toContain('font-size: 11px; color: var(--muted)')
  })

  it('aligns column widths and overflow strategy with students/staff convention', () => {
    const source = read(columnsPath)

    // 4 字汉字列宽 ≥ 100（防止表头折行：4×14 + 32 padding = 88，100 留 12 余量）
    expect(source).toMatch(/dataIndex:\s*'availableHours'[\s\S]*?width:\s*100/)
    // 导师名列含 ellipsis: true（与 staff/columns 的 staffName 一致，防止超长姓名折行）
    expect(source).toMatch(/dataIndex:\s*'staffName'[\s\S]*?ellipsis:\s*true/)
    // 操作列 fixed: 'right'（与 students/staff/columns 一致，窄屏水平滚动时操作列常驻）
    expect(source).toMatch(/dataIndex:\s*'action'[\s\S]*?fixed:\s*'right'/)
  })

  it('formatType handles all 3 staffType branches (lead_mentor / assistant / mentor)', () => {
    const source = read(schedulePagePath)

    // 必须有 lead_mentor === '班主任' 分支
    expect(source).toMatch(/staffType\s*===\s*'lead_mentor'[\s\S]{0,40}'班主任'/)
    // 必须有 assistant === '助教' 分支（修复用户截图反馈：搜索助教却显示"导师"）
    expect(source).toMatch(/staffType\s*===\s*'assistant'[\s\S]{0,40}'助教'/)
    // 默认 mentor 分支返回 '导师'（与 staff/index.vue 、StaffDetailModal 术语统一）
    expect(source).toContain("return '导师'")
    // 严禁出现 "专业导师" 术语（避免术语不一致）
    expect(source).not.toContain('专业导师')
  })

  it('select option for mentor uses 导师 (not 专业导师)', () => {
    const source = read(schedulePagePath)
    expect(source).toContain('<a-select-option value="mentor">导师</a-select-option>')
    expect(source).not.toMatch(/<a-select-option value="mentor">专业导师<\/a-select-option>/)
  })

  it('EditScheduleModal staff card meta uses formatStaffType helper with 3 branches', () => {
    const source = read(editModalPath)

    // 模板不再硬编码二元折 lead_mentor ? 班主任 : 专业导师
    expect(source).not.toMatch(/staffType\s*===\s*'lead_mentor'\s*\?\s*'班主任'\s*:\s*'专业导师'/)
    expect(source).not.toContain('专业导师')

    // helper 必须包含三分支
    expect(source).toMatch(/const\s+formatStaffType\s*=/)
    expect(source).toMatch(/staffType\s*===\s*'lead_mentor'[\s\S]{0,40}'班主任'/)
    expect(source).toMatch(/staffType\s*===\s*'assistant'[\s\S]{0,40}'助教'/)
    expect(source).toMatch(/return\s+'导师'/)

    // 模板调用 helper
    expect(source).toContain('{{ formatStaffType(record?.staffType) }}')
  })

  it('staffType tag color uses 3-branch helper (blue / cyan / purple)', () => {
    const source = read(schedulePagePath)

    // 模板使用 getTypeColor helper 而非硬编码三元
    expect(source).toContain(':color="getTypeColor(record.staffType)"')
    expect(source).not.toMatch(/:color="record\.staffType\s*===\s*'lead_mentor'\s*\?\s*'blue'\s*:\s*'purple'"/)
    // helper 包含 3 个分支
    expect(source).toMatch(/staffType\s*===\s*'lead_mentor'[\s\S]{0,40}'blue'/)
    expect(source).toMatch(/staffType\s*===\s*'assistant'[\s\S]{0,40}'cyan'/)
    expect(source).toMatch(/return\s+'purple'/)
  })
})

describe('AC-T2.1 mentor schedule edit modal - holiday UI fully removed', () => {
  it('drops the holiday field from the weekdays computed return', () => {
    const source = read(editModalPath)
    // weekdays 中不再返回 holiday 字段
    expect(source).not.toMatch(/holiday\s*:\s*false/)
    // 即便后续误加 holiday 任意值，也禁止出现裸 holiday key
    const weekdaysStart = source.indexOf('const weekdays = computed(() =>')
    expect(weekdaysStart, 'weekdays computed must exist').toBeGreaterThan(-1)
    const weekdaysBlock = source.slice(weekdaysStart, weekdaysStart + 600)
    expect(weekdaysBlock).not.toMatch(/holiday\s*:/)
  })

  it('removes holiday-related class bindings, tag rendering, legend, and SCSS modifiers', () => {
    const source = read(editModalPath)

    // 模板：不再有 esm-day-row--holiday class 绑定
    expect(source).not.toContain("'esm-day-row--holiday'")
    // 模板：不再有 esm-day-row__tag--holiday class
    expect(source).not.toContain('esm-day-row__tag--holiday')
    // 模板：不再渲染节假日图例 swatch
    expect(source).not.toContain('esm-day-hint__swatch--holiday')
    // 模板：不再有任何「节假日」中文字面量（tag 文字 + 图例文字）
    expect(source).not.toContain('节假日')

    // SCSS：清理 5 处 --holiday 修饰符
    expect(source).not.toMatch(/&--holiday\s*\{/)
    expect(source).not.toMatch(/&--holiday\s*&__/)
  })

  it('keeps weekend tag/legend/style intact (regression guard)', () => {
    const source = read(editModalPath)

    // 周末相关代码仍保留
    expect(source).toContain("'esm-day-row--weekend'")
    expect(source).toContain('esm-day-row__tag--weekend')
    expect(source).toContain('esm-day-hint__swatch--weekend')
    expect(source).toContain('周末')
  })
})
