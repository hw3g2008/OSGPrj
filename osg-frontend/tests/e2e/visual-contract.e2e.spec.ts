import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { resolvePrototypePageKey } from './support/prototype-contract'
import { assertStyleContracts } from './support/style-contract'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import {
  baselineRefToSnapshotArg,
  loadVisualContract,
  type VisualCriticalSurfaceContract,
  type VisualPageContract,
} from './support/visual-contract'
import { registerVisualFixtureRoutes } from './support/visual-fixture'

const contractJson = process.env.UI_VISUAL_CONTRACT_JSON
const contract = contractJson ? loadVisualContract() : null
const visualMode = process.env.UI_VISUAL_MODE || 'verify'
const visualSource = process.env.UI_VISUAL_SOURCE || 'app'
const prototypeBaseUrl = process.env.UI_VISUAL_PROTOTYPE_BASE_URL || 'http://127.0.0.1:18090'
const visualEvidenceDir = process.env.UI_VISUAL_EVIDENCE_DIR
const visualPageResultsFile = process.env.UI_VISUAL_PAGE_RESULTS_FILE
const stabilityConfig = resolveStabilityConfigFromEnv()

if (visualSource !== 'app' && visualSource !== 'prototype') {
  throw new Error(`UI_VISUAL_SOURCE must be app|prototype, got '${visualSource}'`)
}

function toMaskLocators(pageContract: VisualPageContract, page: Page): Locator[] {
  return toMaskSelectors(pageContract).map((selector) => page.locator(selector))
}

function toMaskSelectors(pageContract: VisualPageContract): string[] {
  const selectors = [...(pageContract.mask_selectors || [])]
  if (pageContract.data_mode === 'mask') {
    selectors.push(...(pageContract.dynamic_regions || []))
  }
  return selectors
}

function toRepoRelative(filePath: string): string {
  const normalized = filePath.trim()
  if (!normalized) {
    return 'none'
  }
  if (!path.isAbsolute(normalized)) {
    return normalized.replace(/\\/g, '/')
  }
  const repoRoot = path.resolve(process.cwd(), '..')
  return path.relative(repoRoot, normalized).replace(/\\/g, '/')
}

function buildActualPath(pageContract: VisualPageContract): string | null {
  if (!visualEvidenceDir) {
    return null
  }
  const viewport = `${pageContract.viewport.width}x${pageContract.viewport.height}`
  const outputPath = path.resolve(visualEvidenceDir, pageContract.page_id, `${viewport}.png`)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  return outputPath
}

function extractDiffRefFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const diffMatch = message.match(/Diff:\s*([^\n]+)/)
  if (!diffMatch) {
    return 'none'
  }
  return toRepoRelative(diffMatch[1])
}

function inferDiffRefFromArtifacts(testInfo: TestInfo, snapshotArg: string): string {
  const ext = path.extname(snapshotArg) || '.png'
  const base = path.basename(snapshotArg, ext)
  const candidates = [
    `${base}-diff${ext}`,
    `${base}-diff.png`,
  ]
  for (const candidate of candidates) {
    const absolute = testInfo.outputPath(candidate)
    if (fs.existsSync(absolute)) {
      return toRepoRelative(absolute)
    }
  }
  return 'none'
}

function appendPageResult(
  pageContract: VisualPageContract,
  result: 'PASS' | 'FAIL',
  actualRef: string,
  diffRef: string,
  styleStats: { passed: number; failed: number } = { passed: 0, failed: 0 },
  criticalSurfaceResults: Record<string, unknown>[] = [],
): void {
  if (!visualPageResultsFile) {
    return
  }
  const record = {
    module: contract?.module || 'unknown',
    page_id: pageContract.page_id,
    route: pageContract.route,
    baseline_ref: pageContract.baseline_ref,
    actual_ref: actualRef,
    diff_ref: diffRef,
    diff_threshold: pageContract.diff_threshold,
    data_mode: pageContract.data_mode || 'live',
    fixture_route_count: pageContract.fixture_routes?.length || 0,
    dynamic_region_count: pageContract.dynamic_regions?.length || 0,
    style_assertions_passed: styleStats.passed,
    style_assertions_failed: styleStats.failed,
    critical_surface_results: criticalSurfaceResults,
    result,
  }
  fs.mkdirSync(path.dirname(visualPageResultsFile), { recursive: true })
  fs.appendFileSync(visualPageResultsFile, `${JSON.stringify(record)}\n`, 'utf-8')
}

