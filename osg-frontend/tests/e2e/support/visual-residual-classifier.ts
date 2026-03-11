import type { VisualResidualClass } from './visual-contract'

export type ForbiddenVisualResidualClass =
  | 'image_like'
  | 'captcha_like'
  | 'color_state'
  | 'geometry_change'
  | 'structure_change'
  | 'unknown'

export interface VisualResidualPixel {
  x: number
  y: number
}

export interface VisualResidualBox {
  x: number
  y: number
  width: number
  height: number
}

export interface AllowedVisualResidualRegion {
  class: VisualResidualClass
  selector: string
  boxes: VisualResidualBox[]
}

export interface ForbiddenVisualResidualRegion {
  class: Exclude<ForbiddenVisualResidualClass, 'unknown'>
  selector: string
  boxes: VisualResidualBox[]
}

export interface VisualResidualClassifierInput {
  diffPixels: VisualResidualPixel[]
  allowedRegions: AllowedVisualResidualRegion[]
  forbiddenRegions?: ForbiddenVisualResidualRegion[]
  microSpacingEdgeBandPx: number
}

export interface VisualResidualClassifierResult {
  applied: true
  pass: boolean
  totalPixels: number
  allowedPixels: number
  forbiddenPixels: number
  unknownPixels: number
  forbiddenResidualDetected: boolean
  forbiddenClasses: ForbiddenVisualResidualClass[]
  classBreakdown: Record<VisualResidualClass | ForbiddenVisualResidualClass, number>
}

function createClassBreakdown(): Record<VisualResidualClass | ForbiddenVisualResidualClass, number> {
  return {
    micro_spacing: 0,
    low_salience_text_icon_rasterization: 0,
    image_like: 0,
    captcha_like: 0,
    color_state: 0,
    geometry_change: 0,
    structure_change: 0,
    unknown: 0,
  }
}

function pointInBox(pixel: VisualResidualPixel, box: VisualResidualBox): boolean {
  return (
    pixel.x >= box.x &&
    pixel.x < box.x + box.width &&
    pixel.y >= box.y &&
    pixel.y < box.y + box.height
  )
}

function pointInEdgeBand(pixel: VisualResidualPixel, box: VisualResidualBox, edgeBandPx: number): boolean {
  if (!pointInBox(pixel, box)) {
    return false
  }
  const left = pixel.x - box.x
  const right = box.x + box.width - 1 - pixel.x
  const top = pixel.y - box.y
  const bottom = box.y + box.height - 1 - pixel.y
  return Math.min(left, right, top, bottom) < edgeBandPx
}

function classifyPixel(
  pixel: VisualResidualPixel,
  allowedRegions: AllowedVisualResidualRegion[],
  forbiddenRegions: ForbiddenVisualResidualRegion[],
  edgeBandPx: number,
): VisualResidualClass | ForbiddenVisualResidualClass {
  for (const region of forbiddenRegions) {
    if (region.boxes.some((box) => pointInBox(pixel, box))) {
      return region.class
    }
  }

  for (const region of allowedRegions) {
    if (region.class === 'low_salience_text_icon_rasterization' && region.boxes.some((box) => pointInBox(pixel, box))) {
      return 'low_salience_text_icon_rasterization'
    }
  }

  let matchedMicroSpacing = false
  for (const region of allowedRegions) {
    if (region.class !== 'micro_spacing') {
      continue
    }
    for (const box of region.boxes) {
      if (!pointInBox(pixel, box)) {
        continue
      }
      matchedMicroSpacing = true
      if (pointInEdgeBand(pixel, box, edgeBandPx)) {
        return 'micro_spacing'
      }
    }
  }

  if (matchedMicroSpacing) {
    return 'geometry_change'
  }

  return 'unknown'
}

export function classifyVisualResiduals(input: VisualResidualClassifierInput): VisualResidualClassifierResult {
  const breakdown = createClassBreakdown()
  const forbiddenRegions = input.forbiddenRegions || []

  for (const pixel of input.diffPixels) {
    const classification = classifyPixel(
      pixel,
      input.allowedRegions,
      forbiddenRegions,
      input.microSpacingEdgeBandPx,
    )
    breakdown[classification] += 1
  }

  const forbiddenClasses = (Object.keys(breakdown) as Array<VisualResidualClass | ForbiddenVisualResidualClass>)
    .filter((key) => !['micro_spacing', 'low_salience_text_icon_rasterization'].includes(key) && breakdown[key] > 0) as ForbiddenVisualResidualClass[]

  const allowedPixels = breakdown.micro_spacing + breakdown.low_salience_text_icon_rasterization
  const forbiddenPixels =
    breakdown.image_like +
    breakdown.captcha_like +
    breakdown.color_state +
    breakdown.geometry_change +
    breakdown.structure_change
  const unknownPixels = breakdown.unknown

  return {
    applied: true,
    pass: forbiddenClasses.length === 0,
    totalPixels: input.diffPixels.length,
    allowedPixels,
    forbiddenPixels,
    unknownPixels,
    forbiddenResidualDetected: forbiddenClasses.length > 0,
    forbiddenClasses,
    classBreakdown: breakdown,
  }
}
