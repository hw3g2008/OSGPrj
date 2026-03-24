import { expect, test } from '@playwright/test'

import { recordBehaviorScenario } from './support/behavior-report'

const moduleName = process.env.E2E_MODULE || ''

const placeholderRouteCases = [
  {
    label: 'Communication',
    route: '/communication',
    pageId: '#page-communication',
    title: '人际关系沟通记录',
    capabilityId: 'assistant-communication-placeholder',
    scenarioId: 'navigate-to-communication',
  },
  {
    label: 'Settlement',
    route: '/settlement',
    pageId: '#page-settlement',
    title: '课时结算',
    capabilityId: 'assistant-finance-placeholders',
    scenarioId: 'navigate-to-settlement',
  },
  {
    label: 'Expense',
    route: '/expense',
    pageId: '#page-expense',
    title: '报销管理',
    capabilityId: 'assistant-finance-placeholders',
    scenarioId: 'navigate-to-expense',
  },
  {
    label: 'Files',
    route: '/files',
    pageId: '#page-files',
    title: '文件',
    capabilityId: 'assistant-resource-placeholders',
    scenarioId: 'navigate-to-files',
  },
  {
    label: 'Online Test',
    route: '/online-test-bank',
    pageId: '#page-online-test-bank',
    title: '在线测试题库',
    capabilityId: 'assistant-resource-placeholders',
    scenarioId: 'navigate-to-online-test-bank',
  },
  {
    label: 'Interview Bank',
    route: '/interview-bank',
    pageId: '#page-interview-bank',
    title: '真人面试题库',
    capabilityId: 'assistant-resource-placeholders',
    scenarioId: 'navigate-to-interview-bank',
  },
  {
    label: 'Notice',
    route: '/notice',
    pageId: '#page-notice',
    title: '消息',
    capabilityId: 'assistant-support-placeholders',
    scenarioId: 'navigate-to-notice',
  },
  {
    label: 'FAQ',
    route: '/faq',
    pageId: '#page-faq',
    title: '常见问题',
    capabilityId: 'assistant-support-placeholders',
    scenarioId: 'navigate-to-faq',
  },
] as const

async function seedAssistantAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('osg_token', 'assistant-shell-token')
    window.localStorage.setItem(
      'osg_user',
      JSON.stringify({
        userId: 1,
        userName: 'amy_asst',
        nickName: 'Amy',
        status: 'active',
        roles: ['assistant'],
      }),
    )
  })
}

async function clearAssistantAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem('osg_token')
    window.localStorage.removeItem('osg_user')
  })
}

