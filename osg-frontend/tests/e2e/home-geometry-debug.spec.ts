import fs from 'node:fs'
import path from 'node:path'

import { test } from '@playwright/test'

import { loginAsAdmin } from './support/auth'
import { registerVisualFixtureRoutes } from './support/visual-fixture'

type Box = { x: number; y: number; width: number; height: number }
type Pixel = { x: number; y: number }
type ResidualRegion = { class: 'micro_spacing' | 'low_salience_text_icon_rasterization'; selectors: string[] }

function pointInBox(pixel: Pixel, box: Box): boolean {
  return (
    pixel.x >= box.x &&
    pixel.x < box.x + box.width &&
    pixel.y >= box.y &&
    pixel.y < box.y + box.height
  )
}

function pointInEdgeBand(pixel: Pixel, box: Box, edgeBandPx: number): boolean {
  if (!pointInBox(pixel, box)) return false
  const left = pixel.x - box.x
  const right = box.x + box.width - 1 - pixel.x
  const top = pixel.y - box.y
  const bottom = box.y + box.height - 1 - pixel.y
  return Math.min(left, right, top, bottom) < edgeBandPx
}

test('home geometry residual debug', async ({ page }) => {
  const repoRoot = path.resolve(__dirname, '..', '..')
  const contractPath = path.resolve(repoRoot, '../osg-spec-docs/tasks/audit/ui-visual-contract-admin-2026-03-16.json')
  const pageReportPath = path.resolve(repoRoot, '../osg-spec-docs/tasks/audit/ui-visual-page-report-admin-2026-03-16.json')

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'))
  const pageContract = contract.pages.find((item: any) => item.page_id === 'home')
  if (!pageContract) {
    throw new Error('home page contract not found')
  }
  const pageReport = JSON.parse(fs.readFileSync(pageReportPath, 'utf-8'))
  const homeReport = pageReport.pages.find((item: any) => item.page_id === 'home')
  if (!homeReport?.actual_ref || homeReport.actual_ref === 'none') {
    throw new Error('home actual_ref not found in page report')
  }
  const baselinePath = path.resolve(repoRoot, '..', pageContract.baseline_ref)
  const actualPath = path.resolve(repoRoot, '..', homeReport.actual_ref)
  const diffPath = process.env.HOME_DIFF_PNG
    ? path.resolve(process.env.HOME_DIFF_PNG)
    : null

  await registerVisualFixtureRoutes(page, pageContract.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(pageContract.route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(pageContract.stable_wait_ms || 500)

  const clipSelector = pageContract.clip_selector || '.dashboard'
  const captureOrigin = await page.locator(clipSelector).first().evaluate((element) => {
    const rect = (element as Element).getBoundingClientRect()
    return {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
    }
  })

  const diffPixels: Pixel[] = await page.evaluate(async ({ baselinePngBase64, actualPngBase64, diffPngBase64 }) => {
    const loadImage = async (pngBase64: string): Promise<HTMLImageElement> => await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('failed to decode visual png'))
      img.src = `data:image/png;base64,${pngBase64}`
    })
    if (diffPngBase64) {
      const diffImage = await loadImage(diffPngBase64)
      const diffCanvas = document.createElement('canvas')
      diffCanvas.width = diffImage.width
      diffCanvas.height = diffImage.height
      const diffCtx = diffCanvas.getContext('2d')
      if (!diffCtx) throw new Error('diff 2d canvas unavailable')
      diffCtx.drawImage(diffImage, 0, 0)
      const diffData = diffCtx.getImageData(0, 0, diffCanvas.width, diffCanvas.height).data
      const pixels: Pixel[] = []
      for (let y = 0; y < diffCanvas.height; y += 1) {
        for (let x = 0; x < diffCanvas.width; x += 1) {
          const i = (y * diffCanvas.width + x) * 4
          const r = diffData[i]
          const g = diffData[i + 1]
          const b = diffData[i + 2]
          const a = diffData[i + 3]
          if (a > 0 && !(r === g && g === b)) {
            pixels.push({ x, y })
          }
        }
      }
      return pixels
    }
    const [baselineImage, actualImage] = await Promise.all([
      loadImage(baselinePngBase64),
      loadImage(actualPngBase64),
    ])
    if (baselineImage.width !== actualImage.width || baselineImage.height !== actualImage.height) {
      throw new Error(`image dimensions mismatch: baseline=${baselineImage.width}x${baselineImage.height}, actual=${actualImage.width}x${actualImage.height}`)
    }
    const baselineCanvas = document.createElement('canvas')
    baselineCanvas.width = baselineImage.width
    baselineCanvas.height = baselineImage.height
    const baselineCtx = baselineCanvas.getContext('2d')
    if (!baselineCtx) throw new Error('baseline 2d canvas unavailable')
    baselineCtx.drawImage(baselineImage, 0, 0)
    const baselineData = baselineCtx.getImageData(0, 0, baselineCanvas.width, baselineCanvas.height).data
    const actualCanvas = document.createElement('canvas')
    actualCanvas.width = actualImage.width
    actualCanvas.height = actualImage.height
    const actualCtx = actualCanvas.getContext('2d')
    if (!actualCtx) throw new Error('actual 2d canvas unavailable')
    actualCtx.drawImage(actualImage, 0, 0)
    const actualData = actualCtx.getImageData(0, 0, actualCanvas.width, actualCanvas.height).data
    const pixels: Pixel[] = []
    for (let y = 0; y < baselineCanvas.height; y += 1) {
      for (let x = 0; x < baselineCanvas.width; x += 1) {
        const i = (y * baselineCanvas.width + x) * 4
        const br = baselineData[i]
        const bg = baselineData[i + 1]
        const bb = baselineData[i + 2]
        const ba = baselineData[i + 3]
        const ar = actualData[i]
        const ag = actualData[i + 1]
        const ab = actualData[i + 2]
        const aa = actualData[i + 3]
        if (br !== ar || bg !== ag || bb !== ab || ba !== aa) {
          pixels.push({ x, y })
        }
      }
    }
    return pixels
  }, {
    baselinePngBase64: fs.readFileSync(baselinePath).toString('base64'),
    actualPngBase64: fs.readFileSync(actualPath).toString('base64'),
    diffPngBase64: diffPath ? fs.readFileSync(diffPath).toString('base64') : null,
  })

  const residualRegions: ResidualRegion[] = pageContract.residual_regions || []
  const regionBoxes = []
  for (const region of residualRegions) {
    const boxes = await page.evaluate(
      ({ selectors, origin }) => {
        const collected: Array<{ selector: string; box: Box }> = []
        for (const selector of selectors) {
          for (const element of Array.from(document.querySelectorAll(selector))) {
            const rect = element.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) continue
            collected.push({
              selector,
              box: {
                x: Math.round(rect.left + window.scrollX - origin.x),
                y: Math.round(rect.top + window.scrollY - origin.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            })
          }
        }
        return collected
      },
      { selectors: region.selectors, origin: captureOrigin },
    )
    regionBoxes.push({
      class: region.class,
      entries: boxes,
    })
  }

  const lowBoxes = regionBoxes
    .filter((region) => region.class === 'low_salience_text_icon_rasterization')
    .flatMap((region) => region.entries)
  const microBoxes = regionBoxes
    .filter((region) => region.class === 'micro_spacing')
    .flatMap((region) => region.entries)

  const selectorCounts = new Map<string, number>()
  const samplePixels: Array<{ x: number; y: number; selectors: string[] }> = []
  let geometry = 0
  let micro = 0
  let low = 0
  let unknown = 0

  for (const pixel of diffPixels) {
    if (lowBoxes.some((entry) => pointInBox(pixel, entry.box))) {
      low += 1
      continue
    }

    const containingMicro = microBoxes.filter((entry) => pointInBox(pixel, entry.box))
    if (containingMicro.length > 0) {
      if (containingMicro.some((entry) => pointInEdgeBand(pixel, entry.box, 4))) {
        micro += 1
        continue
      }
      geometry += 1
      const selectors = [...new Set(containingMicro.map((entry) => entry.selector))]
      for (const selector of selectors) {
        selectorCounts.set(selector, (selectorCounts.get(selector) || 0) + 1)
      }
      if (samplePixels.length < 40) {
        samplePixels.push({ x: pixel.x, y: pixel.y, selectors })
      }
      continue
    }

    unknown += 1
  }

  console.log(JSON.stringify({
    totalDiffPixels: diffPixels.length,
    low,
    micro,
    geometry,
    unknown,
    topGeometrySelectors: [...selectorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    sampleGeometryPixels: samplePixels,
  }, null, 2))
})
