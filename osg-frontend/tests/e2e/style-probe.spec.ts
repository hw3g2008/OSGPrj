import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle } from './support/surface-trigger'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'

type PageContract = {
  page_id: string
  route: string
  stable_wait_ms: number
  fixture_routes?: Array<{ url: string; method?: string; response_ref: string }>
}

type ProbeTarget = {
  label: string
  appSelector: string
  prototypeSelector: string
}

const contractPath = path.resolve(process.cwd(), '../osg-spec-docs/tasks/audit/ui-visual-contract-admin-2026-03-15.json')
const prototypeBaseUrl = process.env.UI_VISUAL_PROTOTYPE_BASE_URL || 'http://127.0.0.1:18090'
const stability = resolveStabilityConfigFromEnv()
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8')) as { pages: PageContract[] }

const probeMatrix: Array<{ pageId: string; targets: ProbeTarget[] }> = [
  {
    pageId: 'home',
    targets: [
      {
        label: 'dashboard-root',
        appSelector: '.dashboard',
        prototypeSelector: '#page-home',
      },
      {
        label: 'title',
        appSelector: '.dashboard__title',
        prototypeSelector: '#page-home h1',
      },
      {
        label: 'welcome-row',
        appSelector: '.dashboard__welcome',
        prototypeSelector: '#page-home > div:first-of-type',
      },
      {
        label: 'date',
        appSelector: '.dashboard__date',
        prototypeSelector: '#page-home > div:first-of-type p',
      },
      {
        label: 'refresh-button',
        appSelector: '.dashboard__refresh',
        prototypeSelector: '#page-home > div:first-of-type .btn.btn-outline.btn-sm',
      },
      {
        label: 'todo-card',
        appSelector: '.todo-reminder',
        prototypeSelector: '#page-home > div:nth-of-type(2)',
      },
      {
        label: 'todo-title',
        appSelector: '.todo-reminder__title',
        prototypeSelector: '#page-home > div:nth-of-type(2) strong',
      },
      {
        label: 'todo-button',
        appSelector: '.todo-reminder__btn',
        prototypeSelector: '#page-home > div:nth-of-type(2) button',
      },
      {
        label: 'first-stat-card',
        appSelector: '.stat-card',
        prototypeSelector: '#page-home .stat-card',
      },
      {
        label: 'stat-cards-grid',
        appSelector: '.stat-cards',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:repeat(5,1fr)"]',
      },
      {
        label: 'quick-action-button',
        appSelector: '.quick-actions__btn',
        prototypeSelector: '#page-home button[onclick="openModal(\'modal-add-student\')"]',
      },
      {
        label: 'stat-card-value',
        appSelector: '.stat-card__value',
        prototypeSelector: '#page-home .stat-card .value',
      },
      {
        label: 'recent-activity-card',
        appSelector: '.recent-activity',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div.card',
      },
      {
        label: 'two-col-grid',
        appSelector: '.dashboard__two-col',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"]',
      },
      {
        label: 'recent-activity-title',
        appSelector: '.recent-activity__title',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div.card strong',
      },
      {
        label: 'recent-activity-detail',
        appSelector: '.recent-activity__detail',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div.card div[style*="font-size:13px;color:var(--text2)"]',
      },
      {
        label: 'student-status-card',
        appSelector: '.student-status',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(2)',
      },
      {
        label: 'student-status-label',
        appSelector: '.student-status__label',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(2) span[style*="font-size:13px"]',
      },
      {
        label: 'student-status-count',
        appSelector: '.student-status__count',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(2) strong',
      },
      {
        label: 'monthly-stats-card',
        appSelector: '.monthly-stats',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(3)',
      },
      {
        label: 'monthly-stats-label',
        appSelector: '.monthly-stats__label',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(3) span',
      },
      {
        label: 'monthly-stats-value',
        appSelector: '.monthly-stats__value',
        prototypeSelector: '#page-home > div[style*="grid-template-columns:2fr 1fr"] > div > div:nth-of-type(3) strong',
      },
    ],
  },
  {
    pageId: 'roles',
    targets: [
      {
        label: 'primary-button',
        appSelector: '.roles-page .permission-button--primary',
        prototypeSelector: '#page-roles .btn.btn-primary',
      },
      {
        label: 'first-pill',
        appSelector: '.roles-page .permission-pill',
        prototypeSelector: '#page-roles .tag',
      },
      {
        label: 'title',
        appSelector: '.roles-page .page-title',
        prototypeSelector: '#page-roles .page-title',
      },
    ],
  },
  {
    pageId: 'admins',
    targets: [
      {
        label: 'primary-button',
        appSelector: '.users-page .permission-button--primary',
        prototypeSelector: '#page-admins .btn.btn-primary',
      },
      {
        label: 'active-page-button',
        appSelector: '.users-page .users-pagination__controls .permission-button--primary',
        prototypeSelector: '#page-admins .btn.btn-primary.btn-sm',
      },
      {
        label: 'status-pill',
        appSelector: '.users-page .permission-pill--success',
        prototypeSelector: '#page-admins .tag.success',
      },
    ],
  },
  {
    pageId: 'base-data',
    targets: [
      {
        label: 'active-card',
        appSelector: '.base-data-page .category-card--active',
        prototypeSelector: '#page-base-data #base-group-job',
      },
      {
        label: 'primary-button',
        appSelector: '.base-data-page .permission-button--primary',
        prototypeSelector: '#page-base-data .btn.btn-primary',
      },
      {
        label: 'active-tab',
        appSelector: '.base-data-page .base-data-tabs__tab--active',
        prototypeSelector: '#page-base-data .tab.active',
      },
    ],
  },
]