function normalizeSelector(selector: string): string {
  return selector.trim().replace(/\s+/g, ' ')
}

function selectorsOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeSelector(left)
  const normalizedRight = normalizeSelector(right)
  if (!normalizedLeft || !normalizedRight) {
    return false
  }
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

function tryParseNumericCss(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) {
    return null
  }
  return { num: Number(match[1]), unit: (match[2] || '').toLowerCase() }
}

async function resolveCriticalSurfaceTarget(
  page: Page,
  surfaceRoot: Locator,
  target?: string,
): Promise<Locator> {
  if (!target || !target.trim()) {
    return surfaceRoot
  }
  const relative = surfaceRoot.locator(target).first()
  if ((await relative.count()) > 0) {
    return relative
  }
  return page.locator(target).first()
}

async function evaluateCriticalSurfaceStyles(
  page: Page,
  surface: VisualCriticalSurfaceContract,
  surfaceRoot: Locator,
): Promise<{ total: number; passed: number; failed: number }> {
  let passed = 0
  let failed = 0
  for (const rule of surface.style_contracts || []) {
    const locator = await resolveCriticalSurfaceTarget(page, surfaceRoot, rule.target)
    if ((await locator.count()) === 0) {
      failed += 1
      continue
    }
    const actual = await locator.evaluate(
      (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
      rule.property,
    )
    if (typeof rule.tolerance === 'number') {
      const expectedParsed = tryParseNumericCss(rule.expected)
      const actualParsed = tryParseNumericCss(actual)
      if (!expectedParsed || !actualParsed || expectedParsed.unit !== actualParsed.unit) {
        failed += 1
        continue
      }
      const diff = Math.abs(actualParsed.num - expectedParsed.num)
      if (diff > rule.tolerance) {
        failed += 1
        continue
      }
      passed += 1
      continue
    }
    if (actual !== rule.expected.trim()) {
      failed += 1
      continue
    }
    passed += 1
  }
  return {
    total: surface.style_contracts?.length || 0,
    passed,
    failed,
  }
}

async function executeCriticalSurfaceStateContracts(
  page: Page,
  surface: VisualCriticalSurfaceContract,
  surfaceRoot: Locator,
): Promise<{ total: number; executed: number; passed: number; failed: number }> {
  let executed = 0
  let passed = 0
  let failed = 0

  for (const contract of surface.state_contracts || []) {
    const primaryTarget = await resolveCriticalSurfaceTarget(page, surfaceRoot, contract.target)
    if ((await primaryTarget.count()) === 0) {
      executed += 1
      failed += 1
      continue
    }

    if (contract.state === 'focus') {
      await primaryTarget.focus()
    } else if (contract.state === 'hover') {
      await primaryTarget.hover()
    }

    let contractPassed = true
    for (const assertion of contract.assertions || []) {
      const assertionTarget = await resolveCriticalSurfaceTarget(page, surfaceRoot, assertion.target || contract.target)
      if ((await assertionTarget.count()) === 0) {
        contractPassed = false
        break
      }
      const actual = await assertionTarget.evaluate(
        (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
        assertion.property,
      )
      if (actual !== assertion.expected.trim()) {
        contractPassed = false
        break
      }
    }

    executed += 1
    if (contractPassed) {
      passed += 1
    } else {
      failed += 1
    }
  }

  return {
    total: surface.state_contracts?.length || 0,
    executed,
    passed,
    failed,
  }
}

async function executeCriticalSurfaceRelationContracts(
  page: Page,
  surface: VisualCriticalSurfaceContract,
  surfaceRoot: Locator,
): Promise<{ total: number; executed: number; passed: number; failed: number }> {
  let executed = 0
  let passed = 0
  let failed = 0

  for (const relation of surface.relation_contracts || []) {
    const target = await resolveCriticalSurfaceTarget(page, surfaceRoot, relation.target)
    if ((await target.count()) === 0) {
      executed += 1
      failed += 1
      continue
    }

    let relationPassed = false
    if (relation.type === 'cover-container') {
      const [surfaceBox, targetBox] = await Promise.all([surfaceRoot.boundingBox(), target.boundingBox()])
      if (surfaceBox && targetBox) {
        const tolerance = 1.5
        relationPassed =
          Math.abs(surfaceBox.x - targetBox.x) <= tolerance &&
          Math.abs(surfaceBox.y - targetBox.y) <= tolerance &&
          Math.abs(surfaceBox.width - targetBox.width) <= tolerance &&
          Math.abs(surfaceBox.height - targetBox.height) <= tolerance
      }
    }

    executed += 1
    if (relationPassed) {
      passed += 1
    } else {
      failed += 1
    }
  }

  return {
    total: surface.relation_contracts?.length || 0,
    executed,
    passed,
    failed,
  }
}

async function collectCriticalSurfaceResults(
  pageContract: VisualPageContract,
  page: Page,
  actualRef: string,
  diffRef: string,
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  const maskSelectors = toMaskSelectors(pageContract)
  for (const surface of pageContract.critical_surfaces || []) {
    const surfaceRoot = page.locator(surface.selector).first()
    const maskPolicyApplied = maskSelectors.some((selector) => selectorsOverlap(selector, surface.selector))
    if ((await surfaceRoot.count()) === 0) {
      results.push({
        surface_id: surface.surface_id,
        selector: surface.selector,
        mask_allowed: surface.mask_allowed,
        mask_policy_applied: maskPolicyApplied,
        baseline_ref: pageContract.baseline_ref,
        actual_ref: actualRef,
        diff_ref: diffRef,
        style_contracts_total: surface.style_contracts?.length || 0,
        style_contracts_passed: 0,
        style_contracts_failed: surface.style_contracts?.length || 0,
        state_contracts_total: surface.state_contracts?.length || 0,
        state_contracts_executed: surface.state_contracts?.length || 0,
        state_contracts_passed: 0,
        state_contracts_failed: surface.state_contracts?.length || 0,
        relation_contracts_total: surface.relation_contracts?.length || 0,
        relation_contracts_executed: surface.relation_contracts?.length || 0,
        relation_contracts_passed: 0,
        relation_contracts_failed: surface.relation_contracts?.length || 0,
        result: 'FAIL',
      })
      continue
    }
    const styleStats = await evaluateCriticalSurfaceStyles(page, surface, surfaceRoot)
    const stateStats = await executeCriticalSurfaceStateContracts(page, surface, surfaceRoot)
    const relationStats = await executeCriticalSurfaceRelationContracts(page, surface, surfaceRoot)
    const surfacePassed =
      !maskPolicyApplied &&
      styleStats.failed === 0 &&
      stateStats.failed === 0 &&
      relationStats.failed === 0
    results.push({
      surface_id: surface.surface_id,
      selector: surface.selector,
      mask_allowed: surface.mask_allowed,
      mask_policy_applied: maskPolicyApplied,
      baseline_ref: pageContract.baseline_ref,
      actual_ref: actualRef,
      diff_ref: diffRef,
      style_contracts_total: styleStats.total,
      style_contracts_passed: styleStats.passed,
      style_contracts_failed: styleStats.failed,
      state_contracts_total: stateStats.total,
      state_contracts_executed: stateStats.executed,
      state_contracts_passed: stateStats.passed,
      state_contracts_failed: stateStats.failed,
      relation_contracts_total: relationStats.total,
      relation_contracts_executed: relationStats.executed,
      relation_contracts_passed: relationStats.passed,
      relation_contracts_failed: relationStats.failed,
      result: surfacePassed ? 'PASS' : 'FAIL',
    })
  }
  return results
}

async function isAnchorVisible(page: Page, anchor: string): Promise<boolean> {
  const locator = page.locator(anchor).first()
  if ((await locator.count()) === 0) {
    return false
  }
  return locator.isVisible()
}

async function assertAnyOfAnchorGroups(page: Page, groups: string[][], pageId: string): Promise<void> {
  if (!Array.isArray(groups) || groups.length === 0) {
    return
  }

  const failedGroups: string[] = []
  for (const group of groups) {
    let allVisible = true
    for (const anchor of group) {
      if (!(await isAnchorVisible(page, anchor))) {
        allVisible = false
        break
      }
    }
    if (allVisible) {
      return
    }
    failedGroups.push(group.join(' && '))
  }

  throw new Error(
    `required_anchors_any_of not satisfied for page '${pageId}', candidate groups: ${failedGroups.join(' || ')}`,
  )
}

function resolvePrototypeUrl(prototypeFile: string): string {
  const normalizedBase = prototypeBaseUrl.replace(/\/+$/, '')
  const normalizedPath = prototypeFile.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}

function buildPrototypeSelectorCandidates(prototypeSelector: string): string[] {
  const candidates = [prototypeSelector]
  const matchA = prototypeSelector.match(/^#([a-z0-9-]+)-page$/i)
  if (matchA) {
    candidates.push(`#page-${matchA[1]}`)
  }
  const matchB = prototypeSelector.match(/^#page-([a-z0-9-]+)$/i)
  if (matchB) {
    candidates.push(`#${matchB[1]}-page`)
  }
  return [...new Set(candidates)]
}

async function findVisibleLocatorByCandidates(page: Page, candidates: string[]): Promise<Locator | null> {
  for (const selector of candidates) {
    const candidate = page.locator(selector).first()
    if ((await candidate.count()) > 0) {
      return candidate
    }
  }
  return null
}

test.describe(`Visual Contract @ui-visual (${contract?.module || 'disabled'}, mode=${visualMode}, source=${visualSource})`, () => {
  test.skip(!contract, 'UI_VISUAL_CONTRACT_JSON is required for visual contract tests')
  if (!contract) {
    return
  }

  for (const pageContract of contract.pages) {
    test(`${pageContract.page_id} visual compare @ui-visual`, async ({ page }, testInfo) => {
      await page.setViewportSize(pageContract.viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await applyStabilityToPage(page, stabilityConfig)

      if (visualSource === 'app' && pageContract.data_mode === 'mock' && pageContract.fixture_routes?.length) {
        await registerVisualFixtureRoutes(page, pageContract.fixture_routes)
      }

      if (visualSource === 'app' && pageContract.auth_mode === 'protected') {
        await loginAsAdmin(page)
      }

      if (visualSource === 'prototype') {
        await page.goto(resolvePrototypeUrl(pageContract.prototype_file))
        const prototypePageKey = resolvePrototypePageKey(pageContract)
        await page.evaluate(({ pageKey, isLoginPage }) => {
          const loginPage = document.getElementById('login-page')
          const mainApp = document.getElementById('main-app')
          if (isLoginPage) {
            if (loginPage) {
              ;(loginPage as HTMLElement).style.display = 'flex'
            }
            if (mainApp) {
              mainApp.classList.remove('active')
            }
            return
          }
          if (loginPage) {
            ;(loginPage as HTMLElement).style.display = 'none'
          }
          if (mainApp) {
            mainApp.classList.add('active')
          }
          const maybeShowPage = (window as Window & { showPage?: (key: string) => void }).showPage
          if (typeof maybeShowPage === 'function') {
            maybeShowPage(pageKey)
          }
        }, { pageKey: prototypePageKey, isLoginPage: pageContract.page_id === 'login-page' })
      } else {
        await page.goto(pageContract.route)
      }
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(pageContract.stable_wait_ms || 300)

      if (visualSource === 'app') {
        for (const anchor of pageContract.required_anchors) {
          await expect(page.locator(anchor).first(), `anchor should exist: ${anchor}`).toBeVisible()
        }
        await assertAnyOfAnchorGroups(page, pageContract.required_anchors_any_of || [], pageContract.page_id)

      } else {
        const selectorCandidates = buildPrototypeSelectorCandidates(pageContract.prototype_selector)
        const prototypeTarget = await findVisibleLocatorByCandidates(page, selectorCandidates)
        expect(
          prototypeTarget,
          `prototype selector should exist, candidates=${selectorCandidates.join(',')}`,
        ).not.toBeNull()
        await expect(prototypeTarget!, `prototype target should be visible: ${selectorCandidates.join(',')}`).toBeVisible()
      }

      const snapshotArg = baselineRefToSnapshotArg(pageContract.baseline_ref)
      const mask = toMaskLocators(pageContract, page)
      const maxDiffPixelRatio = pageContract.diff_threshold
      const actualPath = buildActualPath(pageContract)
      const actualRef = actualPath ? toRepoRelative(actualPath) : 'none'
      let styleStats: { passed: number; failed: number } = { passed: 0, failed: 0 }

      if (visualSource === 'app') {
        try {
          styleStats = await assertStyleContracts(page, pageContract.style_contracts || [], pageContract.page_id)
        } catch (error) {
          const criticalSurfaceResults = await collectCriticalSurfaceResults(pageContract, page, actualRef, 'none')
          appendPageResult(pageContract, 'FAIL', actualRef, 'none', {
            passed: styleStats.passed,
            failed: styleStats.failed + 1,
          }, criticalSurfaceResults)
          throw error
        }
      }

      const captureMode = pageContract.capture_mode || 'clip'
      if (captureMode === 'fullpage') {
        if (actualPath) {
          await page.screenshot({
            path: actualPath,
            fullPage: true,
            animations: 'disabled',
            mask,
          })
        }
        let capturedResult: 'PASS' | 'FAIL' = 'PASS'
        let capturedDiffRef = 'none'
        let capturedError: unknown = null
        try {
          await expect(page).toHaveScreenshot(snapshotArg, {
            fullPage: true,
            animations: 'disabled',
            mask,
            maxDiffPixelRatio,
          })
        } catch (error) {
          capturedResult = 'FAIL'
          const diffRef = inferDiffRefFromArtifacts(testInfo, snapshotArg)
          capturedDiffRef = diffRef !== 'none' ? diffRef : extractDiffRefFromError(error)
          capturedError = error
        }
        const criticalSurfaceResults = await collectCriticalSurfaceResults(pageContract, page, actualRef, capturedDiffRef)
        appendPageResult(pageContract, capturedResult, actualRef, capturedDiffRef, styleStats, criticalSurfaceResults)
        if (capturedError) {
          throw capturedError
        }
        return
      }

      const clipTarget =
        visualSource === 'prototype'
          ? await findVisibleLocatorByCandidates(page, buildPrototypeSelectorCandidates(pageContract.prototype_selector))
          : page.locator(pageContract.clip_selector || pageContract.prototype_selector).first()
      expect(clipTarget, 'clip target should exist').not.toBeNull()
      await expect(clipTarget!, 'clip target should be visible').toBeVisible()
      if (actualPath) {
        await clipTarget!.screenshot({
          path: actualPath,
          animations: 'disabled',
        })
      }
      let capturedResult: 'PASS' | 'FAIL' = 'PASS'
      let capturedDiffRef = 'none'
      let capturedError: unknown = null
      try {
        await expect(clipTarget!).toHaveScreenshot(snapshotArg, {
          animations: 'disabled',
          mask,
          maxDiffPixelRatio,
        })
      } catch (error) {
        capturedResult = 'FAIL'
        const diffRef = inferDiffRefFromArtifacts(testInfo, snapshotArg)
        capturedDiffRef = diffRef !== 'none' ? diffRef : extractDiffRefFromError(error)
        capturedError = error
      }
      const criticalSurfaceResults = await collectCriticalSurfaceResults(pageContract, page, actualRef, capturedDiffRef)
      appendPageResult(pageContract, capturedResult, actualRef, capturedDiffRef, styleStats, criticalSurfaceResults)
      if (capturedError) {
        throw capturedError
      }
    })
  }
})
