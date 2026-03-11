import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { isCssSemanticallyEqual } from './support/css-value'
import { resolvePrototypePageKey } from './support/prototype-contract'
import { assertStyleContracts } from './support/style-contract'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import {
  baselineRefToSnapshotArg,
  buildSurfaceBaselineRef,
  loadVisualContract,
  type VisualCriticalSurfaceContract,
  type VisualFixtureRoute,
  type VisualPageContract,
  type VisualSurfaceContract,
  type VisualSurfaceCssContract,
  type VisualSurfaceStateContract,
  type VisualSurfaceViewportVariant,
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

function buildSurfaceActualPath(
  surfaceContract: VisualSurfaceContract,
  viewport: VisualSurfaceViewportVariant,
): string | null {
  if (!visualEvidenceDir) {
    return null
  }
  const viewportLabel = `${viewport.viewport_id}-${viewport.width}x${viewport.height}`
  const outputPath = path.resolve(visualEvidenceDir, 'surfaces', surfaceContract.surface_id, `${viewportLabel}.png`)
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
    record_type: 'page',
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

function appendSurfaceResult(surfaceRecord: Record<string, unknown>): void {
  if (!visualPageResultsFile) {
    return
  }
  const record = {
    record_type: 'surface',
    module: contract?.module || 'unknown',
    ...surfaceRecord,
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
    if (!isCssSemanticallyEqual(rule.property, rule.expected.trim(), actual)) {
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
      if (!isCssSemanticallyEqual(assertion.property, assertion.expected.trim(), actual)) {
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

async function assertRequiredAnchors(page: Page, anchors: string[], contextId: string): Promise<void> {
  for (const anchor of anchors) {
    await expect(page.locator(anchor).first(), `anchor should exist: ${contextId} -> ${anchor}`).toBeVisible()
  }
}

const SURFACE_ROOT_SELECTOR_PATTERN = /^\[data-surface-id="([^"]+)"\]$/
const SURFACE_PART_SELECTOR_PATTERN = /^\[data-surface-id="([^"]+)"\]\s+\[data-surface-part="([^"]+)"\]$/

function buildPrototypeSurfacePartSelector(surface: VisualSurfaceContract, partId: string): string | null {
  if (surface.surface_type !== 'modal' && surface.surface_type !== 'wizard-step') {
    return null
  }
  switch (partId) {
    case 'backdrop':
      return surface.prototype_selector
    case 'shell':
      return `${surface.prototype_selector} .modal-content`
    case 'header':
      return `${surface.prototype_selector} .modal-header`
    case 'body':
      return `${surface.prototype_selector} .modal-body`
    case 'footer':
      return `${surface.prototype_selector} .modal-footer`
    case 'close-control':
      return `${surface.prototype_selector} .modal-close`
    default:
      return null
  }
}

function resolveSurfaceSelectorForSource(
  surface: VisualSurfaceContract,
  selector: string,
  prototypeSelector?: string,
): string {
  if (visualSource !== 'prototype') {
    return selector
  }
  if (prototypeSelector?.trim()) {
    return prototypeSelector.trim()
  }

  const normalizedSelector = selector.trim()
  const partMatch = normalizedSelector.match(SURFACE_PART_SELECTOR_PATTERN)
  if (partMatch) {
    const [, surfaceId, partId] = partMatch
    if (surfaceId === surface.surface_id) {
      const mapped = buildPrototypeSurfacePartSelector(surface, partId)
      if (mapped) {
        return mapped
      }
    }
  }

  const rootMatch = normalizedSelector.match(SURFACE_ROOT_SELECTOR_PATTERN)
  if (rootMatch) {
    const [, surfaceId] = rootMatch
    if (surfaceId === surface.surface_id) {
      return `${surface.prototype_selector} .modal-content`
    }
  }

  return normalizedSelector
}

function resolveSurfaceAnchorsForSource(
  surface: VisualSurfaceContract | VisualSurfaceStateContract,
  owner: VisualSurfaceContract,
): string[] {
  const anchors =
    visualSource === 'prototype'
      ? surface.prototype_required_anchors || surface.required_anchors || []
      : surface.required_anchors || []

  return anchors.map((anchor) => resolveSurfaceSelectorForSource(owner, anchor))
}

function flattenSurfaceCssContracts(
  surface: VisualSurfaceContract,
  rules: VisualSurfaceCssContract[] | undefined,
): Array<{
  selector: string
  property: string
  expected: string
}> {
  const flattened: Array<{ selector: string; property: string; expected: string }> = []
  for (const rule of rules || []) {
    if (!rule || typeof rule.selector !== 'string' || typeof rule.css !== 'object' || rule.css === null) {
      continue
    }
    const effectiveSelector = resolveSurfaceSelectorForSource(surface, rule.selector, rule.prototype_selector)
    for (const [property, expected] of Object.entries(rule.css)) {
      flattened.push({
        selector: effectiveSelector,
        property,
        expected: String(expected),
      })
    }
  }
  return flattened
}

async function evaluateGenericCssRules(
  page: Page,
  contextId: string,
  rules: Array<{ selector: string; property: string; expected: string }>,
): Promise<{ total: number; passed: number; failed: number }> {
  let passed = 0
  let failed = 0

  for (const rule of rules) {
    const locator = page.locator(rule.selector).first()
    if ((await locator.count()) === 0) {
      failed += 1
      continue
    }
    const actual = await locator.evaluate(
      (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
      rule.property,
    )
    if (!isCssSemanticallyEqual(rule.property, rule.expected.trim(), actual)) {
      failed += 1
      continue
    }
    passed += 1
  }

  return {
    total: rules.length,
    passed,
    failed,
  }
}

async function navigateToVisualTarget(
  page: Page,
  pageContract: VisualPageContract,
  fixtureRoutes: VisualFixtureRoute[] = pageContract.fixture_routes || [],
): Promise<void> {
  if (visualSource === 'app' && pageContract.data_mode === 'mock' && fixtureRoutes.length) {
    await registerVisualFixtureRoutes(page, fixtureRoutes)
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

  await waitForVisualSettle(page, pageContract.stable_wait_ms || 300)
}

function mergeFixtureRoutes(
  primary: VisualFixtureRoute[] | undefined,
  fallback: VisualFixtureRoute[] | undefined,
): VisualFixtureRoute[] {
  const merged: VisualFixtureRoute[] = []
  const seen = new Set<string>()
  for (const route of [...(primary || []), ...(fallback || [])]) {
    const key = `${(route.method || 'GET').toUpperCase()} ${route.url}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    merged.push(route)
  }
  return merged
}

function findHostPageContract(surfaceContract: VisualSurfaceContract): VisualPageContract {
  const pageContract = contract?.pages.find((page) => page.page_id === surfaceContract.host_page_id)
  if (!pageContract) {
    throw new Error(`host page missing for surface '${surfaceContract.surface_id}': ${surfaceContract.host_page_id}`)
  }
  return pageContract
}

async function resolveSurfaceRoot(page: Page, surface: VisualSurfaceContract): Promise<Locator> {
  const selector = visualSource === 'prototype'
    ? resolveSurfaceSelectorForSource(
        surface,
        surface.surface_root_selector || surface.app_selector || surface.prototype_selector,
      )
    : surface.surface_root_selector || surface.app_selector
  return page.locator(selector).first()
}

function buildSurfaceMaskLocators(surface: VisualSurfaceContract, page: Page): Locator[] {
  return (surface.surface_parts || [])
    .filter((part) => part.mask_allowed)
    .map((part) => page.locator(resolveSurfaceSelectorForSource(surface, part.selector, part.prototype_selector)).first())
}

async function collectSurfacePartResults(page: Page, surface: VisualSurfaceContract): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  for (const part of surface.surface_parts || []) {
    const effectiveSelector = resolveSurfaceSelectorForSource(surface, part.selector, part.prototype_selector)
    const locator = page.locator(effectiveSelector).first()
    const exists = (await locator.count()) > 0
    const visible = exists ? await locator.isVisible() : false
    results.push({
      part_id: part.part_id,
      selector: effectiveSelector,
      mask_allowed: part.mask_allowed,
      exists,
      visible,
      result: exists && visible ? 'PASS' : 'FAIL',
    })
  }
  return results
}

async function collectContentPartResults(page: Page, surface: VisualSurfaceContract): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  for (const part of surface.content_parts || []) {
    const effectiveSelector = resolveSurfaceSelectorForSource(surface, part.selector, part.prototype_selector)
    const locator = page.locator(effectiveSelector).first()
    const exists = (await locator.count()) > 0
    const visible = exists ? await locator.isVisible() : false
    const required = part.required !== false
    results.push({
      part_id: part.part_id,
      selector: effectiveSelector,
      required,
      exists,
      visible,
      result: !required || (exists && visible) ? 'PASS' : 'FAIL',
    })
  }
  return results
}

async function collectSurfaceStateResults(
  page: Page,
  surface: VisualSurfaceContract,
): Promise<{
  total: number
  executed: number
  passed: number
  failed: number
  styleTotal: number
  styleExecuted: number
  stylePassed: number
  styleFailed: number
  results: Record<string, unknown>[]
}> {
  const stateContracts = surface.state_contracts || []
  const results: Record<string, unknown>[] = []
  let passed = 0
  let failed = 0
  let styleTotal = 0
  let styleExecuted = 0
  let stylePassed = 0
  let styleFailed = 0

  for (const contract of stateContracts) {
    const anchors = resolveSurfaceAnchorsForSource(contract, surface)
    let anchorPassed = 0
    for (const anchor of anchors) {
      if (await isAnchorVisible(page, anchor)) {
        anchorPassed += 1
      }
    }
    const flattened = flattenSurfaceCssContracts(surface, contract.style_contracts)
    const styleStats = await evaluateGenericCssRules(page, `${surface.surface_id}:${contract.state_id}`, flattened)
    styleTotal += flattened.length
    styleExecuted += flattened.length
    stylePassed += styleStats.passed
    styleFailed += styleStats.failed
    const result = anchorPassed === anchors.length && styleStats.failed === 0 ? 'PASS' : 'FAIL'
    if (result === 'PASS') {
      passed += 1
    } else {
      failed += 1
    }
    results.push({
      state_id: contract.state_id,
      required_anchors_total: anchors.length,
      required_anchors_passed: anchorPassed,
      style_contracts_total: flattened.length,
      style_contracts_executed: flattened.length,
      style_contracts_passed: styleStats.passed,
      style_contracts_failed: styleStats.failed,
      result,
    })
  }

  return {
    total: stateContracts.length,
    executed: stateContracts.length,
    passed,
    failed,
    styleTotal,
    styleExecuted,
    stylePassed,
    styleFailed,
    results,
  }
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
      await navigateToVisualTarget(page, pageContract)
      if (visualSource === 'app') {
        await assertRequiredAnchors(page, pageContract.required_anchors, pageContract.page_id)
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

  for (const surfaceContract of contract.surfaces || []) {
    test(`${surfaceContract.surface_id} visual compare @ui-visual`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await applyStabilityToPage(page, stabilityConfig)

      const hostPage = findHostPageContract(surfaceContract)
      const trigger = surfaceContract.trigger_action || { type: 'auto-open' as const }
      const viewportResults: Record<string, unknown>[] = []
      let overallResult: 'PASS' | 'FAIL' = 'PASS'
      for (const viewport of surfaceContract.viewport_variants || []) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const mergedFixtureRoutes = mergeFixtureRoutes(surfaceContract.fixture_routes, hostPage.fixture_routes)
        await navigateToVisualTarget(page, hostPage, mergedFixtureRoutes)
        await performSurfaceTrigger(page, hostPage, surfaceContract, visualSource)

      const surfaceRoot = await resolveSurfaceRoot(page, surfaceContract)
      await expect(
        surfaceRoot,
          `surface root should be visible: ${surfaceContract.surface_id} -> ${
            visualSource === 'prototype' ? surfaceContract.prototype_selector : surfaceContract.surface_root_selector
          }`,
      ).toBeVisible()

        await assertRequiredAnchors(
          page,
          resolveSurfaceAnchorsForSource(surfaceContract, surfaceContract),
          surfaceContract.surface_id,
        )

        const baselineRef = buildSurfaceBaselineRef(contract.module, surfaceContract.surface_id, viewport)
        const snapshotArg = baselineRefToSnapshotArg(baselineRef)
        const actualPath = buildSurfaceActualPath(surfaceContract, viewport)
        const actualRef = actualPath ? toRepoRelative(actualPath) : 'none'
        const mask = buildSurfaceMaskLocators(surfaceContract, page)

        const actualBuffer = await surfaceRoot.screenshot({
          animations: 'disabled',
          mask,
        })
        if (actualPath) {
          fs.writeFileSync(actualPath, actualBuffer)
        }
        let capturedResult: 'PASS' | 'FAIL' = 'PASS'
        let capturedDiffRef = 'none'
        let capturedError: unknown = null
        try {
          await expect(actualBuffer).toMatchSnapshot(snapshotArg, {
            maxDiffPixelRatio: hostPage.diff_threshold,
          })
        } catch (error) {
          capturedResult = 'FAIL'
          const diffRef = inferDiffRefFromArtifacts(testInfo, snapshotArg)
          capturedDiffRef = diffRef !== 'none' ? diffRef : extractDiffRefFromError(error)
          capturedError = error
        }

        const surfacePartResults = await collectSurfacePartResults(page, surfaceContract)
        const contentPartResults = await collectContentPartResults(page, surfaceContract)
        const styleStats =
          visualSource === 'app'
            ? await evaluateGenericCssRules(
                page,
                surfaceContract.surface_id,
                flattenSurfaceCssContracts(surfaceContract, surfaceContract.style_contracts),
              )
            : { total: 0, passed: 0, failed: 0 }
        const stateStats =
          visualSource === 'app'
            ? await collectSurfaceStateResults(page, surfaceContract)
            : {
                total: 0,
                executed: 0,
                passed: 0,
                failed: 0,
                styleTotal: 0,
                styleExecuted: 0,
                stylePassed: 0,
                styleFailed: 0,
                results: [] as Record<string, unknown>[],
              }

        const viewportPassed =
          capturedResult === 'PASS' &&
          styleStats.failed === 0 &&
          stateStats.failed === 0 &&
          stateStats.styleFailed === 0 &&
          surfacePartResults.every((entry) => entry.result === 'PASS') &&
          contentPartResults.every((entry) => entry.result === 'PASS')

        viewportResults.push({
          viewport_id: viewport.viewport_id,
          width: viewport.width,
          height: viewport.height,
          baseline_ref: baselineRef,
          actual_ref: actualRef,
          diff_ref: capturedDiffRef,
          diff_threshold: hostPage.diff_threshold,
          surface_part_results: surfacePartResults,
          content_part_results: contentPartResults,
          style_contracts_total: styleStats.total,
          style_contracts_passed: styleStats.passed,
          style_contracts_failed: styleStats.failed,
          state_contracts_total: stateStats.total,
          state_contracts_executed: stateStats.executed,
          state_contracts_passed: stateStats.passed,
          state_contracts_failed: stateStats.failed,
          state_style_contracts_total: stateStats.styleTotal,
          state_style_contracts_executed: stateStats.styleExecuted,
          state_style_contracts_passed: stateStats.stylePassed,
          state_style_contracts_failed: stateStats.styleFailed,
          state_results: stateStats.results,
          result: viewportPassed ? 'PASS' : 'FAIL',
        })

        if (!viewportPassed) {
          overallResult = 'FAIL'
        }
        if (capturedError) {
          overallResult = 'FAIL'
        }
      }

      appendSurfaceResult({
        surface_id: surfaceContract.surface_id,
        surface_type: surfaceContract.surface_type,
        host_page_id: surfaceContract.host_page_id,
        trigger_action_type: trigger.type,
        trigger_selector: trigger.selector || '',
        portal_host: surfaceContract.portal_host || '',
        surface_root_selector: surfaceContract.surface_root_selector,
        backdrop_selector: surfaceContract.backdrop_selector || '',
        viewport_variants_total: (surfaceContract.viewport_variants || []).length,
        viewport_variants_executed: viewportResults.length,
        viewport_variants_failed: viewportResults.filter((entry) => entry.result === 'FAIL').length,
        viewport_results: viewportResults,
        result: overallResult,
      })

      expect(overallResult, `surface should pass across all viewports: ${surfaceContract.surface_id}`).toBe('PASS')
    })
  }
})
