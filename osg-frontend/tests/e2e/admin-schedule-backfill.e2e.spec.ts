import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { loginAsAdmin, loginAsAdminApi, waitForApi } from './support/auth'

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

async function openSchedulePage(page: Page) {
  const runtime = trackRuntimeErrors(page)
  await loginAsAdmin(page)
  await page.goto('/users/mentor-schedule', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /导师排期管理/i })).toBeVisible()
  await expect(page.locator('.schedule-table tbody tr').first()).toBeVisible()
  return runtime
}

test.describe('Admin Schedule Ticket Backfill @ticket-backfill', () => {
  test('schedule page supports week switch, filter, and edit modal validation', async ({ page }) => {
    const runtime = await openSchedulePage(page)

    await expect(page.locator('.schedule-banner')).toBeVisible()
    await page.getByRole('button', { name: /下周/i }).click()
    await waitForApi(page, '/api/admin/schedule/list', 'GET')
    await expect(page.locator('.schedule-table tbody tr').first()).toBeVisible()

    await page.locator('.schedule-action').first().click()
    const editModal = page.locator('[data-surface-id="mentor-schedule-edit-modal"]')
    await expect(editModal).toBeVisible()
    await editModal.getByRole('button', { name: /保存并通知/i }).click()
    await expect(editModal).toContainText('请填写调整原因。')

    await page.locator('.schedule-field').filter({ hasText: '时段' }).locator('select').selectOption('morning')
    await expect(page.locator('.schedule-table tbody tr').first()).toBeVisible()

    expect(runtime.pageErrors, 'schedule page validation runtime errors').toEqual([])
    expect(runtime.apiErrors, 'schedule page validation api runtime errors').toEqual([])
  })

  test('schedule edit persists and refreshes the real table state', async ({ page }) => {
    const runtime = await openSchedulePage(page)

    await page.locator('.schedule-action').first().click()
    const editModal = page.locator('[data-surface-id="mentor-schedule-edit-modal"]')
    await expect(editModal).toBeVisible()
    await editModal.locator('.edit-schedule-modal__hours-input').fill('15')
    await editModal.locator('.edit-schedule-modal__day-card').filter({ hasText: '周一' }).locator('input[type="checkbox"]').first().check()
    await editModal.locator('.edit-schedule-modal__day-card').filter({ hasText: '周四' }).locator('input[type="checkbox"]').nth(1).check()
    await editModal.locator('.edit-schedule-modal__textarea').fill('runtime backfill 调整排期')

    const editResponses = Promise.all([
      waitForApi(page, '/api/admin/schedule/edit', 'PUT'),
      waitForApi(page, '/api/admin/schedule/list', 'GET'),
    ])
    await editModal.getByRole('button', { name: /保存并通知/i }).click()
    await editResponses
    await expect(editModal).toBeHidden()

    const firstRow = page.locator('.schedule-table tbody tr').first()
    await expect(firstRow).toContainText('15h')
    await expect(firstRow).toContainText('已填写')
    await expect(firstRow).toContainText('周一: 上午')

    expect(runtime.pageErrors, 'schedule edit runtime errors').toEqual([])
    expect(runtime.apiErrors, 'schedule edit api runtime errors').toEqual([])
  })

  test('schedule remind-all and export buttons hit the live backend successfully', async ({ page, request }) => {
    const runtime = await openSchedulePage(page)

    const remindResponse = waitForApi(page, '/api/admin/schedule/remind-all', 'POST')
    const bannerRemindButton = page.locator('.schedule-banner__action')
    if (await bannerRemindButton.count()) {
      await bannerRemindButton.click()
    } else {
      await page.getByRole('button', { name: /一键催促全部/i }).click()
    }
    const remindApi = await remindResponse
    expect(remindApi.status()).toBe(200)

    const exportResponse = waitForApi(page, '/api/admin/schedule/export', 'GET')
    await page.getByRole('button', { name: /导出排期表/i }).click()
    const exportApi = await exportResponse
    expect(exportApi.status()).toBe(200)
    const exportBody = await fetchExportBody(request)
    expect(exportBody.length).toBeGreaterThan(0)

    expect(runtime.pageErrors, 'schedule remind/export runtime errors').toEqual([])
    expect(runtime.apiErrors, 'schedule remind/export api runtime errors').toEqual([])
  })
})

async function fetchExportBody(request: APIRequestContext) {
  const { token } = await loginAsAdminApi(request)
  const response = await request.get('/api/admin/schedule/export?week=current', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(response.ok(), 'schedule export api should return HTTP 2xx').toBeTruthy()
  return response.body()
}
