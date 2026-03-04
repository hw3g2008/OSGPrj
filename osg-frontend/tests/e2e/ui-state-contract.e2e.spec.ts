import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { executeStateCase } from './support/state-contract'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { loadVisualContract, type VisualPageContract } from './support/visual-contract'

const contractJson = process.env.UI_VISUAL_CONTRACT_JSON
const contract = contractJson ? loadVisualContract() : null
const stateResultsFile = process.env.UI_STATE_RESULTS_FILE
const stabilityConfig = resolveStabilityConfigFromEnv()

function appendStateResult(record: Record<string, unknown>): void {
  if (!stateResultsFile) {
    return
  }
  fs.mkdirSync(path.dirname(stateResultsFile), { recursive: true })
  fs.appendFileSync(stateResultsFile, `${JSON.stringify(record)}\n`, 'utf-8')
}

async function openPageForStateCase(pageContract: VisualPageContract, page: Parameters<typeof loginAsAdmin>[0]): Promise<void> {
  await page.setViewportSize(pageContract.viewport)
  await applyStabilityToPage(page, stabilityConfig)
  if (pageContract.auth_mode === 'protected') {
    await loginAsAdmin(page)
  }
  await page.goto(pageContract.route)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(pageContract.stable_wait_ms || 300)
}

test.describe('State Contract Runner', () => {
  test('focus + css assertion hook works', async ({ page }) => {
    await applyStabilityToPage(page, stabilityConfig)
    await page.setContent('<input id="name" style="border-radius: 12px;" />')
    await executeStateCase(page, 'sample-focus', {
      state: 'focus',
      target: '#name',
      assertion: { type: 'css', property: 'border-radius', value: '12px' },
    })
    await expect(page.locator('#name')).toBeFocused()
  })

  test('error + text assertion hook works', async ({ page }) => {
    await applyStabilityToPage(page, stabilityConfig)
    await page.setContent('<div class="error">用户名或密码错误</div>')
    await executeStateCase(page, 'sample-error', {
      state: 'error',
      target: '.error',
      assertion: { type: 'text', value: '用户名或密码错误' },
    })
  })
})

test.describe(`UI State Contract @ui-state (${contract?.module || 'disabled'})`, () => {
  test.skip(!contract, 'UI_VISUAL_CONTRACT_JSON is required for @ui-state contract execution')
  if (!contract) {
    return
  }

  const pagesWithCases = contract.pages.filter(
    (pageContract) => Array.isArray(pageContract.state_cases) && pageContract.state_cases.length > 0,
  )

  if (pagesWithCases.length === 0) {
    test('no state cases declared @ui-state', async () => {
      test.skip(true, 'no state cases defined in contract')
    })
    return
  }

  for (const pageContract of pagesWithCases) {
    const cases = pageContract.state_cases || []
    for (const [index, stateCase] of cases.entries()) {
      test(`${pageContract.page_id} state_case_${index + 1} (${stateCase.state}) @ui-state`, async ({ page }) => {
        await openPageForStateCase(pageContract, page)
        try {
          await executeStateCase(page, pageContract.page_id, stateCase)
          appendStateResult({
            module: contract.module,
            page_id: pageContract.page_id,
            state: stateCase.state,
            target: stateCase.target,
            assertion_type: stateCase.assertion.type,
            result: 'PASS',
          })
        } catch (error) {
          appendStateResult({
            module: contract.module,
            page_id: pageContract.page_id,
            state: stateCase.state,
            target: stateCase.target,
            assertion_type: stateCase.assertion.type,
            result: 'FAIL',
            error: error instanceof Error ? error.message : String(error),
          })
          throw error
        }
      })
    }
  }
})
