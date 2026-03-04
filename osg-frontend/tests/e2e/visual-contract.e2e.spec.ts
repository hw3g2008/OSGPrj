import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { baselineRefToSnapshotArg, loadVisualContract, type VisualPageContract, type VisualStyleContractRule } from './support/visual-contract'

const contractJson = process.env.UI_VISUAL_CONTRACT_JSON
const contract = contractJson ? loadVisualContract() : null
const visualMode = process.env.UI_VISUAL_MODE || 'verify'
const visualSource = process.env.UI_VISUAL_SOURCE || 'app'
const prototypeBaseUrl = process.env.UI_VISUAL_PROTOTYPE_BASE_URL || 'http://127.0.0.1:18090'
const visualEvidenceDir = process.env.UI_VISUAL_EVIDENCE_DIR
const visualPageResultsFile = process.env.UI_VISUAL_PAGE_RESULTS_FILE

if (visualSource !== 'app' && visualSource !== 'prototype') {
  throw new Error(`UI_VISUAL_SOURCE must be app|prototype, got '${visualSource}'`)
}

function toMaskLocators(pageContract: VisualPageContract, page: Page): Locator[] {
  const selectors = pageContract.mask_selectors || []
  return selectors.map((selector) => page.locator(selector))
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

function appendPageResult(pageContract: VisualPageContract, result: 'PASS' | 'FAIL', actualRef: string, diffRef: string): void {
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
    result,
  }
  fs.mkdirSync(path.dirname(visualPageResultsFile), { recursive: true })
  fs.appendFileSync(visualPageResultsFile, `${JSON.stringify(record)}\n`, 'utf-8')
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


function tryParseNumericCss(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) {
    return null
  }
  return { num: Number(match[1]), unit: (match[2] || '').toLowerCase() }
}

export async function assertStyleContracts(
  page: Page,
  rules: VisualStyleContractRule[],
  pageId: string,
): Promise<{ passed: number; failed: number }> {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { passed: 0, failed: 0 }
  }

  let passed = 0
  for (const rule of rules) {
    const selector = rule.selector.trim()
    const property = rule.property.trim()
    const expected = rule.expected.trim()

    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) {
      throw new Error(`style contract failed: page=${pageId} selector=${selector} property=${property} reason=not_found`)
    }

    const actual = await locator.evaluate(
      (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
      property,
    )

    if (typeof rule.tolerance === 'number') {
      const expectedParsed = tryParseNumericCss(expected)
      const actualParsed = tryParseNumericCss(actual)
      if (!expectedParsed || !actualParsed || expectedParsed.unit !== actualParsed.unit) {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} reason=unparsable_or_unit_mismatch`,
        )
      }
      const diff = Math.abs(actualParsed.num - expectedParsed.num)
      if (diff > rule.tolerance) {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} tolerance=${rule.tolerance}`,
        )
      }
    } else if (actual !== expected) {
      throw new Error(
        `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual}`,
      )
    }

    passed += 1
  }

  return { passed, failed: 0 }
}

function resolvePrototypeUrl(prototypeFile: string): string {
  const normalizedBase = prototypeBaseUrl.replace(/\/+$/, '')
  const normalizedPath = prototypeFile.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}

