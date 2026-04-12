// Assistant UI 自动化测试脚本
// 用法: npx playwright test docs/assistant-ui-test.mjs
// 或者: node docs/assistant-ui-test.mjs (需要 playwright 已安装)

import { chromium } from 'playwright';

const BASE = 'http://localhost:3004';
const CREDS = { username: 'testassistant@osg.test', password: 'Osg@2026' };

const results = [];
function log(page, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${page}] ${detail}`);
  results.push({ page, status, detail });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.toString()));

  // --- Login ---
  console.log('\n=== 1. Login ===');
  await page.goto(BASE);
  await sleep(2000);
  const url1 = page.url();
  console.log('  Current URL:', url1);
  
  // Take screenshot of login page
  await page.screenshot({ path: 'docs/screenshots/01-login.png', fullPage: true });

  // Try to find login form
  const emailInput = await page.$('input[type="text"], input[type="email"], input[placeholder*="邮箱"], input[placeholder*="账号"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (emailInput && passwordInput) {
    await emailInput.fill(CREDS.username);
    await passwordInput.fill(CREDS.password);
    await sleep(500);
    
    const loginBtn = await page.$('button[type="submit"], button:has-text("登录")');
    if (loginBtn) {
      await loginBtn.click();
      await sleep(3000);
      log('Login', page.url().includes('/login') ? 'FAIL' : 'PASS', `Redirected to: ${page.url()}`);
    } else {
      log('Login', 'FAIL', 'Login button not found');
    }
  } else {
    log('Login', 'WARN', `No login form found. URL: ${url1}`);
  }

  await page.screenshot({ path: 'docs/screenshots/02-after-login.png', fullPage: true });

  // --- Navigate pages ---
  const pages_to_test = [
    { name: '学生列表', path: '/students', checkFor: ['table', '.ant-table', 'studentName', '学生'] },
    { name: '求职总览', path: '/career/job-overview', checkFor: ['table', '.ant-table', 'company', '求职'] },
    { name: '岗位统计', path: '/career/positions', checkFor: ['chart', 'canvas', 'position', '岗位'] },
    { name: '模拟面试', path: '/career/mock-practice', checkFor: ['table', '.ant-table', 'mock', '模拟'] },
    { name: '上课记录', path: '/class-records', checkFor: ['table', '.ant-table', 'record', '上课'] },
    { name: '个人资料', path: '/profile', checkFor: ['form', 'input', 'profile', '个人'] },
    { name: '排课', path: '/schedule', checkFor: ['table', 'calendar', 'schedule', '排课'] },
  ];

  for (let i = 0; i < pages_to_test.length; i++) {
    const t = pages_to_test[i];
    const num = String(i + 2).padStart(2, '0');
    console.log(`\n=== ${i + 2}. ${t.name} (${t.path}) ===`);
    
    consoleErrors.length = 0;
    
    try {
      await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      try {
        await page.goto(`${BASE}${t.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch (e2) {
        log(t.name, 'FAIL', `Navigation failed: ${e2.message}`);
        continue;
      }
    }
    
    await sleep(3000);
    
    const currentUrl = page.url();
    console.log('  URL:', currentUrl);
    
    // Check if redirected to login
    if (currentUrl.includes('/login')) {
      log(t.name, 'FAIL', 'Redirected to login (auth lost)');
      continue;
    }

    // Get page content
    const bodyText = await page.textContent('body').catch(() => '');
    const bodyHtml = await page.innerHTML('body').catch(() => '');
    
    // Check for error indicators
    const hasError = bodyText.includes('500') && bodyText.includes('错误') ||
                     bodyText.includes('页面不存在') ||
                     bodyText.includes('404') ||
                     bodyHtml.includes('ant-result-error') ||
                     bodyHtml.includes('ant-empty');
    
    const hasContent = bodyText.length > 100;
    const hasTable = bodyHtml.includes('ant-table') || bodyHtml.includes('<table');
    const hasForm = bodyHtml.includes('<form') || bodyHtml.includes('ant-form');
    
    // Check for specific console errors
    const apiErrors = consoleErrors.filter(e => e.includes('403') || e.includes('404') || e.includes('500') || e.includes('Network'));
    
    const screenshotPath = `docs/screenshots/${num}-${t.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    if (hasError) {
      log(t.name, 'FAIL', `Error page detected. Content preview: ${bodyText.substring(0, 200)}`);
    } else if (!hasContent) {
      log(t.name, 'FAIL', `Page appears empty (${bodyText.length} chars)`);
    } else if (apiErrors.length > 0) {
      log(t.name, 'WARN', `API errors: ${apiErrors.join('; ').substring(0, 200)}`);
    } else {
      log(t.name, 'PASS', `Content loaded (${bodyText.length} chars, table=${hasTable}, form=${hasForm})`);
    }
    
    // Log console errors if any
    if (consoleErrors.length > 0) {
      console.log(`  Console errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`    - ${e.substring(0, 150)}`));
    }
  }

  // --- Summary ---
  console.log('\n\n=== SUMMARY ===');
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  console.log(`Total: ${results.length}  Pass: ${pass}  Fail: ${fail}  Warn: ${warn}`);
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`  ${icon} ${r.page}: ${r.detail}`);
  });

  await browser.close();
})();
