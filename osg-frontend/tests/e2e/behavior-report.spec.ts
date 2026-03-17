import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { recordBehaviorScenario } from './support/behavior-report'

test('recordBehaviorScenario seeds current report from latest historical module report', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'behavior-report-spec-'))
  const previousReportPath = path.join(tmpDir, 'behavior-contract-admin-2026-03-15.json')
  const currentReportPath = path.join(tmpDir, 'behavior-contract-admin-2026-03-16.json')

  fs.writeFileSync(
    previousReportPath,
    JSON.stringify(
      {
        module: 'admin',
        capabilities: [
          {
            capability_id: 'students-list',
            scenario_results: [
              {
                scenario_id: 'default-list',
                input_class: 'default_query',
                expected_result: 'accepted',
                observed_result: 'accepted',
                observable_response: { http_status: 200, business_code: 200 },
                evidence_ref: 'seed/students-list',
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    'utf-8',
  )

  const originalReportEnv = process.env.BEHAVIOR_CONTRACT_REPORT
  const originalModuleEnv = process.env.E2E_MODULE

  process.env.BEHAVIOR_CONTRACT_REPORT = currentReportPath
  process.env.E2E_MODULE = 'admin'

  try {
    await recordBehaviorScenario({
      module: 'admin',
      capabilityId: 'login-success',
      scenarioId: 'valid-credentials',
      inputClass: 'valid_credentials',
      expectedResult: 'accepted',
      observedResult: 'accepted',
      observableResponse: { route: '/dashboard', token_present: true },
      evidenceRef: 'tests/e2e/auth-login.e2e.spec.ts#perm-s001-login-success',
    })
  } finally {
    if (originalReportEnv === undefined) {
      delete process.env.BEHAVIOR_CONTRACT_REPORT
    } else {
      process.env.BEHAVIOR_CONTRACT_REPORT = originalReportEnv
    }
    if (originalModuleEnv === undefined) {
      delete process.env.E2E_MODULE
    } else {
      process.env.E2E_MODULE = originalModuleEnv
    }
  }

  const currentReport = JSON.parse(fs.readFileSync(currentReportPath, 'utf-8')) as {
    capabilities: Array<{ capability_id: string; scenario_results: Array<{ scenario_id: string }> }>
  }
  const capabilityIds = currentReport.capabilities.map((capability) => capability.capability_id)

  expect(capabilityIds).toContain('students-list')
  expect(capabilityIds).toContain('login-success')

  const seededCapability = currentReport.capabilities.find((capability) => capability.capability_id === 'students-list')
  expect(seededCapability?.scenario_results.map((scenario) => scenario.scenario_id)).toContain('default-list')
})
