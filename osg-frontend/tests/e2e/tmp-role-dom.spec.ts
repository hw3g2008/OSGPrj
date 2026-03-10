import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('dump modal-edit-role triggers', async ({ page }) => {
  const token = 'codex-admin-token'
  await page.addInitScript(({ token }) => {
    localStorage.setItem('osg_token', token)
  }, { token })

  const fixturesRoot = path.resolve('/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/fixtures')
  const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(fixturesRoot, rel), 'utf8'))
  const ok = (data: unknown) => ({ code: 200, msg: '操作成功', data })

  await page.route('**/api/login', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: '操作成功', token }) }))
  await page.route('**/api/getInfo', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok(json('permission/common/getInfo.json'))) }))
  await page.route('**/api/getRouters', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok([{"path":"/dashboard"}])) }))
  await page.route('**/api/system/role/list**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json('permission/roles/list.json')) }))
  await page.route('**/api/system/menu/treeselect', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))

  await page.goto('/permission/roles')
  await page.waitForLoadState('networkidle')
  console.log('URL', page.url())
  console.log('TITLE', await page.title())
  const h2 = await page.locator('h2').first().textContent().catch(() => null)
  console.log('H2', h2)
  const rowCount = await page.locator('tbody tr').count()
  console.log('ROW_COUNT', rowCount)
  const tableText = await page.locator('body').innerText()
  console.log('BODY_SNIPPET', tableText.slice(0, 500))
  const data = await page.locator('[data-surface-trigger="modal-edit-role"]').evaluateAll((els) => els.map((el) => ({
    tag: el.tagName,
    sample: el.getAttribute('data-surface-sample'),
    sampleKey: el.getAttribute('data-surface-sample-key'),
    text: el.textContent?.trim(),
    outer: el.outerHTML.slice(0, 240)
  })))
  console.log('TRIGGERS', JSON.stringify(data, null, 2))
})
