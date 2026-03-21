import { describe, expect, it } from 'vitest'

import {
  deriveSafeMicroSpacingRegions,
  deriveSafeLowSalienceTextIconRegions,
  evaluatePostFailureAllowance,
  type AllowanceNodeSnapshot,
  type PostFailureAllowanceInput,
} from '../../../../tests/e2e/support/post-failure-allowance'

import type { VisualResidualBox } from '../../../../tests/e2e/support/visual-residual-classifier'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<AllowanceNodeSnapshot> = {}): AllowanceNodeSnapshot {
  return {
    tagName: 'div',
    className: '',
    role: '',
    box: { x: 50, y: 50, width: 200, height: 40 },
    display: 'flex',
    visibility: 'visible',
    opacity: 1,
    backgroundColor: 'rgb(255, 255, 255)',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'visible',
    childCount: 2,
    ...overrides,
  }
}

function makeRootBox(w = 1440, h = 900): VisualResidualBox {
  return { x: 0, y: 0, width: w, height: h }
}

// ---------------------------------------------------------------------------
// deriveSafeMicroSpacingRegions
// ---------------------------------------------------------------------------

describe('deriveSafeMicroSpacingRegions', () => {
  it('returns micro_spacing regions from shell-styled nodes', () => {
    const nodes: AllowanceNodeSnapshot[] = [
      makeSnapshot({
        tagName: 'div',
        display: 'flex',
        backgroundColor: 'rgb(255, 255, 255)',
        borderWidth: 1,
        box: { x: 10, y: 10, width: 200, height: 40 },
      }),
      makeSnapshot({
        tagName: 'div',
        display: 'block',
        borderRadius: 12,
        box: { x: 10, y: 60, width: 200, height: 40 },
      }),
    ]
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBeGreaterThanOrEqual(2)
    for (const region of regions) {
      expect(region.class).toBe('micro_spacing')
      expect(region.boxes.length).toBeGreaterThan(0)
    }
  })

  it('excludes layout-only transparent containers without shell styles', () => {
    const nodes: AllowanceNodeSnapshot[] = [
      makeSnapshot({
        tagName: 'div',
        display: 'flex',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 0,
        borderRadius: 0,
        overflow: 'visible',
        box: { x: 40, y: 40, width: 400, height: 200 },
      }),
    ]
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(0)
  })

  it('excludes forbidden node types (img, canvas, video, svg, iframe)', () => {
    const forbidden = ['img', 'canvas', 'video', 'svg', 'iframe', 'object', 'embed']
    for (const tag of forbidden) {
      const nodes = [makeSnapshot({ tagName: tag, box: { x: 10, y: 10, width: 100, height: 100 } })]
      const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
      expect(regions.length, `${tag} should be excluded`).toBe(0)
    }
  })

  it('excludes body and html nodes', () => {
    for (const tag of ['body', 'html']) {
      const nodes = [makeSnapshot({ tagName: tag, box: { x: 0, y: 0, width: 1440, height: 900 } })]
      const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
      expect(regions.length, `${tag} should be excluded`).toBe(0)
    }
  })

  it('excludes near-root giant boxes that cover most of root area', () => {
    const nodes = [
      makeSnapshot({ box: { x: 0, y: 0, width: 1400, height: 880 } }),
    ]
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(0)
  })

  it('excludes very small boxes', () => {
    const nodes = [
      makeSnapshot({ box: { x: 100, y: 100, width: 2, height: 2 } }),
    ]
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(0)
  })

  it('deduplicates heavily overlapping boxes', () => {
    const nodes = [
      makeSnapshot({ box: { x: 10, y: 10, width: 100, height: 40 } }),
      makeSnapshot({ box: { x: 12, y: 11, width: 98, height: 39 } }),
    ]
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBeLessThanOrEqual(1)
  })

  it('returns empty when no nodes qualify (fail-closed)', () => {
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), [])
    expect(regions.length).toBe(0)
  })

  it('excludes captcha/chart/avatar semantic nodes by className', () => {
    const riskyClasses = ['captcha-code', 'chart-container', 'avatar', 'qr-code', 'barcode']
    for (const cls of riskyClasses) {
      const nodes = [makeSnapshot({ className: cls, box: { x: 10, y: 10, width: 100, height: 100 } })]
      const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
      expect(regions.length, `className "${cls}" should be excluded`).toBe(0)
    }
  })

  it('includes interactive shell nodes (button, input, select, textarea)', () => {
    for (const tag of ['button', 'input', 'select', 'textarea']) {
      const nodes = [makeSnapshot({ tagName: tag, display: 'inline-block', backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, box: { x: 50, y: 50, width: 120, height: 36 } })]
      const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
      expect(regions.length, `${tag} should be included as interactive shell`).toBeGreaterThanOrEqual(1)
    }
  })

  it('caps total candidate count', () => {
    const nodes = Array.from({ length: 500 }, (_, i) =>
      makeSnapshot({ box: { x: i * 3, y: i * 3, width: 20, height: 20 } }),
    )
    const regions = deriveSafeMicroSpacingRegions(makeRootBox(), nodes)
    expect(regions.length).toBeLessThanOrEqual(200)
  })
})

