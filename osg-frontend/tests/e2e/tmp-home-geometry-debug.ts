import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

import { loginAsAdmin } from './support/auth.ts'
import { registerVisualFixtureRoutes } from './support/visual-fixture.ts'

type Box = { x: number; y: number; width: number; height: number }
type Pixel = { x: number; y: number }
type ResidualRegion = { class: 'micro_spacing' | 'low_salience_text_icon_rasterization'; selectors: string[] }

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const contractPath = path.resolve(repoRoot, 'osg-spec-docs/tasks/audit/ui-visual-contract-admin-2026-03-16.json')
const diffPath = path.resolve(
  repoRoot,
  'osg-frontend/test-results/visual-contract.e2e-Visual-641a8-me-visual-compare-ui-visual-chromium/admin-home-1440x900-diff.png',
)

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

async function main() {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'))
  const pageContract = contract.pages.find((page: any) => page.page_id === 'home')
  if (!pageContract) {
    throw new Error('home page contract not found')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: pageContract.viewport })

  try {
    await registerVisualFixtureRoutes(page as any, pageContract.fixture_routes || [])
    await loginAsAdmin(page as any)
    await page.goto(`http://127.0.0.1:4173${pageContract.route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(pageContract.stable_wait_ms || 500)

    const clipSelector = pageContract.clip_selector || '.dashboard'
    const captureOrigin = await page.locator(clipSelector).first().evaluate((element) => {
      const rect = (element as Element).getBoundingClientRect()
      return {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
      }
    })

    const diffPixels: Pixel[] = await page.evaluate(async ({ pngBase64 }) => {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('failed to decode diff png'))
        img.src = `data:image/png;base64,${pngBase64}`
      })
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('2d canvas unavailable')
      ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const pixels: Pixel[] = []
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (y * canvas.width + x) * 4
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          if (a > 0 && !(r === g && g === b)) {
            pixels.push({ x, y })
          }
        }
      }
      return pixels
    }, { pngBase64: fs.readFileSync(diffPath).toString('base64') })

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
  } finally {
    await page.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
