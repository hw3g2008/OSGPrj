import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('dump user modal triggers', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE_ERROR', msg.text())
    }
  })

  const token = 'codex-admin-token'
  await page.addInitScript(({ token }) => {
    localStorage.setItem('osg_token', token)
  }, { token })

  const fixturesRoot = path.resolve('/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/fixtures')
  const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(fixturesRoot, rel), 'utf8'))
  const ok = (data: unknown) => ({ code: 200, msg: '操作成功', data })

  await page.route('**/api/login', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: '操作成功', token }) }))
  await page.route('**/api/getInfo', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok(json('permission/common/getInfo.json'))) }))
  await page.route('**/api/getRouters', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok([{ path: '/dashboard' }])) }))
  await page.route('**/api/system/user/list**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json('permission/users/list.json')) }))
  await page.route('**/api/system/role/optionselect', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok(json('permission/users/role-options.json'))) }))

  await page.goto('/permission/users')
  await page.waitForLoadState('networkidle')

  console.log('URL', page.url())
  console.log('TITLE', await page.title())
  const body = await page.locator('body').innerText()
  console.log('BODY_SNIPPET', body.slice(0, 1200))

  const checks: Array<[string, string, string]> = [
    ['modal-add-admin', '[data-surface-trigger="modal-add-admin"]', '[data-surface-id="modal-add-admin"] [data-surface-part="shell"]'],
    ['modal-edit-admin', '[data-surface-trigger="modal-edit-admin"][data-surface-sample-key="clerk001"]', '[data-surface-id="modal-edit-admin"] [data-surface-part="shell"]'],
    ['modal-reset-password', '[data-surface-trigger="modal-reset-password"][data-surface-sample-key="clerk001"]', '[data-surface-id="modal-reset-password"] [data-surface-part="shell"]'],
  ]

  for (const [id, triggerSel, rootSel] of checks) {
    const trigger = page.locator(triggerSel).first()
    console.log('\nID', id)
    console.log('trigger count', await page.locator(triggerSel).count())
    console.log('trigger tag', await trigger.evaluate(el => el.tagName).catch(e => `ERR:${e.message}`))
    await trigger.click({ timeout: 5000 }).catch(e => console.log('click err', e.message))
    await page.waitForTimeout(400)
    const root = page.locator(rootSel).first()
    console.log('root count', await page.locator(rootSel).count())
    console.log('root visible', await root.isVisible().catch(e => `ERR:${e.message}`))
    console.log('headers', await page.locator('[data-surface-part="header"]').allInnerTexts().catch(() => []))
    const close = page.locator('[data-surface-part="close-control"]').first()
    if (await close.count()) {
      await close.click().catch(() => {})
      await page.waitForTimeout(200)
    }
  }
})
