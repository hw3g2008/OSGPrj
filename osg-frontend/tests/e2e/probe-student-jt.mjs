import { chromium } from '@playwright/test'
const ADMIN_BASE = 'http://127.0.0.1:3005'
const tk = await (await fetch(`${ADMIN_BASE}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin', password:'admin123'}) })).json()
const browser = await chromium.launch()
const ctx = await browser.newContext({ baseURL: ADMIN_BASE, viewport: {width:1600,height:900} })
const page = await ctx.newPage()
await page.addInitScript((t) => localStorage.setItem('osg_token', t), tk.token)
await page.goto('/career/mock-practice', { waitUntil: 'networkidle', timeout: 30_000 })
await page.waitForTimeout(3000)
console.log('Before click "已安排":')
const before = await page.evaluate(() => ({
  has_hw01: document.body.innerText.includes('hw01'),
  tab_buttons: Array.from(document.querySelectorAll('button, [role="tab"]')).map(el => el.textContent?.trim()).filter(t => t && t.length < 30).slice(0, 30),
}))
console.log(JSON.stringify(before, null, 2))

// Try clicking 已安排
console.log('\n--- click 已安排 ---')
try {
  await page.locator('button:has-text("已安排"), [role="tab"]:has-text("已安排")').first().click({ timeout: 5_000 })
  await page.waitForTimeout(1500)
} catch (e) {
  console.log('click failed:', e.message.slice(0, 200))
}

const after = await page.evaluate(() => ({
  has_hw01: document.body.innerText.includes('hw01'),
  has_arranged: document.body.innerText.includes('已安排'),
  sample: document.body.innerText.slice(0, 1500),
}))
console.log('After click:')
console.log(JSON.stringify({has_hw01: after.has_hw01, has_arranged: after.has_arranged}, null, 2))
console.log('---body excerpt---')
console.log(after.sample)
await page.screenshot({ path: '/tmp/probe-admin-mock.png', fullPage: true })
await browser.close()
