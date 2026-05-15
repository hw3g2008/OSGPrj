import { chromium } from '@playwright/test'
const MENTOR_BASE = 'http://127.0.0.1:3002'
const tk = await (await fetch(`${MENTOR_BASE}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'daoshi58@qq.com', password:'admin123'}) })).json()

const browser = await chromium.launch({ headless: false, slowMo: 400 })
const ctx = await browser.newContext({ baseURL: MENTOR_BASE, viewport: {width:1600,height:900} })
const page = await ctx.newPage()
await page.addInitScript((t) => localStorage.setItem('osg_token', t), tk.token)
await page.goto('/courses', { waitUntil: 'networkidle', timeout: 30_000 })
await page.waitForTimeout(3000)

// click 查看原因 first row（驳回的行）
console.log('--- click 查看原因 ---')
const cv = await page.locator('a:has-text("查看原因"), button:has-text("查看原因")').count()
console.log('count:', cv)
if (cv > 0) {
  await page.locator('a:has-text("查看原因"), button:has-text("查看原因")').first().click({ timeout: 5_000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/probe-reject-detail.png', fullPage: true })
  const detail = await page.evaluate(() => ({
    modalTitles: Array.from(document.querySelectorAll('.ant-modal-title, [class*="modal-title"], [class*="OverlaySurface"] h3, [class*="OverlaySurface"] [class*="title"]')).map(el => el.textContent?.slice(0,80)).filter(Boolean),
    buttons: Array.from(document.querySelectorAll('button, a')).map(b => b.textContent?.trim()).filter(t => t && t.length > 0 && t.length < 20).slice(0, 30),
    hasResubmit: document.body.innerText.includes('重新提交'),
    hasReason: document.body.innerText.includes('驳回原因'),
  }))
  console.log('after click 查看原因:')
  console.log(JSON.stringify(detail, null, 2))

  // try click 重新提交
  console.log('\n--- click 重新提交 ---')
  const rs = await page.locator('button:has-text("重新提交"), a:has-text("重新提交")').count()
  console.log('重新提交 count:', rs)
  if (rs > 0) {
    await page.locator('button:has-text("重新提交"), a:has-text("重新提交")').first().click({ timeout: 5_000 })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/probe-resubmit-modal.png', fullPage: true })
    const after = await page.evaluate(() => ({
      modalTitles: Array.from(document.querySelectorAll('.ant-modal-title, [class*="modal-title"], [class*="OverlaySurface"] h3, h1, h2, h3, h4')).map(el => el.textContent?.trim().slice(0,80)).filter(t => t && t.length > 0).slice(0, 15),
      hasShang: document.body.innerText.includes('上报课程记录'),
      hasConfirmType: document.body.innerText.includes('确认课程类型'),
    }))
    console.log(JSON.stringify(after, null, 2))
  }
}
await browser.close()