describe('deriveSafeLowSalienceTextIconRegions', () => {
  it('returns low_salience_text_icon_rasterization regions from text/icon leaf nodes', () => {
    const nodes: AllowanceNodeSnapshot[] = [
      makeSnapshot({
        tagName: 'span',
        className: 'dashboard-card__label',
        display: 'inline',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 0,
        borderRadius: 0,
        childCount: 0,
        box: { x: 40, y: 40, width: 90, height: 18 },
      }),
      makeSnapshot({
        tagName: 'span',
        className: 'mdi mdi-home',
        display: 'inline-block',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 0,
        borderRadius: 0,
        childCount: 0,
        box: { x: 140, y: 40, width: 20, height: 20 },
      }),
    ]
    const regions = deriveSafeLowSalienceTextIconRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(2)
    for (const region of regions) {
      expect(region.class).toBe('low_salience_text_icon_rasterization')
    }
  })

  it('excludes shell containers and risky semantic nodes', () => {
    const nodes: AllowanceNodeSnapshot[] = [
      makeSnapshot({
        tagName: 'div',
        className: 'card-shell',
        display: 'flex',
        backgroundColor: 'rgb(255, 255, 255)',
        borderWidth: 1,
        childCount: 3,
        box: { x: 20, y: 20, width: 200, height: 80 },
      }),
      makeSnapshot({
        tagName: 'span',
        className: 'badge-count',
        display: 'inline',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 0,
        borderRadius: 0,
        childCount: 0,
        box: { x: 240, y: 20, width: 24, height: 16 },
      }),
    ]
    const regions = deriveSafeLowSalienceTextIconRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(0)
  })

  it('includes compact decorative icon chips while still excluding large containers', () => {
    const nodes: AllowanceNodeSnapshot[] = [
      makeSnapshot({
        tagName: 'div',
        className: 'stat-card__icon',
        display: 'flex',
        backgroundColor: 'rgb(238, 242, 255)',
        borderWidth: 0,
        borderRadius: 12,
        childCount: 1,
        box: { x: 30, y: 30, width: 44, height: 44 },
      }),
      makeSnapshot({
        tagName: 'div',
        className: 'recent-activity',
        display: 'block',
        backgroundColor: 'rgb(255, 255, 255)',
        borderWidth: 0,
        borderRadius: 16,
        childCount: 8,
        box: { x: 20, y: 20, width: 736, height: 420 },
      }),
    ]

    const regions = deriveSafeLowSalienceTextIconRegions(makeRootBox(), nodes)
    expect(regions.length).toBe(1)
    expect(regions[0].boxes[0]).toEqual({ x: 30, y: 30, width: 44, height: 44 })
  })
})

// ---------------------------------------------------------------------------
// evaluatePostFailureAllowance (pure / sync subset)
// ---------------------------------------------------------------------------

describe('evaluatePostFailureAllowance', () => {
  it('prefers explicit residual_regions over derived safe boxes', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 11, y: 12 }],
      explicitResidualRegions: [
        { class: 'micro_spacing', selectors: ['.btn'], boxes: [{ x: 10, y: 10, width: 100, height: 40 }] },
      ],
      derivedSafeBoxes: [],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(true)
    expect(result.source).toBe('explicit')
  })

  it('falls back to derived safe boxes when explicit regions absent', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 51, y: 52 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [{ x: 50, y: 50, width: 100, height: 40 }],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(true)
    expect(result.source).toBe('derived')
  })

  it('falls back to derived allowances when explicit regions exist but remain too narrow', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 80, y: 66 }],
      explicitResidualRegions: [
        { class: 'micro_spacing', selectors: ['.shell'], boxes: [{ x: 10, y: 10, width: 40, height: 40 }] },
      ],
      derivedSafeBoxes: [],
      derivedLowSalienceTextIconBoxes: [{ x: 40, y: 50, width: 120, height: 24 }],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(true)
    expect(result.source).toBe('hybrid')
    expect(result.classifierResult.classBreakdown.low_salience_text_icon_rasterization).toBe(1)
  })

  it('fails when diff pixels fall outside all safe boxes (geometry_change)', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 500, y: 500 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [{ x: 10, y: 10, width: 50, height: 50 }],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(false)
  })

  it('fails when diff pixels are inside safe box but not in edge band', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 60, y: 70 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [{ x: 50, y: 50, width: 100, height: 40 }],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(false)
  })

  it('fails when forbidden regions are hit', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 85, y: 35 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [{ x: 80, y: 30, width: 50, height: 20 }],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [
        { class: 'captcha_like', selector: '.captcha', boxes: [{ x: 80, y: 30, width: 50, height: 20 }] },
      ],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(false)
    expect(result.classifierResult.forbiddenResidualDetected).toBe(true)
  })

  it('returns not-applied when no explicit regions and no derived boxes', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 100, y: 100 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [],
      derivedLowSalienceTextIconBoxes: [],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(false)
    expect(result.pass).toBe(false)
  })

  it('allows derived low-salience text/icon residuals without requiring edge-band proximity', () => {
    const input: PostFailureAllowanceInput = {
      diffPixels: [{ x: 80, y: 66 }],
      explicitResidualRegions: [],
      derivedSafeBoxes: [],
      derivedLowSalienceTextIconBoxes: [{ x: 40, y: 50, width: 120, height: 24 }],
      forbiddenRegions: [],
      microSpacingEdgeBandPx: 4,
    }
    const result = evaluatePostFailureAllowance(input)
    expect(result.applied).toBe(true)
    expect(result.pass).toBe(true)
    expect(result.source).toBe('derived')
    expect(result.classifierResult.classBreakdown.low_salience_text_icon_rasterization).toBe(1)
  })
})
