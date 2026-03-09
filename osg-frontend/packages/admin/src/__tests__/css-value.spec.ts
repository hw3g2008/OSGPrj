import { describe, expect, it } from 'vitest'
import {
  isCssSemanticallyEqual,
  normalizeCssValueForComparison,
} from '../../../../tests/e2e/support/css-value'

describe('css value normalization', () => {
  it('normalizes hex and rgb colors to the same semantic value', () => {
    expect(normalizeCssValueForComparison('background-color', '#fff')).toBe('rgb(255, 255, 255)')
    expect(isCssSemanticallyEqual('background-color', '#fff', 'rgb(255, 255, 255)')).toBe(true)
  })

  it('normalizes rgba spacing differences', () => {
    expect(
      isCssSemanticallyEqual('background-color', 'rgba(0,0,0,0.5)', 'rgba(0, 0, 0, 0.5)'),
    ).toBe(true)
  })
})
