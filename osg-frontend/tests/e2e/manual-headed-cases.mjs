import { chromium } from '@playwright/test'

console.log('=== Headed manual reproduction: CASE 2 + CASE 5 ===')
console.log('浏览器会打开两个窗口，不要关，看完一个按 Enter 进下一个')

async function loginToken(base, username, password) {
  const r = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await r.json()
  if (!json?.token) throw new Error(`login ${username} failed: ${JSON.stringify(json)}`)
  return json.token
}

const browser = await chromium.launch({ headless: false, slowMo: 300 })

// ===================================================================
// CASE 2: admin /career/mock-practice 看 hw01 是否可见
// ===================================================================
{
  console.log('\n--- CASE 2: admin 端 /career/mock-practice ---')
  console.log('期望: 列表能看到 hw01 (mock_practice id=5180 已 insert)')
  console.log('实际(预期 RED): hw01 不可见')
  const adminBase = 'http://127.0.0.1:3005'
  const adminToken = await loginToken(adminBase, 'admin', 'admin123')
  console.log('admin token len:', adminToken.length)

  const ctx = await browser.newContext({ baseURL: adminBase, viewport: { width: 1600, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript((t) => localStorage.setItem('osg_token', t), adminToken)
  await page.goto('/career/mock-practice', { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(2000)

  // highlight 关键
  await page.evaluate(() => {
    document.title = '[CASE 2 admin] /career/mock-practice'
    const banner = document.createElement('div')
    banner.id = 'gate-case-banner'
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ff4d4f;color:white;padding:8px 16px;font-size:14px;font-weight:bold;text-align:center'
    banner.textContent = 'CASE 2 — 期望「hw01」可见，实测 RED。请观察表格里是否有 hw01 行'
    document.body.prepend(banner)
  })

  // 截图存证
  await page.screenshot({ path: '/tmp/case2-admin-mock-practice.png', fullPage: true })
  console.log('screenshot: /tmp/case2-admin-mock-practice.png')

  // 文本断言验证
  const probe = await page.evaluate(() => {
    const has_hw01 = document.body.innerText.includes('hw01')
    const has_gate_marker = document.body.innerText.includes('gate B-Flow')
    const has_empty = document.body.innerText.includes('暂无数据') || document.body.innerText.includes('No Data')
    const sample = document.body.innerText.slice(0, 1500)
    return { has_hw01, has_gate_marker, has_empty, sample }
  })
  console.log('hw01 visible?', probe.has_hw01)
  console.log('"gate B-Flow" visible?', probe.has_gate_marker)
  console.log('table empty?', probe.has_empty)
  console.log('--- body text (1500 chars) ---')
  console.log(probe.sample)

  console.log('\n>>> Sleep 30s 看 admin 端页面，30s 后自动进 CASE 5')
  await page.waitForTimeout(30_000)
}

// ===================================================================
// CASE 5: mentor /job-overview 看 "学员求职总览 5" baseline selector
// ===================================================================
{
  console.log('\n--- CASE 5: mentor 端 /job-overview ---')
  console.log('期望: 文本「学员求职总览 5」连续可见')
  console.log('实际(YELLOW): sidebar 文本是「学员求职总览 Job Overview」+ 单独 badge 5，连续不存在')
  const mentorBase = 'http://127.0.0.1:3002'
  const mentorToken = await loginToken(mentorBase, 'daoshi58@qq.com', 'admin123')
  console.log('mentor token len:', mentorToken.length)

  const ctx = await browser.newContext({ baseURL: mentorBase, viewport: { width: 1600, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript((t) => localStorage.setItem('osg_token', t), mentorToken)
  await page.goto('/job-overview', { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(2000)

  await page.evaluate(() => {
    document.title = '[CASE 5 mentor] /job-overview'
    const banner = document.createElement('div')
    banner.id = 'gate-case-banner'
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#faad14;color:#1f1f1f;padding:8px 16px;font-size:14px;font-weight:bold;text-align:center'
    banner.textContent = 'CASE 5 — baseline 写「学员求职总览 5」需连续；UI 实际 sidebar 是「学员求职总览 / Job Overview / 5」分隔'
    document.body.prepend(banner)
  })

  await page.screenshot({ path: '/tmp/case5-mentor-job-overview.png', fullPage: true })
  console.log('screenshot: /tmp/case5-mentor-job-overview.png')

  const probe = await page.evaluate(() => ({
    has_continuous: document.body.innerText.includes('学员求职总览 5'),
    has_label: document.body.innerText.includes('学员求职总览'),
    has_5_anywhere: /\b5\b/.test(document.body.innerText),
    sidebar_excerpt: (document.body.innerText.match(/学员求职总览[\s\S]{0,30}/) || [])[0],
  }))
  console.log('continuous "学员求职总览 5"?', probe.has_continuous)
  console.log('label "学员求职总览"?', probe.has_label)
  console.log('"5" anywhere?', probe.has_5_anywhere)
  console.log('sidebar excerpt:', JSON.stringify(probe.sidebar_excerpt))

  console.log('\n>>> Sleep 30s 看 mentor 端页面')
  await page.waitForTimeout(30_000)
}

console.log('\n=== 两个 case 跑完，关闭浏览器 ===')
await browser.close()
