import { chromium } from '@playwright/test'

const MENTOR_BASE = 'http://127.0.0.1:3002'
const TOKEN_RESP = await fetch(`${MENTOR_BASE}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'daoshi58@qq.com', password: 'admin123' }),
})
const { token } = await TOKEN_RESP.json()
console.log('mentor token len:', token?.length)

const browser = await chromium.launch()
const ctx = await browser.newContext({ baseURL: MENTOR_BASE })
const page = await ctx.newPage()
await page.addInitScript((t) => {
  localStorage.setItem('osg_token', t)
}, token)
await page.goto('/job-overview', { waitUntil: 'networkidle', timeout: 30_000 })
await page.waitForTimeout(2000)
const url = page.url()
console.log('actual URL:', url)

const text = await page.evaluate(() => {
  const body = document.body.innerText
  return body.slice(0, 2000)
})
console.log('--- BODY TEXT (first 2000 chars) ---')
console.log(text)

const has = await page.evaluate(() => ({
  has_xueyuan_5: document.body.innerText.includes('学员求职总览 5'),
  has_xueyuan_only: document.body.innerText.includes('学员求职总览'),
  has_5_anywhere: document.body.innerText.includes('5'),
  has_jobOverview: document.body.innerText.includes('Job Overview'),
}))
console.log('--- TEXT CHECKS ---', has)

await page.screenshot({ path: '/tmp/mentor-job-overview.png', fullPage: true })
console.log('screenshot saved /tmp/mentor-job-overview.png')

await browser.close()
