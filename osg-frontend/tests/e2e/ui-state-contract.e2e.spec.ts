import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { loadVisualContract, type VisualPageContract } from './support/visual-contract'
import { runStateCases } from './support/state-contract'
import { applyDeterministicRuntime } from './support/test-stability'

const contractJson = process.env.UI_VISUAL_CONTRACT_JSON
const contract = contractJson ? loadVisualContract() : null
const visualSource = process.env.UI_VISUAL_SOURCE || 'app'
const stateResultsFile = process.env.UI_VISUAL_STATE_RESULTS_FILE

function appendStateResult(pageContract: VisualPageContract, executed: number, failed: number, errors: string[]): void {
  if (!stateResultsFile) {
    return
  }
  const record = {
    module: contract?.module || 'unknown',
    page_id: pageContract.page_id,
    state_cases_executed: executed,
    state_cases_failed: failed,
    state_case_errors: errors,
    result: failed === 0 ? 'PASS' : 'FAIL',
  }
  fs.mkdirSync(path.dirname(stateResultsFile), { recursive: true })
  fs.appendFileSync(stateResultsFile, `${JSON.stringify(record)}\n`, 'utf-8')
}

test.describe(`UI State Contract @ui-state (${contract?.module || 'disabled'})`, () => {
  const pagesWithStateCases = contract?.pages.filter((page) => (page.state_cases || []).length > 0) || []

  test('ui-state bootstrap @ui-state', async () => {
    test.skip(contract !== null && visualSource === 'app' && pagesWithStateCases.length > 0, 'real state cases will run')
    test.skip(!contract, 'UI_VISUAL_CONTRACT_JSON is required for ui-state tests')
    test.skip(visualSource !== 'app', `ui-state only runs on app source, got ${visualSource}`)
    test.skip(pagesWithStateCases.length === 0, 'no state_cases declared in contract')
  })

  for (const pageContract of pagesWithStateCases) {
    test(`${pageContract.page_id} state assertions @ui-state`, async ({ page }) => {
      await page.setViewportSize(pageContract.viewport)
      await applyDeterministicRuntime(page)

      if (pageContract.auth_mode === 'protected') {
        await loginAsAdmin(page)
      }

      await page.goto(pageContract.route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(pageContract.stable_wait_ms || 300)

      const result = await runStateCases(page, pageContract.page_id, pageContract.state_cases)
      appendStateResult(pageContract, result.executed, result.failed, result.errors)
      expect(result.failed, result.errors.join('\n')).toBe(0)
    })
  }
})
