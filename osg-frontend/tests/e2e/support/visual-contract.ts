import fs from 'node:fs'
import path from 'node:path'

export type VisualAuthMode = 'public' | 'protected'
export type CaptureMode = 'clip' | 'fullpage'
export type StateCaseKind = 'focus' | 'hover' | 'loading' | 'empty' | 'error'
export type StateAssertionType = 'visible' | 'text' | 'css'
export type VisualDataMode = 'live' | 'mock' | 'mask'
export type CriticalStateContractKind = 'focus' | 'hover' | 'loading' | 'empty' | 'error' | 'loaded'

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

export interface VisualPageContract {
  page_id: string
  route: string
  prototype_file: string
  prototype_selector: string
  prototype_page_key?: string
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
  critical_surfaces?: VisualCriticalSurfaceContract[]
}

export interface VisualContract {
  schema_version: number
  module: string
  pages: VisualPageContract[]
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
