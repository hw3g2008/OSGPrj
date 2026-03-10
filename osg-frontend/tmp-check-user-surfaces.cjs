const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const token='codex-admin-token';
  await page.addInitScript(token=>localStorage.setItem('osg_token', token), token);
  const fixturesRoot = path.resolve('/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/fixtures');
  const json = rel => JSON.parse(fs.readFileSync(path.join(fixturesRoot, rel), 'utf8'));
  const ok = data => ({ code:200, msg:'操作成功', data });
  await page.route('**/api/login', route=>route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({code:200,msg:'操作成功',token})}));
  await page.route('**/api/getInfo', route=>route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(ok(json('permission/common/getInfo.json')))}));
  await page.route('**/api/getRouters', route=>route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(ok([{path:'/dashboard'}]))}));
  await page.route('**/api/system/user/list**', route=>route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(json('permission/users/list.json'))}));
  await page.route('**/api/system/role/options', route=>route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(ok(json('permission/users/role-options.json')))}));
  await page.goto('http://localhost:4173/permission/users');
  await page.waitForLoadState('networkidle');
  const checks = [
    ['modal-add-admin', '[data-surface-trigger="modal-add-admin"]', '[data-surface-id="modal-add-admin"] [data-surface-part="shell"]'],
    ['modal-edit-admin', '[data-surface-trigger="modal-edit-admin"][data-surface-sample-key="clerk001"]', '[data-surface-id="modal-edit-admin"] [data-surface-part="shell"]'],
    ['modal-reset-password', '[data-surface-trigger="modal-reset-password"][data-surface-sample-key="clerk001"]', '[data-surface-id="modal-reset-password"] [data-surface-part="shell"]'],
  ];
  for (const [id, triggerSel, rootSel] of checks) {
    const trigger = page.locator(triggerSel).first();
    console.log('\nID', id);
    console.log('trigger count', await page.locator(triggerSel).count());
    console.log('trigger tag', await trigger.evaluate(el=>el.tagName).catch(e=>'ERR:'+e.message));
    await trigger.click({timeout:5000}).catch(e=>console.log('click err', e.message));
    await page.waitForTimeout(400);
    const root = page.locator(rootSel).first();
    console.log('root count', await page.locator(rootSel).count());
    console.log('root visible', await root.isVisible().catch(e=>'ERR:'+e.message));
    const titles = await page.locator('[data-surface-part="header"]').allInnerTexts().catch(()=>[]);
    console.log('headers', titles);
    const close = page.locator('[data-surface-part="close-control"]').first();
    if (await close.count()) {
      await close.click().catch(()=>{});
      await page.waitForTimeout(200);
    }
  }
  await browser.close();
})();
