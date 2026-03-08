import fs from 'node:fs'
import path from 'node:path'
import { normalizeRuntimeEnvValue } from './runtime-env'

export interface BehaviorScenarioRecord {
  module?: string
  capabilityId: string
  scenarioId: string
  inputClass: string
  expectedResult: string
  observedResult: string
  observableResponse: unknown
  evidenceRef: string
}

interface BehaviorReport {
  module: string
  capabilities: Array<{
    capability_id: string
    scenario_results: Array<{
      scenario_id: string
      input_class: string
      expected_result: string
      observed_result: string
      observable_response: unknown
      evidence_ref: string
    }>
  }>
}

function resolveRepoRoot(): string {
  return path.resolve(__dirname, '../../../..')
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveBehaviorReportPath(moduleName: string): string {
  const explicit = normalizeRuntimeEnvValue(process.env.BEHAVIOR_CONTRACT_REPORT)
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(resolveRepoRoot(), explicit)
  }
  return path.resolve(
    resolveRepoRoot(),
    'osg-spec-docs/tasks/audit',
    `behavior-contract-${moduleName}-${todayString()}.json`,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withLock<T>(targetPath: string, fn: () => T | Promise<T>): Promise<T> {
  const lockDir = `${targetPath}.lock`
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(lockDir)
      try {
        return await fn()
      } finally {
        fs.rmSync(lockDir, { recursive: true, force: true })
      }
    } catch (error: any) {
      if (error?.code !== 'EEXIST') {
        throw error
      }
      await sleep(50)
    }
  }
  throw new Error(`Failed to acquire behavior report lock: ${lockDir}`)
}

function loadReport(reportPath: string, moduleName: string): BehaviorReport {
  if (!fs.existsSync(reportPath)) {
    return { module: moduleName, capabilities: [] }
  }
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  return {
    module: typeof raw?.module === 'string' ? raw.module : moduleName,
    capabilities: Array.isArray(raw?.capabilities) ? raw.capabilities : [],
  }
}

function upsertScenario(report: BehaviorReport, record: Required<BehaviorScenarioRecord>): BehaviorReport {
  let capability = report.capabilities.find((item) => item.capability_id === record.capabilityId)
  if (!capability) {
    capability = {
      capability_id: record.capabilityId,
      scenario_results: [],
    }
    report.capabilities.push(capability)
  }

  const scenarioResult = {
    scenario_id: record.scenarioId,
    input_class: record.inputClass,
    expected_result: record.expectedResult,
    observed_result: record.observedResult,
    observable_response: record.observableResponse,
    evidence_ref: record.evidenceRef,
  }
  const existingIndex = capability.scenario_results.findIndex((item) => item.scenario_id === record.scenarioId)
  if (existingIndex >= 0) {
    capability.scenario_results[existingIndex] = scenarioResult
  } else {
    capability.scenario_results.push(scenarioResult)
  }

  return report
}

export async function recordBehaviorScenario(record: BehaviorScenarioRecord): Promise<void> {
  const moduleName = record.module || normalizeRuntimeEnvValue(process.env.E2E_MODULE) || 'permission'
  const reportPath = resolveBehaviorReportPath(moduleName)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })

  const normalized: Required<BehaviorScenarioRecord> = {
    module: moduleName,
    capabilityId: record.capabilityId,
    scenarioId: record.scenarioId,
    inputClass: record.inputClass,
    expectedResult: record.expectedResult,
    observedResult: record.observedResult,
    observableResponse: record.observableResponse,
    evidenceRef: record.evidenceRef,
  }

  await withLock(reportPath, async () => {
    const report = loadReport(reportPath, moduleName)
    if (report.module !== moduleName) {
      throw new Error(`Behavior report module mismatch: expected ${moduleName}, got ${report.module}`)
    }
    const next = upsertScenario(report, normalized)
    fs.writeFileSync(reportPath, JSON.stringify(next, null, 2), 'utf-8')
  })
}
