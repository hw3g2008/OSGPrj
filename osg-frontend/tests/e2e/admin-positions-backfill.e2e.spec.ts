import { execFileSync } from 'node:child_process'
import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

function buildUploadBuffer(duplicateCompanyName: string, uniqueCompanyName: string) {
  const script = `
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
import base64
import sys

duplicate_company = sys.argv[1]
unique_company = sys.argv[2]
headers = ['company_name','position_name','region','city','project_year','industry','position_category','company_type','recruitment_cycle']
rows = [
    [duplicate_company, 'Runtime Analyst', 'na', 'New York', '2026', 'Investment Bank', 'summer', 'Investment Bank', '2026 Summer'],
    [unique_company, 'Runtime Associate', 'eu', 'London', '2026', 'Consulting', 'fulltime', 'Consulting', '2026 Summer'],
]

def col(n):
    s = ''
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s

def esc(value):
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

sheet_rows = []
for row_index, row in enumerate([headers] + rows, start=1):
    cells = []
    for col_index, value in enumerate(row, start=1):
        ref = f'{col(col_index)}{row_index}'
        cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{esc(value)}</t></is></c>')
    sheet_rows.append(f'<row r="{row_index}">' + ''.join(cells) + '</row>')

worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' \
    + ''.join(sheet_rows) \
    + '</sheetData></worksheet>'
workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
workbook_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
content_types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'
styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>codex</dc:creator><cp:lastModifiedBy>codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2026-03-16T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-03-16T00:00:00Z</dcterms:modified></cp:coreProperties>'
app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' \
    + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex</Application></Properties>'

buffer = BytesIO()
with ZipFile(buffer, 'w', ZIP_DEFLATED) as workbook_zip:
    workbook_zip.writestr('[Content_Types].xml', content_types)
    workbook_zip.writestr('_rels/.rels', rels)
    workbook_zip.writestr('docProps/core.xml', core)
    workbook_zip.writestr('docProps/app.xml', app)
    workbook_zip.writestr('xl/workbook.xml', workbook)
    workbook_zip.writestr('xl/_rels/workbook.xml.rels', workbook_rels)
    workbook_zip.writestr('xl/styles.xml', styles)
    workbook_zip.writestr('xl/worksheets/sheet1.xml', worksheet)

print(base64.b64encode(buffer.getvalue()).decode())
`

  const base64 = execFileSync('python3', ['-c', script, duplicateCompanyName, uniqueCompanyName], {
    encoding: 'utf-8',
  }).trim()
  return Buffer.from(base64, 'base64')
}

interface PositionSeed {
  positionId: number
  companyName: string
  positionName: string
}

function trackRuntimeErrors(page: Page) {
  const pageErrors: string[] = []
  const apiErrors: string[] = []

  page.on('pageerror', (error) => {
    pageErrors.push(String(error))
  })

  page.on('response', async (response) => {
    const request = response.request()
    const url = response.url()
    const isApi = request.resourceType() === 'xhr' || request.resourceType() === 'fetch'
    if (!isApi || !url.includes('/api/')) {
      return
    }
    if (response.status() >= 500) {
      apiErrors.push(`${response.status()} ${url}`)
      return
    }
    const contentType = response.headers()['content-type'] || ''
    if (!contentType.includes('application/json')) {
      return
    }
    try {
      const body = await response.json()
      if (body && typeof body === 'object' && 'code' in body && body.code !== 200) {
        apiErrors.push(`${body.code} ${url} msg=${String(body.msg || '').slice(0, 120)}`)
      }
    } catch {
      // ignore invalid json bodies advertised incorrectly
    }
  })

  return { pageErrors, apiErrors }
}

async function withRetries<T>(operation: () => Promise<T>, attempts: number = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === attempts) {
        throw error
      }
    }
  }
  throw lastError
}

async function openPositionsPage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  await page.goto('/career/positions', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /岗位管理/i })).toBeVisible()
  await expect(page.locator('.positions-stats__card').first()).toBeVisible()
  return runtime
}

function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function seedPosition(
  request: APIRequestContext,
  overrides: Partial<{
    companyName: string
    positionName: string
    industry: string
    companyType: string
    region: string
    city: string
    recruitmentCycle: string
    projectYear: string
    displayStatus: string
    positionCategory: string
    positionUrl: string
    applicationNote: string
  }> = {},
): Promise<PositionSeed> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const suffix = `${Date.now()}`.slice(-6) + `${Math.floor(Math.random() * 100)}`.padStart(2, '0')
  const companyName = overrides.companyName ?? `Runtime Co ${suffix}`
  const positionName = overrides.positionName ?? `Runtime Role ${suffix}`
  const body = await assertRuoyiSuccess(
    request.post('/api/admin/position', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        positionCategory: overrides.positionCategory ?? 'summer',
        industry: overrides.industry ?? 'Investment Bank',
        companyName,
        companyType: overrides.companyType ?? overrides.industry ?? 'Investment Bank',
        companyWebsite: `https://example.com/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        positionName,
        department: 'Runtime Team',
        region: overrides.region ?? 'na',
        city: overrides.city ?? 'New York',
        recruitmentCycle: overrides.recruitmentCycle ?? '2026 Summer',
        projectYear: overrides.projectYear ?? '2026',
        displayStatus: overrides.displayStatus ?? 'visible',
        displayStartTime: `${offsetDate(-2)}T09:00`,
        displayEndTime: `${offsetDate(90)}T18:00`,
        positionUrl: overrides.positionUrl ?? `https://example.com/jobs/${suffix}`,
        applicationNote: overrides.applicationNote ?? 'runtime backfill seed',
      },
    }),
    '/api/admin/position',
  )

  return {
    positionId: body?.data?.positionId as number,
    companyName,
    positionName,
  }
}

