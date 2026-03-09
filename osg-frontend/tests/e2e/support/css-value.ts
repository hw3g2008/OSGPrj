const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const RGB_COLOR_RE = /^rgba?\((.+)\)$/i

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeRgbInner(inner: string): string {
  return inner
    .split(',')
    .map((segment) => segment.trim())
    .join(', ')
}

function hexToRgb(value: string): string {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(HEX_COLOR_RE)
  if (!match) {
    return normalized
  }

  let hex = match[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  const red = parseInt(hex.slice(0, 2), 16)
  const green = parseInt(hex.slice(2, 4), 16)
  const blue = parseInt(hex.slice(4, 6), 16)
  return `rgb(${red}, ${green}, ${blue})`
}

function normalizeColorLikeValue(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'transparent') {
    return 'rgba(0, 0, 0, 0)'
  }

  if (HEX_COLOR_RE.test(normalized)) {
    return hexToRgb(normalized)
  }

  const rgbMatch = normalized.match(RGB_COLOR_RE)
  if (rgbMatch) {
    const fnName = normalized.startsWith('rgba') ? 'rgba' : 'rgb'
    return `${fnName}(${normalizeRgbInner(rgbMatch[1])})`
  }

  return normalizeWhitespace(normalized)
}

function isColorProperty(property: string): boolean {
  return property.trim().toLowerCase().includes('color')
}

function looksLikeColorValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === 'transparent' || HEX_COLOR_RE.test(normalized) || RGB_COLOR_RE.test(normalized)
}

export function normalizeCssValueForComparison(property: string, value: string): string {
  if (isColorProperty(property) || looksLikeColorValue(value)) {
    return normalizeColorLikeValue(value)
  }
  return normalizeWhitespace(value)
}

export function isCssSemanticallyEqual(property: string, expected: string, actual: string): boolean {
  return (
    normalizeCssValueForComparison(property, expected) ===
    normalizeCssValueForComparison(property, actual)
  )
}
