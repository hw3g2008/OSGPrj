import fs from 'node:fs'
import path from 'node:path'

export type VisualAuthMode = 'public' | 'protected'
export type CaptureMode = 'clip' | 'fullpage'
export type StateCaseKind = 'focus' | 'hover' | 'loading' | 'empty' | 'error'
export type StateAssertionType = 'visible' | 'text' | 'css'
export type VisualDataMode = 'live' | 'mock' | 'mask'
export type VisualResidualClass = 'micro_spacing' | 'low_salience_text_icon_rasterization'
export type CriticalStateContractKind = 'focus' | 'hover' | 'loading' | 'empty' | 'error' | 'loaded'
export type VisualSurfaceType = 'modal' | 'drawer' | 'popover' | 'panel' | 'wizard-step'
export type VisualSurfaceTriggerType = 'click' | 'keyboard' | 'route-param' | 'auto-open'

export interface VisualStyleContractRule {
  selector: string
  property: string
  expected: string
  tolerance?: number
}

export interface VisualStateAssertion {
  type: StateAssertionType
  value?: string
  property?: string
}

export interface VisualStateCase {
  state: StateCaseKind
  target: string
  assertion: VisualStateAssertion
}

export interface VisualFixtureRoute {
  url: string
  method?: string
  response_ref: string
  status?: number
  headers?: Record<string, string>
}

export interface VisualCriticalSurfaceStyleContract {
  target?: string
  property: string
  expected: string
  tolerance?: number
}

export interface VisualCriticalSurfaceStateAssertion {
  target?: string
  property: string
  expected: string
}

export interface VisualCriticalSurfaceStateContract {
  state: CriticalStateContractKind
  target?: string
  assertions: VisualCriticalSurfaceStateAssertion[]
}

export interface VisualCriticalSurfaceRelationContract {
  type: string
  target: string
  expected?: string
}

export interface VisualCriticalSurfaceContract {
  surface_id: string
  selector: string
  mask_allowed: boolean
  required_anchors: string[]
  style_contracts: VisualCriticalSurfaceStyleContract[]
  state_contracts: VisualCriticalSurfaceStateContract[]
  relation_contracts?: VisualCriticalSurfaceRelationContract[]
}

export interface VisualResidualRegion {
  class: VisualResidualClass
  selectors: string[]
}

export interface VisualPageContract {
  page_id: string
  route: string
  prototype_file: string
  prototype_selector: string
  prototype_page_key?: string
  prototype_role?: string
  viewport: { width: number; height: number }
  auth_mode: VisualAuthMode
  snapshot_name: string
  baseline_ref: string
  diff_threshold: number
  stable_wait_ms: number
  required_anchors: string[]
  required_anchors_any_of?: string[][]
  mask_selectors?: string[]
  scroll_to?: 'top' | 'center' | 'bottom'
  capture_mode?: CaptureMode
  clip_selector?: string
  device_scale_factor?: number
  style_contracts?: VisualStyleContractRule[]
  state_cases?: VisualStateCase[]
  data_mode?: VisualDataMode
  fixture_routes?: VisualFixtureRoute[]
  dynamic_regions?: string[]
  clear_input_values?: string[]
  critical_surfaces?: VisualCriticalSurfaceContract[]
  residual_regions?: VisualResidualRegion[]
}

export interface VisualSurfaceCssContract {
  selector: string
  prototype_selector?: string
  css: Record<string, string>
}

export interface VisualSurfaceTriggerAction {
  type: VisualSurfaceTriggerType
  selector?: string
  prototype_selector?: string
  script?: string
  prototype_script?: string
  key?: string
  param?: string
  value?: string
  route?: string
}

export interface VisualSurfaceViewportVariant {
  viewport_id: string
  width: number
  height: number
}

export interface VisualSurfaceStateVariant {
  state_id: string
}

export interface VisualSurfacePartContract {
  part_id: string
  selector: string
  prototype_selector?: string
  mask_allowed: boolean
}

export interface VisualSurfaceContentPartContract {
  part_id: string
  selector: string
  prototype_selector?: string
  required?: boolean
}

export interface VisualSurfaceStateContract {
  state_id: string
  required_anchors?: string[]
  prototype_required_anchors?: string[]
  style_contracts?: VisualSurfaceCssContract[]
}

export interface VisualSurfaceContract {
  surface_id: string
  surface_type: VisualSurfaceType
  host_page_id: string
  prototype_selector: string
  app_selector: string
  surface_root_selector: string
  backdrop_selector?: string
  portal_host?: string
  source_ref?: string
  trigger_action: VisualSurfaceTriggerAction
  fixture_routes?: VisualFixtureRoute[]
  required_anchors: string[]
  prototype_required_anchors?: string[]
  viewport_variants: VisualSurfaceViewportVariant[]
  state_variants?: VisualSurfaceStateVariant[]
  surface_parts: VisualSurfacePartContract[]
  content_parts?: VisualSurfaceContentPartContract[]
  style_contracts?: VisualSurfaceCssContract[]
  state_contracts?: VisualSurfaceStateContract[]
  residual_regions?: VisualResidualRegion[]
  _generated_note?: string
}

export interface VisualContract {
  schema_version: number
  module: string
  pages: VisualPageContract[]
  surfaces?: VisualSurfaceContract[]
}

const BASELINE_PREFIX = 'osg-frontend/tests/e2e/visual-baseline/'

export function loadVisualContract(): VisualContract {
  const jsonPath = process.env.UI_VISUAL_CONTRACT_JSON
  if (!jsonPath) {
    throw new Error('UI_VISUAL_CONTRACT_JSON is required')
  }
  const resolved = path.resolve(process.cwd(), jsonPath)
  if (!fs.existsSync(resolved)) {
    throw new Error(`visual contract json not found: ${resolved}`)
  }
  const raw = fs.readFileSync(resolved, 'utf-8')
  const parsed = JSON.parse(raw) as VisualContract
  if (!parsed || !Array.isArray(parsed.pages)) {
    throw new Error('invalid visual contract: pages missing')
  }
  if (parsed.surfaces !== undefined && !Array.isArray(parsed.surfaces)) {
    throw new Error('invalid visual contract: surfaces must be an array when present')
  }
  return parsed
}

export function baselineRefToSnapshotArg(baselineRef: string): string {
  const normalized = baselineRef.replace(/\\/g, '/')
  if (!normalized.startsWith(BASELINE_PREFIX)) {
    throw new Error(`baseline_ref must start with '${BASELINE_PREFIX}', got '${baselineRef}'`)
  }
  const relative = normalized.slice(BASELINE_PREFIX.length)
  return relative
}

export function buildSurfaceBaselineRef(
  moduleName: string,
  surfaceId: string,
  viewport: VisualSurfaceViewportVariant,
): string {
  const safeSurfaceId = surfaceId.replace(/[^a-zA-Z0-9_-]+/g, '-')
  return `${BASELINE_PREFIX}${moduleName}-surface-${safeSurfaceId}-${viewport.width}x${viewport.height}.png`
}
