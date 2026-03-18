import { test, expect } from '@playwright/test'

test('check dashboard layout alignment', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3005/login')
  await page.fill('input[placeholder="请输入用户名"]', 'admin')
  await page.fill('input[placeholder="请输入密码"]', 'admin123')
  
  // 等待验证码并填写
  await page.waitForSelector('.captcha-code-frame img')
  await page.fill('input[placeholder="请输入验证码"]', '1234')
  
  // 登录
  await page.click('button:has-text("登录")')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  await page.waitForTimeout(1500)
  
  // 截图
  await page.screenshot({ path: '/tmp/dashboard_layout_check.png', fullPage: false })
  
  // 检查布局
  const layoutInfo = await page.evaluate(() => {
    const recentActivity = document.querySelector('.recent-activity')
    const monthlyStats = document.querySelector('.monthly-stats')
    
    if (!recentActivity || !monthlyStats) {
      return { error: 'Elements not found' }
    }
    
    const recentRect = recentActivity.getBoundingClientRect()
    const monthlyRect = monthlyStats.getBoundingClientRect()
    
    return {
      recentBottom: Math.round(recentRect.bottom),
      monthlyBottom: Math.round(monthlyRect.bottom),
      diff: Math.round(recentRect.bottom - monthlyRect.bottom),
      recentHeight: Math.round(recentRect.height),
      monthlyHeight: Math.round(monthlyRect.height),
      recentTop: Math.round(recentRect.top),
      monthlyTop: Math.round(monthlyRect.top)
    }
  })
  
  console.log('=== Layout Alignment Check ===')
  console.log(JSON.stringify(layoutInfo, null, 2))
  console.log('Expected: diff should be 0 (aligned)')
  console.log(`Actual: diff = ${layoutInfo.diff}px`)
})