async function assertPlaceholderPage(
  page: import('@playwright/test').Page,
  placeholder: (typeof placeholderRouteCases)[number],
) {
  await page.locator('.sidebar-nav .nav-item').filter({ hasText: placeholder.label }).click()
  await expect(page).toHaveURL(new RegExp(`${placeholder.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))

  const pageRoot = page.locator(placeholder.pageId)
  await expect(pageRoot).toBeVisible()
  await expect(pageRoot.locator('.page-title')).toContainText(placeholder.title)
  await expect(pageRoot.locator('.status-pill')).toContainText('敬请期待')
  await expect(pageRoot.locator('[data-placeholder-bullet]')).toHaveCount(3)
  await expect(pageRoot).not.toContainText('伪造')
  await expect(pageRoot).not.toContainText('App Shell')
  await expect(pageRoot).not.toContainText('story')
  await expect(pageRoot).not.toContainText('承载位')
  await expect(
    pageRoot.locator('table, form, input, textarea, select, [type="submit"], .ant-table, .ant-form'),
  ).toHaveCount(0)
}

test.describe('Assistant Navigation @assistant @ui-smoke @ui-only', () => {
  test.skip(moduleName !== 'assistant', 'assistant navigation spec only runs for assistant module gate')

  test('anonymous access to protected routes is redirected to /login @assistant-t185-shell-boundary', async ({
    page,
  }) => {
    await clearAssistantAuth(page)
    await page.goto('/expense')

    await expect(page).toHaveURL(/\/login\?redirect=\/expense/)
    await expect(page.locator('#login-page')).toBeVisible()

    await recordBehaviorScenario({
      capabilityId: 'assistant-shell-navigation',
      scenarioId: 'redirect-anonymous-protected-route',
      inputClass: 'anonymous_session',
      expectedResult: 'rejected',
      observedResult: 'rejected',
      observableResponse: {
        route: '/login',
        redirect: '/expense',
        loginShellVisible: true,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t185-shell-boundary',
    })
  })

  test('full assistant IA renders, placeholder entries stay visible, and route state survives reloads @assistant-t185-shell-nav', async ({
    page,
  }) => {
    await seedAssistantAuth(page)
    await page.goto('/home')

    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.sidebar-logo')).toContainText('OSG Assistant')
    await expect(page.locator('.nav-section')).toHaveCount(6)
    await expect(page.locator('.sidebar-nav')).toContainText('Career')
    await expect(page.locator('.sidebar-nav')).toContainText('Students')
    await expect(page.locator('.sidebar-nav')).toContainText('Teaching')
    await expect(page.locator('.sidebar-nav')).toContainText('Finance')
    await expect(page.locator('.sidebar-nav')).toContainText('Resources')
    await expect(page.locator('.sidebar-nav')).toContainText('Profile')
    await expect(page.locator('.sidebar-nav')).toContainText('Communication')
    await expect(page.locator('.sidebar-nav')).toContainText('Settlement')
    await expect(page.locator('.sidebar-nav')).toContainText('Expense')
    await expect(page.locator('.sidebar-nav')).toContainText('Files')
    await expect(page.locator('.sidebar-nav')).toContainText('Online Test')
    await expect(page.locator('.sidebar-nav')).toContainText('Interview Bank')
    await expect(page.locator('.sidebar-nav')).toContainText('Notice')
    await expect(page.locator('.sidebar-nav')).toContainText('FAQ')
    await expect(page.locator('.user-card')).toContainText('Amy')

    await page.locator('.sidebar-nav .nav-item').filter({ hasText: 'Expense' }).click()
    await expect(page).toHaveURL(/\/expense/)
    await expect(page.locator('#page-expense')).toBeVisible()
    await expect(page.locator('#page-expense .status-pill')).toContainText('敬请期待')
    await expect(page.locator('.nav-item.active').first()).toContainText('Expense')

    await page.reload()
    await expect(page).toHaveURL(/\/expense/)
    await expect(page.locator('#page-expense')).toBeVisible()
    await expect(page.locator('.nav-item.active').first()).toContainText('Expense')

    await page.locator('.user-card').click()
    await expect(page.locator('.user-menu')).toBeVisible()
    await expect(page.locator('.user-menu')).toContainText('Logout')

    await recordBehaviorScenario({
      capabilityId: 'assistant-shell-navigation',
      scenarioId: 'render-authorized-layout',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/home',
        navSections: 6,
        shellBrand: 'OSG Assistant',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t185-shell-nav',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-shell-navigation',
      scenarioId: 'switch-menu-route',
      inputClass: 'valid_navigation_target',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/expense',
        activeNav: 'Expense',
        persistedAfterReload: true,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t185-shell-nav',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-shell-navigation',
      scenarioId: 'show-header-user-entry',
      inputClass: 'authenticated_session',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        userCard: 'Amy',
        userMenuVisible: true,
        menuAction: 'Logout',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t185-shell-nav',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-shell-navigation',
      scenarioId: 'show-visible-placeholder-menu-items',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/expense',
        visibleEntries: [
          'Communication',
          'Settlement',
          'Expense',
          'Files',
          'Online Test',
          'Interview Bank',
          'Notice',
          'FAQ',
        ],
        placeholderText: '敬请期待',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t185-shell-nav',
    })
  })

  test('visible placeholder pages stay product-friendly and keep real-submit actions blocked @assistant-t244-placeholder-pages', async ({
    page,
  }) => {
    await seedAssistantAuth(page)
    await page.goto('/home')

    for (const placeholder of placeholderRouteCases) {
      await assertPlaceholderPage(page, placeholder)

      await recordBehaviorScenario({
        capabilityId: placeholder.capabilityId,
        scenarioId: placeholder.scenarioId,
        inputClass: 'valid_navigation_target',
        expectedResult: 'accepted',
        observedResult: 'accepted',
        observableResponse: {
          route: placeholder.route,
          pageId: placeholder.pageId.replace('#', ''),
          title: placeholder.title,
        },
        evidenceRef:
          'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
      })
    }

    await recordBehaviorScenario({
      capabilityId: 'assistant-communication-placeholder',
      scenarioId: 'show-coming-soon-message',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/communication',
        statusText: '敬请期待',
        bulletCount: 3,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-communication-placeholder',
      scenarioId: 'block-real-submit-actions',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        route: '/communication',
        blockedSelectors: ['table', 'form', 'input', 'textarea', 'select', '[type="submit"]'],
        blockedCount: 0,
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-finance-placeholders',
      scenarioId: 'show-coming-soon-message',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        routes: ['/settlement', '/expense'],
        statusText: '敬请期待',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-resource-placeholders',
      scenarioId: 'show-coming-soon-message',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        routes: ['/files', '/online-test-bank', '/interview-bank'],
        statusText: '敬请期待',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
    })

    await recordBehaviorScenario({
      capabilityId: 'assistant-support-placeholders',
      scenarioId: 'show-coming-soon-message',
      inputClass: 'placeholder_scope',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: {
        routes: ['/notice', '/faq'],
        statusText: '敬请期待',
      },
      evidenceRef:
        'osg-frontend/tests/e2e/assistant-shell-navigation.e2e.spec.ts#assistant-t244-placeholder-pages',
    })
  })
})
