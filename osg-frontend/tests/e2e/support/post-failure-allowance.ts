import type { Locator } from '@playwright/test'

import {
  classifyVisualResiduals,
  type AllowedVisualResidualRegion,
  type ForbiddenVisualResidualRegion,
  type VisualResidualBox,
  type VisualResidualClassifierResult,
  type VisualResidualPixel,
} from './visual-residual-classifier'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AllowanceNodeSnapshot {
  tagName: string
  className: string
  role: string
  box: { x: number; y: number; width: number; height: number }
  display: string
  visibility: string
  opacity: number
  backgroundColor: string
  borderWidth: number
  borderRadius: number
  overflow: string
  childCount: number
}

export interface ExplicitResidualRegion {
  class: 'micro_spacing' | 'low_salience_text_icon_rasterization'
  selectors: string[]
  boxes: VisualResidualBox[]
}

export interface PostFailureAllowanceInput {
  diffPixels: VisualResidualPixel[]
  explicitResidualRegions: ExplicitResidualRegion[]
  derivedSafeBoxes: VisualResidualBox[]
  derivedLowSalienceTextIconBoxes: VisualResidualBox[]
  forbiddenRegions: ForbiddenVisualResidualRegion[]
  microSpacingEdgeBandPx: number
}

export interface PostFailureAllowanceResult {
  applied: boolean
  pass: boolean
  source: 'explicit' | 'derived' | 'none'
  classifierResult: VisualResidualClassifierResult
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORBIDDEN_TAG_NAMES = new Set([
  'img', 'canvas', 'video', 'iframe', 'object', 'embed',
  'svg', 'path',
  'body', 'html',
])

const INTERACTIVE_SHELL_TAGS = new Set([
  'button', 'input', 'textarea', 'select',
])

const LAYOUT_DISPLAY_VALUES = new Set([
  'block', 'flex', 'grid', 'inline-flex', 'table', 'table-row', 'table-cell',
])

const RISKY_CLASS_PATTERNS = [
  'captcha', 'chart', 'qr-code', 'qrcode', 'barcode', 'avatar',
  'badge-count', 'badge-number',
]

const MIN_BOX_DIMENSION = 6
const MAX_ROOT_COVERAGE_RATIO = 0.85
const MAX_TEXT_ICON_ROOT_COVERAGE_RATIO = 0.35
const OVERLAP_IOU_THRESHOLD = 0.75
const MAX_CANDIDATE_COUNT = 200
const MAX_TEXT_ICON_HEIGHT = 64

const TEXT_LIKE_TAGS = new Set([
  'span', 'p', 'a', 'strong', 'label', 'small',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'i',
])

// ---------------------------------------------------------------------------
// deriveSafeMicroSpacingRegions  (pure function)
// ---------------------------------------------------------------------------

export function deriveSafeMicroSpacingRegions(
  rootBox: VisualResidualBox,
  nodeSnapshots: AllowanceNodeSnapshot[],
): AllowedVisualResidualRegion[] {
  const rootArea = rootBox.width * rootBox.height
  if (rootArea <= 0) {
    return []
  }

  const candidates: VisualResidualBox[] = []

  for (const node of nodeSnapshots) {
    if (!isEligibleNode(node)) {
      continue
    }

    const box = node.box
    if (box.width < MIN_BOX_DIMENSION || box.height < MIN_BOX_DIMENSION) {
      continue
    }

    const boxArea = box.width * box.height
    if (boxArea / rootArea > MAX_ROOT_COVERAGE_RATIO) {
      continue
    }

    candidates.push(box)
  }

  const deduplicated = deduplicateBoxes(candidates)
  const capped = deduplicated.slice(0, MAX_CANDIDATE_COUNT)

  if (capped.length === 0) {
    return []
  }

  return capped.map((box, i) => ({
    class: 'micro_spacing' as const,
    selector: `[derived-safe-box-${i}]`,
    boxes: [box],
  }))
}

export function deriveSafeLowSalienceTextIconRegions(
  rootBox: VisualResidualBox,
  nodeSnapshots: AllowanceNodeSnapshot[],
): AllowedVisualResidualRegion[] {
  const rootArea = rootBox.width * rootBox.height
  if (rootArea <= 0) {
    return []
  }

  const candidates: VisualResidualBox[] = []

  for (const node of nodeSnapshots) {
    if (!isEligibleLowSalienceTextIconNode(node)) {
      continue
    }

    const box = node.box
    if (box.width < MIN_BOX_DIMENSION || box.height < MIN_BOX_DIMENSION) {
      continue
    }

    if (box.height > MAX_TEXT_ICON_HEIGHT) {
      continue
    }

    const boxArea = box.width * box.height
    if (boxArea / rootArea > MAX_TEXT_ICON_ROOT_COVERAGE_RATIO) {
      continue
    }

    candidates.push(box)
  }

  const deduplicated = deduplicateBoxes(candidates)
  const capped = deduplicated.slice(0, MAX_CANDIDATE_COUNT)

  return capped.map((box, i) => ({
    class: 'low_salience_text_icon_rasterization' as const,
    selector: `[derived-low-salience-${i}]`,
    boxes: [box],
  }))
}

// ---------------------------------------------------------------------------
// collectAllowanceNodeSnapshots  (runtime — requires Playwright)
// ---------------------------------------------------------------------------

export async function collectAllowanceNodeSnapshots(
  rootLocator: Locator,
): Promise<AllowanceNodeSnapshot[]> {
  return await rootLocator.evaluate((root) => {
    const snapshots: Array<{
      tagName: string
      className: string
      role: string
      box: { x: number; y: number; width: number; height: number }
      display: string
      visibility: string
      opacity: number
      backgroundColor: string
      borderWidth: number
      borderRadius: number
      overflow: string
      childCount: number
    }> = []

    const rootRect = (root as Element).getBoundingClientRect()
    const rootOriginX = rootRect.left + window.scrollX
    const rootOriginY = rootRect.top + window.scrollY

    function walk(el: Element): void {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        return
      }

      const style = getComputedStyle(el)
      snapshots.push({
        tagName: el.tagName.toLowerCase(),
        className: el.className && typeof el.className === 'string' ? el.className : '',
        role: el.getAttribute('role') || '',
        box: {
          x: Math.round(rect.left + window.scrollX - rootOriginX),
          y: Math.round(rect.top + window.scrollY - rootOriginY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        backgroundColor: style.backgroundColor,
        borderWidth: parseFloat(style.borderWidth) || 0,
        borderRadius: parseFloat(style.borderRadius) || 0,
        overflow: style.overflow,
        childCount: el.children.length,
      })

      for (const child of Array.from(el.children)) {
        walk(child)
      }
    }

    for (const child of Array.from((root as Element).children)) {
      walk(child)
    }

    return snapshots
  })
}

// ---------------------------------------------------------------------------
// evaluatePostFailureAllowance  (pure / sync evaluation)
// ---------------------------------------------------------------------------

const EMPTY_CLASSIFIER_RESULT: VisualResidualClassifierResult = {
  applied: true,
  pass: false,
  totalPixels: 0,
  allowedPixels: 0,
  forbiddenPixels: 0,
  unknownPixels: 0,
  forbiddenResidualDetected: false,
  forbiddenClasses: [],
  classBreakdown: {
    micro_spacing: 0,
    low_salience_text_icon_rasterization: 0,
    image_like: 0,
    captcha_like: 0,
    color_state: 0,
    geometry_change: 0,
    structure_change: 0,
    unknown: 0,
  },
}

export function evaluatePostFailureAllowance(
  input: PostFailureAllowanceInput,
): PostFailureAllowanceResult {
  const {
    diffPixels,
    explicitResidualRegions,
    derivedSafeBoxes,
    derivedLowSalienceTextIconBoxes,
    forbiddenRegions,
    microSpacingEdgeBandPx,
  } = input

  if (explicitResidualRegions.length > 0) {
    const allowedRegions: AllowedVisualResidualRegion[] = explicitResidualRegions.map((r) => ({
      class: r.class,
      selector: r.selectors.join(', '),
      boxes: r.boxes,
    }))

    const classifierResult = classifyVisualResiduals({
      diffPixels,
      allowedRegions,
      forbiddenRegions,
      microSpacingEdgeBandPx,
    })

    return {
      applied: true,
      pass: classifierResult.pass,
      source: 'explicit',
      classifierResult,
    }
  }

  if (derivedSafeBoxes.length > 0 || derivedLowSalienceTextIconBoxes.length > 0) {
    const allowedRegions: AllowedVisualResidualRegion[] = [
      ...derivedSafeBoxes.map((box, i) => ({
        class: 'micro_spacing' as const,
        selector: `[derived-safe-box-${i}]`,
        boxes: [box],
      })),
      ...derivedLowSalienceTextIconBoxes.map((box, i) => ({
        class: 'low_salience_text_icon_rasterization' as const,
        selector: `[derived-low-salience-${i}]`,
        boxes: [box],
      })),
    ]

    const classifierResult = classifyVisualResiduals({
      diffPixels,
      allowedRegions,
      forbiddenRegions,
      microSpacingEdgeBandPx,
    })

    return {
      applied: true,
      pass: classifierResult.pass,
      source: 'derived',
      classifierResult,
    }
  }

  return {
    applied: false,
    pass: false,
    source: 'none',
    classifierResult: { ...EMPTY_CLASSIFIER_RESULT, totalPixels: diffPixels.length, unknownPixels: diffPixels.length },
  }
}

// ---------------------------------------------------------------------------
// Node eligibility  (internal)
// ---------------------------------------------------------------------------

function isEligibleNode(node: AllowanceNodeSnapshot): boolean {
  const tag = node.tagName.toLowerCase()

  if (FORBIDDEN_TAG_NAMES.has(tag)) {
    return false
  }

  if (node.visibility === 'hidden' || node.opacity === 0) {
    return false
  }

  if (hasRiskyClassName(node.className)) {
    return false
  }

  if (INTERACTIVE_SHELL_TAGS.has(tag)) {
    return true
  }

  if (node.role === 'button') {
    return true
  }

  if (LAYOUT_DISPLAY_VALUES.has(node.display) && hasShellStyle(node)) {
    return true
  }

  return false
}

function isEligibleLowSalienceTextIconNode(node: AllowanceNodeSnapshot): boolean {
  const tag = node.tagName.toLowerCase()

  if (FORBIDDEN_TAG_NAMES.has(tag)) {
    return false
  }

  if (node.visibility === 'hidden' || node.opacity === 0) {
    return false
  }

  if (hasRiskyClassName(node.className)) {
    return false
  }

  const isMdiIcon = node.className.toLowerCase().includes('mdi')
  const isCompactIconChip =
    node.className.toLowerCase().includes('icon') &&
    node.childCount <= 1 &&
    node.box.width <= MAX_TEXT_ICON_HEIGHT &&
    node.box.height <= MAX_TEXT_ICON_HEIGHT

  if (node.childCount > 0 && !isCompactIconChip) {
    return false
  }

  if (!TEXT_LIKE_TAGS.has(tag) && !isMdiIcon && !isCompactIconChip) {
    return false
  }

  if (INTERACTIVE_SHELL_TAGS.has(tag) || node.role === 'button') {
    return false
  }

  if (hasShellStyle(node) && !isCompactIconChip) {
    return false
  }

  return true
}

function hasRiskyClassName(className: string): boolean {
  if (!className) {
    return false
  }
  const lower = className.toLowerCase()
  return RISKY_CLASS_PATTERNS.some((p) => lower.includes(p))
}

function hasShellStyle(node: AllowanceNodeSnapshot): boolean {
  if (node.backgroundColor !== 'transparent' && node.backgroundColor !== 'rgba(0, 0, 0, 0)' && node.backgroundColor !== '') {
    return true
  }
  if (node.borderWidth > 0) {
    return true
  }
  if (node.borderRadius > 0) {
    return true
  }
  if (node.overflow === 'hidden' || node.overflow === 'auto' || node.overflow === 'scroll') {
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Box deduplication  (internal)
// ---------------------------------------------------------------------------

function boxArea(b: VisualResidualBox): number {
  return b.width * b.height
}

function intersectionArea(a: VisualResidualBox, b: VisualResidualBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) {
    return 0
  }
  return (x2 - x1) * (y2 - y1)
}

function iou(a: VisualResidualBox, b: VisualResidualBox): number {
  const inter = intersectionArea(a, b)
  if (inter === 0) {
    return 0
  }
  const union = boxArea(a) + boxArea(b) - inter
  return union > 0 ? inter / union : 0
}

function deduplicateBoxes(boxes: VisualResidualBox[]): VisualResidualBox[] {
  if (boxes.length <= 1) {
    return boxes
  }

  const sorted = [...boxes].sort((a, b) => boxArea(b) - boxArea(a))
  const kept: VisualResidualBox[] = []

  for (const box of sorted) {
    const isDuplicate = kept.some((existing) => iou(existing, box) > OVERLAP_IOU_THRESHOLD)
    if (!isDuplicate) {
      kept.push(box)
    }
  }

  return kept
}