async function ensureDuplicateUploadBaseline(request: APIRequestContext): Promise<PositionSeed> {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const body = await assertRuoyiSuccess(
    request.get('/api/admin/position/list?pageNum=1&pageSize=100&keyword=Runtime%20Analyst', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    '/api/admin/position/list',
  )
  const existing = (body?.rows || []).find((row: Record<string, unknown>) =>
    row.companyName === 'Backfill Capital'
    && row.positionName === 'Runtime Analyst'
    && row.city === 'New York'
    && String(row.projectYear || '') === '2026',
  )
  if (existing) {
    return {
      positionId: Number(existing.positionId),
      companyName: 'Backfill Capital',
      positionName: 'Runtime Analyst',
    }
  }
  return seedPosition(request, {
    companyName: 'Backfill Capital',
    positionName: 'Runtime Analyst',
    industry: 'Investment Bank',
    companyType: 'Investment Bank',
    region: 'na',
    city: 'New York',
    recruitmentCycle: '2026 Summer',
    projectYear: '2026',
  })
}

async function fetchExportBody(request: APIRequestContext, template: boolean) {
  const { token } = await withRetries(() => loginAsAdminApi(request))
  const response = await request.get(`/api/admin/position/export?template=${template ? 'true' : 'false'}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok(), 'position export api should return HTTP 2xx').toBeTruthy()
  return response.body()
}

async function searchPosition(page: Page, keyword: string) {
  const searchResponse = Promise.all([
    waitForApi(page, '/api/admin/position/list', 'GET'),
    waitForApi(page, '/api/admin/position/stats', 'GET'),
    waitForApi(page, '/api/admin/position/drill-down', 'GET'),
  ])
  await page.getByPlaceholder('搜索岗位名称...').fill(keyword)
  await page.getByRole('button', { name: /^搜索$/ }).click()
  await searchResponse
}

test.describe('Admin Positions Ticket Backfill @ticket-backfill', () => {
  test('positions page supports stats, drilldown, list view, and keyword search', async ({ page, request }) => {
    const seeded = await seedPosition(request, {
      companyName: `Runtime Capital ${Date.now()}`,
      positionName: `Runtime Analyst ${Date.now()}`,
    })
    const runtime = await openPositionsPage(page)

    await searchPosition(page, seeded.positionName)
    await expect(page.locator('.positions-drilldown__industry').first()).toContainText(seeded.companyName)
    await expect(page.locator('.positions-stats__card').first()).toContainText('总岗位数')

    await page.getByRole('button', { name: '列表视图' }).click()
    const firstRow = page.locator('.positions-table tbody tr').first()
    await expect(firstRow).toContainText(seeded.companyName)
    await expect(firstRow).toContainText(seeded.positionName)

    expect(runtime.pageErrors, 'positions list runtime errors').toEqual([])
    expect(runtime.apiErrors, 'positions list api runtime errors').toEqual([])
  })

  test('positions create edit and export flow persist through the real page', async ({ page, request }) => {
    const runtime = await openPositionsPage(page)
    const suffix = `${Date.now()}`
    const companyName = `Runtime Growth ${suffix}`
    const positionName = `Runtime Associate ${suffix}`

    await page.getByRole('button', { name: /新增岗位/i }).click()
    const formModal = page.locator('[data-surface-id="position-form-modal"]')
    await expect(formModal).toBeVisible()
    await formModal.locator('.position-form-modal__field').filter({ hasText: '岗位分类' }).locator('select').selectOption('fulltime')
    await formModal.getByPlaceholder('如 Summer Analyst').fill(positionName)
    await formModal.getByPlaceholder('如 Investment Banking Division').fill('Runtime Coverage')
    await formModal.locator('.position-form-modal__field').filter({ hasText: '项目时间' }).locator('select').selectOption('2026')
    await formModal.locator('.position-form-modal__cycle-option[data-cycle-value="2026 Summer"]').click()
    await formModal.getByPlaceholder('搜索或输入公司名称').fill(companyName)
    await formModal.locator('.position-form-modal__field').filter({ hasText: '公司类别' }).locator('select').selectOption('Tech')
    await formModal.locator('.position-form-modal__field').filter({ hasText: '大区' }).locator('select').selectOption('ap')
    await formModal.locator('.position-form-modal__field').filter({ hasText: '城市' }).locator('select').selectOption('Singapore')
    await formModal.getByPlaceholder('https://company.com/jobs/...').fill(`https://example.com/${suffix}`)
    await formModal.locator('textarea').fill('runtime create path')

    const createResponses = Promise.all([
      waitForApi(page, '/api/admin/position', 'POST'),
      waitForApi(page, '/api/admin/position/list', 'GET'),
      waitForApi(page, '/api/admin/position/stats', 'GET'),
      waitForApi(page, '/api/admin/position/drill-down', 'GET'),
    ])
    await formModal.getByRole('button', { name: '新增岗位' }).click()
    await createResponses
    await expect(formModal).toBeHidden()

    await page.getByRole('button', { name: '列表视图' }).click()
    await searchPosition(page, positionName)

    const firstRow = page.locator('.positions-table tbody tr').first()
    await expect(firstRow).toContainText(companyName)
    await firstRow.getByRole('button', { name: '编辑' }).click()
    await expect(formModal).toBeVisible()
    await formModal.locator('.position-form-modal__field').filter({ hasText: '岗位状态' }).locator('select').selectOption('hidden')
    await formModal.locator('textarea').fill('runtime edited note')

    const editResponses = Promise.all([
      waitForApi(page, '/api/admin/position', 'PUT'),
      waitForApi(page, '/api/admin/position/list', 'GET'),
      waitForApi(page, '/api/admin/position/stats', 'GET'),
      waitForApi(page, '/api/admin/position/drill-down', 'GET'),
    ])
    await formModal.getByRole('button', { name: '保存岗位' }).click()
    await editResponses
    await expect(formModal).toBeHidden()
    await expect(page.locator('.positions-table tbody tr').first()).toContainText('已隐藏')

    const exportResponse = waitForApi(page, '/api/admin/position/export', 'GET')
    await page.getByRole('button', { name: /^导出$/ }).click()
    const exportApi = await exportResponse
    expect(exportApi.status()).toBe(200)

    const templateResponse = waitForApi(page, '/api/admin/position/export', 'GET')
    await page.getByRole('button', { name: /下载模板/i }).click()
    const templateApi = await templateResponse
    expect(templateApi.status()).toBe(200)

    const exportBody = await fetchExportBody(request, false)
    const templateBody = await fetchExportBody(request, true)
    expect(exportBody.length).toBeGreaterThan(0)
    expect(templateBody.length).toBeGreaterThan(0)

    expect(runtime.pageErrors, 'positions create/edit runtime errors').toEqual([])
    expect(runtime.apiErrors, 'positions create/edit api runtime errors').toEqual([])
  })

  test('positions batch upload skips duplicates and anonymous api access is rejected', async ({ page, request }) => {
    await ensureDuplicateUploadBaseline(request)
    const runtime = await openPositionsPage(page)
    const uniqueCompanyName = `Backfill Ventures ${Date.now()}`

    await page.getByRole('button', { name: /批量上传/i }).click()
    const batchModal = page.locator('[data-surface-id="position-batch-upload-modal"]')
    await expect(batchModal).toBeVisible()
    await batchModal.locator('input[type="file"]').setInputFiles({
      name: 'positions.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buildUploadBuffer('Backfill Capital', uniqueCompanyName),
    })

    const uploadResponses = Promise.all([
      waitForApi(page, '/api/admin/position/batch-upload', 'POST'),
      waitForApi(page, '/api/admin/position/list', 'GET'),
      waitForApi(page, '/api/admin/position/stats', 'GET'),
      waitForApi(page, '/api/admin/position/drill-down', 'GET'),
    ])
    await batchModal.getByRole('button', { name: '上传文件' }).click()
    const [uploadApi] = await uploadResponses
    const uploadBody = await uploadApi.json()
    expect(uploadBody.code).toBe(200)
    expect(uploadBody.data.successCount).toBe(1)
    expect(uploadBody.data.duplicateCount).toBe(1)
    expect(uploadBody.data.duplicates[0]).toBe('Backfill Capital / Runtime Analyst / New York / 2026')
    await expect(batchModal).toBeHidden()

    await page.getByRole('button', { name: '列表视图' }).click()
    await searchPosition(page, 'Runtime Associate')
    await expect(page.locator('.positions-table tbody tr').first()).toContainText(uniqueCompanyName)

    const anonymousResponse = await request.get('/api/admin/position/list?pageNum=1&pageSize=10')
    const anonymousText = await anonymousResponse.text()
    let anonymousBody: Record<string, unknown> = {}
    try {
      anonymousBody = JSON.parse(anonymousText) as Record<string, unknown>
    } catch {
      anonymousBody = { raw: anonymousText }
    }
    expect(
      anonymousResponse.status() !== 200 || anonymousBody.code !== 200,
      `anonymous position access should be rejected, status=${anonymousResponse.status()}, body=${anonymousText.slice(0, 300)}`,
    ).toBeTruthy()

    expect(runtime.pageErrors, 'positions batch upload runtime errors').toEqual([])
    expect(runtime.apiErrors, 'positions batch upload api runtime errors').toEqual([])
  })
})
