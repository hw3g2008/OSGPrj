import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdminApi } from './support/auth'

function resolveRows(body: any) {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.rows)) return body.rows
  return []
}

test.describe('Admin Menu Runtime @api @e2e', () => {
  test('system menu list returns structured rows @admin-menu-list', async ({ request }) => {
    const { token } = await loginAsAdminApi(request)
    const headers = { Authorization: `Bearer ${token}` }

    const body = await assertRuoyiSuccess(
      Promise.resolve(request.get('/api/system/menu/list', { headers })),
      '/api/system/menu/list',
    )

    const rows = resolveRows(body)
    expect(Array.isArray(rows), 'menu list should resolve to an array').toBeTruthy()
    expect(rows.length, 'menu list should contain at least one menu row').toBeGreaterThan(0)
    expect(rows.some((row: any) => row.menuName), 'menu rows should include menuName').toBeTruthy()
    expect(rows.some((row: any) => row.menuType), 'menu rows should include menuType').toBeTruthy()
  })

  test('system menu create update delete roundtrip works @admin-menu-crud', async ({ request }) => {
    const { token } = await loginAsAdminApi(request)
    const headers = { Authorization: `Bearer ${token}` }
    const stamp = `${Date.now()}`
    const createName = `自动化菜单-${stamp}`
    const updatedName = `自动化菜单更新-${stamp}`
    const path = `autotest-menu-${stamp}`
    const routeName = `AutotestMenu${stamp}`
    let menuId: number | null = null

    try {
      await assertRuoyiSuccess(
        Promise.resolve(request.post('/api/system/menu', {
          headers,
          data: {
            parentId: 0,
            menuName: createName,
            orderNum: 999,
            path,
            component: 'permission/menu/index',
            query: '',
            routeName,
            isFrame: '1',
            isCache: '1',
            menuType: 'C',
            visible: '1',
            status: '1',
            perms: `autotest:menu:${stamp}:list`,
            icon: 'mdi-file-tree',
          },
        })),
        '/api/system/menu',
      )

      const listBody = await assertRuoyiSuccess(
        Promise.resolve(request.get('/api/system/menu/list', {
          headers,
          params: { menuName: createName },
        })),
        '/api/system/menu/list?menuName=<created>',
      )

      const rows = resolveRows(listBody)
      const createdRow = rows.find((row: any) => row.menuName === createName)
      expect(createdRow, 'created menu should be queryable from list endpoint').toBeTruthy()
      menuId = Number(createdRow.menuId)
      expect(Number.isFinite(menuId), 'created menu should expose numeric menuId').toBeTruthy()

      await assertRuoyiSuccess(
        Promise.resolve(request.put('/api/system/menu', {
          headers,
          data: {
            menuId,
            parentId: createdRow.parentId ?? 0,
            menuName: updatedName,
            orderNum: createdRow.orderNum ?? 999,
            path,
            component: 'permission/menu/index',
            query: '',
            routeName,
            isFrame: createdRow.isFrame ?? '1',
            isCache: createdRow.isCache ?? '1',
            menuType: createdRow.menuType ?? 'C',
            visible: createdRow.visible ?? '1',
            status: '0',
            perms: `autotest:menu:${stamp}:updated`,
            icon: createdRow.icon ?? 'mdi-file-tree',
          },
        })),
        '/api/system/menu (update)',
      )

      const detailBody = await assertRuoyiSuccess(
        Promise.resolve(request.get(`/api/system/menu/${menuId}`, { headers })),
        `/api/system/menu/${menuId}`,
      )

      const detail = detailBody?.data || detailBody
      expect(detail?.menuName).toBe(updatedName)
      expect(detail?.status).toBe('0')
      expect(detail?.perms).toBe(`autotest:menu:${stamp}:updated`)
    } finally {
      if (menuId) {
        const cleanupResponse = await request.delete(`/api/system/menu/${menuId}`, { headers })
        expect(cleanupResponse.ok(), 'created autotest menu should be removable during cleanup').toBeTruthy()
      }
    }
  })
})