function getPageContract(pageId: string): PageContract {
  const pageContract = contract.pages.find((page) => page.page_id === pageId)
  if (!pageContract) {
    throw new Error(`page contract not found: ${pageId}`)
  }
  return pageContract
}

async function captureStyle(page: Page, selector: string) {
  const locator = page.locator(selector).first()
  await expect(locator, `selector should be visible: ${selector}`).toBeVisible()
  return locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      className: (element as HTMLElement).className || '',
      rect: {
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
      },
      style: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        padding: style.padding,
        margin: style.margin,
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        gap: style.gap,
      },
    }
  })
}

async function gotoPrototype(page: Page, pageId: string): Promise<void> {
  await page.goto(`${prototypeBaseUrl}/admin.html`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((id) => {
    const loginPage = document.getElementById('login-page')
    const mainApp = document.getElementById('main-app')
    if (loginPage) {
      ;(loginPage as HTMLElement).style.display = 'none'
    }
    if (mainApp) {
      mainApp.classList.add('active')
    }
    ;(window as typeof window & { currentRole?: string }).currentRole = 'super-admin'
    ;(window as typeof window & { showPage?: (pageId: string) => void }).showPage?.(id)
  }, pageId)
  await page.waitForTimeout(300)
}

test.describe('style probe', () => {
  for (const probe of probeMatrix) {
    test(`probe ${probe.pageId}`, async ({ page }) => {
      const pageContract = getPageContract(probe.pageId)

      await applyStabilityToPage(page, stability)
      await registerVisualFixtureRoutes(page, pageContract.fixture_routes || [])
      await loginAsAdmin(page)
      await page.goto(pageContract.route)
      await waitForVisualSettle(page, pageContract.stable_wait_ms || 500)

      const appStyles = []
      for (const target of probe.targets) {
        appStyles.push({
          label: target.label,
          selector: target.appSelector,
          snapshot: await captureStyle(page, target.appSelector),
        })
      }

      await gotoPrototype(page, probe.pageId)

      const prototypeStyles = []
      for (const target of probe.targets) {
        prototypeStyles.push({
          label: target.label,
          selector: target.prototypeSelector,
          snapshot: await captureStyle(page, target.prototypeSelector),
        })
      }

      console.log(JSON.stringify({ pageId: probe.pageId, appStyles, prototypeStyles }, null, 2))
    })
  }
})
