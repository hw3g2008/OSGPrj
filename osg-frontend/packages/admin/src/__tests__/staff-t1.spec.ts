import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const indexSrc = fs.readFileSync(path.join(root, 'views/users/staff/index.vue'), 'utf-8')
const formSrc = fs.readFileSync(path.join(root, 'views/users/staff/components/StaffFormModal.vue'), 'utf-8')
const detailSrc = fs.readFileSync(path.join(root, 'views/users/staff/components/StaffDetailModal.vue'), 'utf-8')
const statusSrc = fs.readFileSync(path.join(root, 'views/users/staff/components/StaffStatusModal.vue'), 'utf-8')

describe('T1 admin 导师列表 bug 修复', () => {
  it('AC-T1.2 状态筛选与状态文案统一为「正常 / 冻结」', () => {
    expect(indexSrc).toContain('<a-select-option value="0">正常</a-select-option>')
    expect(indexSrc).toContain('<a-select-option value="1">冻结</a-select-option>')
    expect(indexSrc).not.toContain('激活</a-select-option>')
    expect(indexSrc).toContain("'解冻' : '冻结'")
    expect(indexSrc).toContain("return '账号已冻结'")
    expect(indexSrc).toContain("return '导师账号已冻结'")
    expect(indexSrc).not.toMatch(/账号已禁用|导师账号已禁用/)
    expect(statusSrc).toContain("return '冻结导师账号'")
    expect(statusSrc).toContain("return '冻结后该导师账号将无法正常登录系统。'")
    expect(statusSrc).toContain("return '请选择冻结原因'")
    expect(statusSrc).not.toMatch(/'禁用导师账号'|'请选择禁用原因'|'禁用后该导师账号/)
  })

  it('AC-T1.1 黑名单 alert 改为「无法登录系统」', () => {
    expect(indexSrc).toContain('<strong>无法登录系统</strong>')
    expect(indexSrc).not.toMatch(/可以正常登录系统/)
  })

  it('AC-T1.3 类型筛选包含「助教」选项', () => {
    expect(indexSrc).toMatch(/<a-select-option value="assistant">助教<\/a-select-option>/)
  })

  it('AC-T1.4 擅长 MultiSelect 不带 :max-tag-count="0"', () => {
    const block = formSrc.match(/<a-form-item label="擅长">[\s\S]*?<\/a-form-item>/)
    expect(block).not.toBeNull()
    expect(block![0]).not.toContain(':max-tag-count="0"')
  })

  it('AC-T1.5 表单删除「行业」字段，任职公司全量', () => {
    expect(formSrc).not.toMatch(/<a-form-item label="行业">/)
    expect(formSrc).not.toMatch(/selectedIndustries/)
    expect(formSrc).toContain('allCompanyOptions')
    const block = formSrc.match(/<a-form-item label="任职公司">[\s\S]*?<\/a-form-item>/)
    expect(block).not.toBeNull()
    expect(block![0]).not.toContain(':disabled')
    expect(block![0]).not.toContain(':max-tag-count="0"')
  })

  it('AC-T1.6 评语字段仅在内部评估 section 内（仅超管 v-if 控制）', () => {
    expect(formSrc).toContain('v-model:value="form.ratingRemark"')
    expect(formSrc).toContain('请输入评语（选填，仅超管可见可写）')
    const internalSection = formSrc.match(/v-if="isSuperAdmin"[\s\S]*?<\/section>/)
    expect(internalSection).not.toBeNull()
    expect(internalSection![0]).toContain('form.ratingRemark')
    expect(detailSrc).toContain('detail.ratingRemark')
  })

  it('AC-T1.7 地区改 MultiSelect、city 非必填、列表按 CSV 渲染', () => {
    const block = formSrc.match(/<a-form-item label="地区">[\s\S]*?<\/a-form-item>/)
    expect(block).not.toBeNull()
    expect(block![0]).toContain('<MultiSelect')
    expect(block![0]).toContain('form.regions')
    expect(formSrc).not.toMatch(/message\.error\('请选择城市'\)/)
    expect(formSrc).toContain("region: form.regions.join(',')")
    expect(formSrc).toContain('city: form.city || undefined')
    expect(indexSrc).toContain('splitField(record.region)')
  })

  it('AC-T1.9 课时单价美元（列表 $/h、表单 prefix $、标签 USD/h）', () => {
    expect(indexSrc).toContain('return `$${hourlyRate}/h`')
    expect(detailSrc).toContain('return `$${hourlyRate}/h`')
    expect(formSrc).toContain('label="课时单价（USD/h）"')
    expect(formSrc).toMatch(/<template #prefix>\$<\/template>/)
  })

  it('AC-T1.10 编辑标题包含 ID', () => {
    expect(formSrc).toContain('编辑导师 - ${staff?.staffName || \'\'}（ID: ${staff?.staffId ?? \'-\'}）')
  })
})
