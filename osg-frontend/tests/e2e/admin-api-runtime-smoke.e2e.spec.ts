import { test } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdminApi } from './support/auth'

test.describe('Admin API Runtime Smoke @api', () => {
  test('osg business endpoints should return success after schema init', async ({ request }) => {
    const { token } = await loginAsAdminApi(request)
    const headers = { Authorization: `Bearer ${token}` }

    const endpoints = [
      '/api/admin/student/list',
      '/api/admin/contract/list',
      '/api/admin/position/list',
      '/api/admin/job-overview/list',
      '/api/admin/file/list',
    ]

    for (const endpoint of endpoints) {
      await assertRuoyiSuccess(
        Promise.resolve(request.get(endpoint, { headers })),
        endpoint,
      )
    }
  })
})
