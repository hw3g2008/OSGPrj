import { describe, expect, it } from 'vitest'

import {
  classifyVisualResiduals,
  type VisualResidualClassifierInput,
} from '../../../../tests/e2e/support/visual-residual-classifier'

function buildInput(overrides: Partial<VisualResidualClassifierInput> = {}): VisualResidualClassifierInput {
  return {
    diffPixels: [],
    allowedRegions: [],
    forbiddenRegions: [],
    microSpacingEdgeBandPx: 4,
    ...overrides,
  }
}

describe('visual residual classifier', () => {
  it('passes thin edge-band residuals for micro spacing', () => {
    const result = classifyVisualResiduals(buildInput({
      allowedRegions: [
        {
          class: 'micro_spacing',
          selector: '.login-form',
          boxes: [{ x: 10, y: 10, width: 100, height: 40 }],
        },
      ],
      diffPixels: [
        { x: 10, y: 12 },
        { x: 11, y: 12 },
        { x: 108, y: 18 },
        { x: 45, y: 10 },
      ],
    }))

    expect(result.pass).toBe(true)
    expect(result.forbiddenResidualDetected).toBe(false)
    expect(result.classBreakdown.micro_spacing).toBe(4)
  })

  it('passes low-salience text and icon rasterization residuals', () => {
    const result = classifyVisualResiduals(buildInput({
      allowedRegions: [
        {
          class: 'low_salience_text_icon_rasterization',
          selector: '.login-title',
          boxes: [{ x: 20, y: 20, width: 60, height: 18 }],
        },
      ],
      diffPixels: [
        { x: 25, y: 25 },
        { x: 26, y: 25 },
        { x: 40, y: 28 },
      ],
    }))

    expect(result.pass).toBe(true)
    expect(result.forbiddenResidualDetected).toBe(false)
    expect(result.classBreakdown.low_salience_text_icon_rasterization).toBe(3)
  })

  it('fails when captcha-like residuals are present', () => {
    const result = classifyVisualResiduals(buildInput({
      forbiddenRegions: [
        {
          class: 'captcha_like',
          selector: '.captcha-code',
          boxes: [{ x: 80, y: 30, width: 50, height: 20 }],
        },
      ],
      diffPixels: [
        { x: 90, y: 35 },
        { x: 95, y: 39 },
      ],
    }))

    expect(result.pass).toBe(false)
    expect(result.forbiddenResidualDetected).toBe(true)
    expect(result.classBreakdown.captcha_like).toBe(2)
  })

  it('fails large solid-block changes inside micro spacing regions as geometry change', () => {
    const result = classifyVisualResiduals(buildInput({
      allowedRegions: [
        {
          class: 'micro_spacing',
          selector: '.login-form',
          boxes: [{ x: 10, y: 10, width: 100, height: 40 }],
        },
      ],
      diffPixels: [
        { x: 40, y: 20 },
        { x: 41, y: 20 },
        { x: 42, y: 20 },
        { x: 40, y: 21 },
      ],
    }))

    expect(result.pass).toBe(false)
    expect(result.forbiddenResidualDetected).toBe(true)
    expect(result.classBreakdown.geometry_change).toBe(4)
  })

  it('fails pixels that fall outside declared regions as unknown', () => {
    const result = classifyVisualResiduals(buildInput({
      allowedRegions: [
        {
          class: 'low_salience_text_icon_rasterization',
          selector: '.login-title',
          boxes: [{ x: 20, y: 20, width: 60, height: 18 }],
        },
      ],
      diffPixels: [
        { x: 200, y: 200 },
      ],
    }))

    expect(result.pass).toBe(false)
    expect(result.forbiddenResidualDetected).toBe(true)
    expect(result.classBreakdown.unknown).toBe(1)
  })
})
