import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'

function auditDir() {
  return path.resolve(__dirname, '../../../osg-spec-docs/tasks/audit/manual-ui-compare')
}

test('capture live and prototype students page for manual comparison', async ({ page, context }) => {
  const outputDir = auditDir()
  fs.mkdirSync(outputDir, { recursive: true })

  await loginAsAdmin(page)
  await page.goto('/users/students', { waitUntil: 'networkidle' })
  await expect(page.locator('.students-page')).toBeVisible()
  await page.screenshot({
    path: path.join(outputDir, 'students-live-viewport.png'),
    fullPage: true,
  })
  await page.locator('.students-page').screenshot({
    path: path.join(outputDir, 'students-live-page.png'),
  })

  const prototype = await context.newPage()
  await prototype.goto('http://127.0.0.1:18090/admin.html?page=students', { waitUntil: 'networkidle' })
  await prototype.evaluate(() => {
    const loginPage = document.getElementById('login-page')
    if (loginPage) {
      loginPage.style.display = 'none'
    }
    const mainApp = document.getElementById('main-app')
    if (mainApp) {
      mainApp.classList.add('active')
    }
    const showPage = (window as unknown as { showPage?: (id: string) => void }).showPage
    if (typeof showPage === 'function') {
      showPage('students')
    }
  })
  await expect(prototype.locator('#page-students')).toBeVisible()
  await prototype.screenshot({
    path: path.join(outputDir, 'students-prototype-viewport.png'),
    fullPage: true,
  })
  await prototype.locator('#page-students').screenshot({
    path: path.join(outputDir, 'students-prototype-page.png'),
  })
  await prototype.close()
})