function resolvePrototypePageKey(pageContract: VisualPageContract): string {
  const route = pageContract.route || ''
  const routeMap: Record<string, string> = {
    '/dashboard': 'home',
  }
  if (routeMap[route]) {
    return routeMap[route]
  }
  const pageMap: Record<string, string> = {
    dashboard: 'home',
  }
  if (pageMap[pageContract.page_id]) {
    return pageMap[pageContract.page_id]
  }
  return pageContract.page_id
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
        await assertStyleContracts(page, pageContract.style_contracts || [], pageContract.page_id)

        // Login captcha block has dynamic image content, but layout must stay stable.
        // Guard against captcha image squeezing the input area.
        if (pageContract.page_id === 'login-page') {
          const captchaLayout = await page.evaluate(() => {
            const row = document.querySelector('.captcha-row')
            if (!row) return null
            const inputWrap = row.querySelector('.ant-input-affix-wrapper')
            const code = row.querySelector('.captcha-code')
            if (!inputWrap || !code) return null
            const rowRect = row.getBoundingClientRect()
            const inputRect = inputWrap.getBoundingClientRect()
            const codeRect = code.getBoundingClientRect()
            return {
              rowWidth: rowRect.width,
              inputWidth: inputRect.width,
              codeWidth: codeRect.width,
              inputRatio: inputRect.width / rowRect.width,
              codeRatio: codeRect.width / rowRect.width,
            }
          })

          if (captchaLayout) {
            expect(
              captchaLayout.inputRatio,
              `captcha input too narrow: row=${captchaLayout.rowWidth}, input=${captchaLayout.inputWidth}, code=${captchaLayout.codeWidth}`,
            ).toBeGreaterThanOrEqual(0.5)
            expect(
              captchaLayout.codeRatio,
              `captcha image too wide: row=${captchaLayout.rowWidth}, input=${captchaLayout.inputWidth}, code=${captchaLayout.codeWidth}`,
            ).toBeLessThanOrEqual(0.45)
          }

          const inputShellStyle = await page.evaluate(() => {
            const inputWrap = document.querySelector('.captcha-row .ant-input-affix-wrapper')
            if (!inputWrap) return null
            const style = getComputedStyle(inputWrap)
            return {
              borderRadius: style.borderRadius,
              borderTopWidth: style.borderTopWidth,
              backgroundColor: style.backgroundColor,
            }
          })
          expect(inputShellStyle, 'login input shell should exist').not.toBeNull()
          expect(inputShellStyle!.borderRadius, 'login input shell radius should match prototype').toBe('12px')
          expect(inputShellStyle!.borderTopWidth, 'login input shell border width should be 2px').toBe('2px')
          expect(inputShellStyle!.backgroundColor, 'login input shell should be white').toBe('rgb(255, 255, 255)')

          const captchaChipStyle = await page.evaluate(() => {
            const chip = document.querySelector('.captcha-code')
            if (!chip) return null
            const style = getComputedStyle(chip)
            return {
              borderRadius: style.borderRadius,
              backgroundImage: style.backgroundImage,
            }
          })
          expect(captchaChipStyle, 'captcha chip should exist').not.toBeNull()
          expect(captchaChipStyle!.borderRadius, 'captcha chip radius should match decision').toBe('10px')
          expect(captchaChipStyle!.backgroundImage, 'captcha chip should keep gradient shell').toContain('linear-gradient')

          const captchaImageCoverage = await page.evaluate(() => {
            const chip = document.querySelector('.captcha-code')
            const img = document.querySelector('.captcha-code img')
            if (!chip || !img) return null
            const chipRect = chip.getBoundingClientRect()
            const imgRect = img.getBoundingClientRect()
            return {
              chipWidth: chipRect.width,
              chipHeight: chipRect.height,
              imgWidth: imgRect.width,
              imgHeight: imgRect.height,
            }
          })
          expect(captchaImageCoverage, 'captcha image should render').not.toBeNull()
          expect(captchaImageCoverage!.imgWidth, 'captcha image should cover chip width').toBeGreaterThanOrEqual(captchaImageCoverage!.chipWidth)
          expect(captchaImageCoverage!.imgHeight, 'captcha image should cover chip height').toBeGreaterThanOrEqual(captchaImageCoverage!.chipHeight)
        }
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
        try {
          await expect(page).toHaveScreenshot(snapshotArg, {
            fullPage: true,
            animations: 'disabled',
            mask,
            maxDiffPixelRatio,
          })
          appendPageResult(pageContract, 'PASS', actualRef, 'none')
        } catch (error) {
          const diffRef = inferDiffRefFromArtifacts(testInfo, snapshotArg)
          appendPageResult(pageContract, 'FAIL', actualRef, diffRef !== 'none' ? diffRef : extractDiffRefFromError(error))
          throw error
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
      try {
        await expect(clipTarget!).toHaveScreenshot(snapshotArg, {
          animations: 'disabled',
          mask,
          maxDiffPixelRatio,
        })
        appendPageResult(pageContract, 'PASS', actualRef, 'none')
      } catch (error) {
        const diffRef = inferDiffRefFromArtifacts(testInfo, snapshotArg)
        appendPageResult(pageContract, 'FAIL', actualRef, diffRef !== 'none' ? diffRef : extractDiffRefFromError(error))
        throw error
      }
    })
  }
})
