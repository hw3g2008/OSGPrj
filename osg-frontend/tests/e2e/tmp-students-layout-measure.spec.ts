import { test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'

async function collectMetrics(page: import('@playwright/test').Page, kind: 'app' | 'prototype') {
  return await page.evaluate((kind) => {
    const rect = (selector: string) => {
      const el = document.querySelector(selector)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width) }
    }

    const rowSelector = kind === 'app' ? '.permission-table tbody tr' : '#student-list-normal tbody tr'
    return {
      page: rect(kind === 'app' ? '.students-page' : '#page-students'),
      banner: rect(kind === 'app' ? '.students-banner' : '#page-students > div[style*="border:2px solid #F59E0B"]'),
      tabs: rect(kind === 'app' ? '.students-tabs' : '#page-students .tabs'),
      filter: rect(kind === 'app' ? '.students-filter-bar' : '#page-students > div[style*="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"]'),
      table: rect(kind === 'app' ? '.permission-table' : '#page-students .table'),
      pagination: rect(kind === 'app' ? '.students-pagination' : '#page-students > div[style*="justify-content:space-between"]'),
      rows: Array.from(document.querySelectorAll(rowSelector)).slice(0, 6).map((row) => Math.round((row as HTMLElement).getBoundingClientRect().height)),
    }
  }, kind)
}

test('measure students layout app vs prototype', async ({ page, context }) => {
  const contract = loadVisualContract()
  const students = contract.pages.find((item) => item.page_id === 'students')
  if (!students) {
    throw new Error('students page contract not found')
  }

  await registerVisualFixtureRoutes(page, students.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto('/users/students', { waitUntil: 'networkidle' })
  console.log('APP', JSON.stringify(await collectMetrics(page, 'app')))

  const prototype = await context.newPage()
  await prototype.goto('http://127.0.0.1:18090/admin.html?page=students', { waitUntil: 'networkidle' })
  console.log('PROTOTYPE', JSON.stringify(await collectMetrics(prototype, 'prototype')))
  await prototype.close()
})
