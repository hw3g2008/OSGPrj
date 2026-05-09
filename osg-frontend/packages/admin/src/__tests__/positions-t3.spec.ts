import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const positionsViewPath = path.resolve(__dirname, '../views/career/positions/index.vue')
const positionFormModalPath = path.resolve(__dirname, '../views/career/positions/components/PositionFormModal.vue')
const positionApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/position.ts')
const positionServicePath = path.resolve(__dirname, '../../../../../ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java')
const positionDomainPath = path.resolve(__dirname, '../../../../../ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgPosition.java')
const positionMapperPath = path.resolve(__dirname, '../../../../../ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml')
const positionControllerPath = path.resolve(__dirname, '../../../../../ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java')
const sqlAttachmentsPath = path.resolve(__dirname, '../../../../../sql/migrations/2026-05-08-position-add-attachments.sql')
const sqlNotStartedPath = path.resolve(__dirname, '../../../../../sql/migrations/2026-05-08-position-display-status-not-started.sql')

const readSource = (p: string) => fs.readFileSync(p, 'utf-8')

describe('Admin 岗位管理 T3 修复（第一波 · T3.2/T3.5/T3.6/T3.13）', () => {
  it('AC-T3.2 删除底部"流程缩写"alert + computed', () => {
    const source = readSource(positionsViewPath)
    expect(source).not.toContain('流程缩写')
    expect(source).not.toContain('processGlossaryText')
  })

  it('AC-T3.5 编辑表单"添加人"输入框 disabled', () => {
    const source = readSource(positionFormModalPath)
    expect(source).toMatch(/<a-input[^>]*v-model:value="form\.createBy"[^>]*\sdisabled/)
    expect(source).toContain('placeholder="自动带出当前登录用户"')
  })

  it('AC-T3.6.a 编辑表单 deadlineText 默认值为空（不再硬编码 Rolling ASAP）', () => {
    const source = readSource(positionFormModalPath)
    expect(source).not.toContain("'Rolling ASAP'")
    expect(source).toContain("form.deadlineText = seed.deadlineText || ''")
  })

  it('AC-T3.6.b 提交时 deadline 与 deadlineText 互斥（deadline 存在则 deadlineText 置 undefined）', () => {
    const source = readSource(positionFormModalPath)
    expect(source).toContain('deadlineText: form.deadline ? undefined : (form.deadlineText || undefined)')
  })

  it('AC-T3.6.c 列表/下钻渲染优先 deadline，其次 deadlineText', () => {
    const source = readSource(positionsViewPath)
    // drilldown
    expect(source).toMatch(/column\.dataIndex === 'deadline'\s*">\s*<template v-if="position\.deadline">/)
    // list
    expect(source).toMatch(/column\.dataIndex === 'deadlineDisplay'\s*">\s*<template v-if="record\.deadline">/)
  })

  it('AC-T3.13.a drilldown/list 表头新增"添加日期"列', () => {
    const source = readSource(positionsViewPath)
    const matches = source.match(/title:\s*'添加日期'/g) || []
    expect(matches.length).toBe(2)
    expect(source).toContain("dataIndex: 'createTime'")
  })

  it('AC-T3.13.b 表格 bodyCell 渲染 createTime（drilldown + list 各一处，使用 formatShortDate）', () => {
    const source = readSource(positionsViewPath)
    const drilldownMatch = source.match(
      /column\.dataIndex === 'createTime'">\{\{ formatShortDate\(position\.createTime\) \}\}/
    )
    const listMatch = source.match(
      /column\.dataIndex === 'createTime'">\{\{ formatShortDate\(record\.createTime\) \}\}/
    )
    expect(drilldownMatch).not.toBeNull()
    expect(listMatch).not.toBeNull()
  })

  it('AC-T3.13.c PositionListItem 类型加 createTime 字段', () => {
    const source = readSource(positionApiPath)
    expect(source).toMatch(/createTime\?:\s*string/)
  })

  it('AC-T3.13.d 后端 toPositionMap 返回 createTime 字段', () => {
    const source = readSource(positionServicePath)
    expect(source).toContain('row.put("createTime", position.getCreateTime())')
    expect(source).toContain('row.put("createBy"')
  })
})

describe('Admin 岗位管理 T3 修复（第二波 · T3.4/T3.8/T3.15/T3.17）', () => {
  // ===== T3.4 投递备注附件 =====
  it('AC-T3.4.schema SQL migration 新增 application_attachments TEXT 字段', () => {
    const sql = readSource(sqlAttachmentsPath)
    expect(sql).toMatch(/ALTER TABLE\s+osg_position\s+ADD COLUMN\s+application_attachments\s+TEXT/i)
  })

  it('AC-T3.4.domain OsgPosition.java 加 applicationAttachments 字段 + getter/setter', () => {
    const source = readSource(positionDomainPath)
    expect(source).toContain('private String applicationAttachments;')
    expect(source).toContain('getApplicationAttachments()')
    expect(source).toContain('setApplicationAttachments(String applicationAttachments)')
  })

  it('AC-T3.4.mapper OsgPositionMapper.xml resultMap + columns + insert + update 全部含 application_attachments', () => {
    const source = readSource(positionMapperPath)
    expect(source).toContain('property="applicationAttachments" column="application_attachments"')
    expect(source).toContain('p.application_attachments')
    expect(source).toContain('application_attachments = #{applicationAttachments,jdbcType=VARCHAR}')
  })

  it('AC-T3.4.service buildPosition 序列化 + toPositionMap 反序列化 + mergeFallback 同步', () => {
    const source = readSource(positionServicePath)
    expect(source).toContain('position.setApplicationAttachments(serializeAttachments(body.get("applicationAttachments")))')
    expect(source).toContain('row.put("applicationAttachments", deserializeAttachments(position.getApplicationAttachments()))')
    expect(source).toMatch(/private String serializeAttachments\(Object value\)/)
    expect(source).toMatch(/private List<Map<String, Object>> deserializeAttachments\(String json\)/)
    // mergeFallback 同步 attachments
    expect(source).toMatch(/if \(payload\.getApplicationAttachments\(\) != null\)\s*\{\s*current\.setApplicationAttachments/)
  })

  it('AC-T3.4.controller /attachment 上传 API：双层 MIME 校验 + 10MB 限制 + 5 类型白名单', () => {
    const source = readSource(positionControllerPath)
    expect(source).toContain('@PostMapping("/attachment")')
    expect(source).toContain('public AjaxResult uploadAttachment(@RequestParam("file") MultipartFile file)')
    expect(source).toContain('ATTACHMENT_MAX_SIZE_BYTES = 10L * 1024 * 1024')
    // 双层 MIME（声明 + probe）
    expect(source).toMatch(/declaredType\s*==\s*null\s*\|\|\s*!ATTACHMENT_MIME_WHITELIST\.contains/)
    expect(source).toMatch(/probedType\s*!=\s*null\s*&&\s*!ATTACHMENT_MIME_WHITELIST\.contains/)
    // 5 类型白名单（pdf/jpg/jpeg/png/gif）
    expect(source).toMatch(/ATTACHMENT_EXTENSIONS\s*=\s*\{\s*"pdf",\s*"jpg",\s*"jpeg",\s*"png",\s*"gif"\s*\}/)
  })

  it('AC-T3.4.frontend.modal PositionFormModal 加 a-upload + 完整校验 handlers', () => {
    const source = readSource(positionFormModalPath)
    expect(source).toContain('<a-upload')
    expect(source).toContain(':action="ATTACHMENT_UPLOAD_ACTION"')
    expect(source).toContain(':before-upload="handleAttachmentBeforeUpload"')
    expect(source).toContain('@change="handleAttachmentChange"')
    expect(source).toContain(':remove="handleAttachmentRemove"')
    expect(source).toContain("ATTACHMENT_UPLOAD_ACTION = '/api/admin/position/attachment'")
    expect(source).toContain('ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024')
    expect(source).toContain('ATTACHMENT_MAX_TOTAL_BYTES = 30 * 1024 * 1024')
    expect(source).toContain('ATTACHMENT_MAX_COUNT = 5')
  })

  it('AC-T3.4.frontend.types PositionAttachment / PositionListItem / PositionPayload 含 applicationAttachments', () => {
    const source = readSource(positionApiPath)
    expect(source).toMatch(/export interface PositionAttachment\s*\{[^}]*url:\s*string[^}]*fileName:\s*string[^}]*fileType:\s*string[^}]*size:\s*number/s)
    expect(source).toMatch(/applicationAttachments\?:\s*PositionAttachment\[\]/g)
  })

  // ===== T3.8 not_started 派生子状态 =====
  it('AC-T3.8.sql dict_data 加 not_started 派生子状态行', () => {
    const sql = readSource(sqlNotStartedPath)
    expect(sql).toMatch(/INSERT INTO sys_dict_data/i)
    expect(sql).toContain("'not_started'")
    expect(sql).toContain("'osg_position_display_status'")
    expect(sql).toContain("'未开始'")
  })

  it('AC-T3.8.service seedStaticDicts 加 not_started + applyDerivedDisplayStatus 派生逻辑', () => {
    const source = readSource(positionServicePath)
    expect(source).toContain('new DictSeed(DICT_POSITION_DISPLAY_STATUS, "not_started", "未开始", 0L')
    expect(source).toMatch(/private void applyDerivedDisplayStatus\(OsgPosition row\)/)
    // selectPositionList 末尾派生
    expect(source).toContain('rows.forEach(this::applyDerivedDisplayStatus)')
    // normalizeDisplayStatus 接受 not_started
    expect(source).toContain('case "visible", "hidden", "expired", "not_started" -> normalized')
  })

  it('AC-T3.8.frontend index.vue statusToneToColor 加 default → default（not_started 用）', () => {
    const source = readSource(positionsViewPath)
    expect(source).toMatch(/statusToneToColor[^}]*default:\s*'default'/s)
  })

  // ===== T3.15 PositionImportTemplate 18 列 =====
  it('AC-T3.15 PositionImportTemplate 严格 18 列 + 字段顺序', () => {
    const source = readSource(positionControllerPath)
    const tplMatch = source.match(/private static class PositionImportTemplate\s*\{([\s\S]*?)\n\s*\}/)
    expect(tplMatch).not.toBeNull()
    const tplBody = tplMatch![1]
    const excelNames = Array.from(tplBody.matchAll(/@Excel\(name = "([^"]+)"/g)).map((m) => m[1])
    expect(excelNames).toEqual([
      '岗位分类', '岗位名称', '公司名称', '公司类别', '公司官网', '岗位链接', '部门', '地区', '城市',
      '招聘周期', '对应主攻方向', '项目时间', '展示开始时间', '展示结束时间', '截止日期', '截止文案',
      '投递备注', '岗位状态'
    ])
  })

  // ===== T3.17 PositionExportRow 22 列 =====
  it('AC-T3.17 PositionExportRow 严格 22 列 + 字段顺序', () => {
    const source = readSource(positionControllerPath)
    const tplMatch = source.match(/private static class PositionExportRow\s*\{([\s\S]*?)\n\s*\}/)
    expect(tplMatch).not.toBeNull()
    const tplBody = tplMatch![1]
    const excelNames = Array.from(tplBody.matchAll(/@Excel\(name = "([^"]+)"/g)).map((m) => m[1])
    expect(excelNames).toEqual([
      '岗位分类', '岗位名称', '公司名称', '公司类别', '公司官网', '岗位链接', '部门', '地区', '城市',
      '招聘周期', '对应主攻方向', '项目时间', '展示开始时间', '展示结束时间', '截止日期', '截止文案',
      '投递备注', '附件数量', '岗位状态', '添加人', '添加日期', '申请学员数'
    ])
  })
})
