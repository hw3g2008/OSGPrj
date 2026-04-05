import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(CURRENT_DIR, '../../../..')
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts/five-end-course-flow')
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'f-five-end-final-closure.json')

const WORKER_SCRIPTS = [
  { key: 'c1', relativePath: 'osg-frontend/packages/student/e2e/c1-applications-summary-headful.mjs' },
  { key: 'c2', relativePath: 'osg-frontend/packages/student/e2e/c2-mock-practice-headful.mjs' },
  { key: 'c3', relativePath: 'osg-frontend/packages/student/e2e/c3-courses-headful.mjs' },
  { key: 'd', relativePath: 'osg-frontend/packages/student/e2e/d-mentor-submit-admin-review-headful.mjs' },
  { key: 'e', relativePath: 'osg-frontend/packages/student/e2e/e-assistant-carrier-headful.mjs' },
]

function extractLastJsonObject(output) {
  for (let start = output.lastIndexOf('{'); start >= 0; start = output.lastIndexOf('{', start - 1)) {
    const candidate = output.slice(start).trim()
    try {
      return JSON.parse(candidate)
    } catch {
      // keep scanning backward until the outer JSON object is found
    }
  }

  throw new Error(`cannot parse final JSON block from output:\n${output}`)
}

function runCommand(label, command, args) {
  console.log(`[f] run ${label}`)
  try {
    return execFileSync(command, args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : ''
    const stderr = error?.stderr ? String(error.stderr) : ''
    throw new Error(
      `${label} failed\nstdout:\n${stdout}\n\nstderr:\n${stderr}`.trim(),
    )
  }
}

function runWorkerScript({ key, relativePath }) {
  let lastError = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const output = runCommand(`${key}#${attempt}`, 'node', [relativePath])
      return extractLastJsonObject(output)
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        console.log(`[f] retry ${key} after transient failure`)
      }
    }
  }

  throw lastError
}

function runAssignmentRoleServiceChecks() {
  const command = [
    '-pl',
    'ruoyi-system',
    '-Dtest=OsgLeadMentorJobOverviewServiceImplTest,OsgMockPracticeServiceImplTest',
    'test',
  ]
  const output = runCommand('assignment-role-service-checks', 'mvn', command)
  const passed =
    output.includes('BUILD SUCCESS') &&
    output.includes('OsgLeadMentorJobOverviewServiceImplTest') &&
    output.includes('OsgMockPracticeServiceImplTest')

  if (!passed) {
    throw new Error(`assignment-role service checks did not reach BUILD SUCCESS:\n${output}`)
  }

  return {
    status: 'pass',
    command: `mvn ${command.join(' ')}`,
    markers: [
      'assignMentorsStoresResolvedUserIdsInsteadOfStaffIds',
      'assignMockPracticeStoresResolvedUserIdsInsteadOfStaffIds',
      'BUILD SUCCESS',
    ],
  }
}

function buildFinalExitCriteria({ serviceChecks, scriptResults }) {
  const c1 = scriptResults.c1
  const c2 = scriptResults.c2
  const c3 = scriptResults.c3
  const d = scriptResults.d
  const e = scriptResults.e

  const definitionsConsistent =
    c1?.status === 'pass' &&
    c2?.status === 'pass' &&
    c3?.status === 'pass'

  const assistantNotFormalAssignmentRole =
    e?.status === 'pass' &&
    e?.unauthorizedConfirm?.code === 500

  const leadMentorAndAdminFormalAssignmentRoles =
    serviceChecks?.status === 'pass'

  const mentorOnlyTeachesAndSubmitsRecords =
    d?.status === 'pass' &&
    d?.checked?.mentorRecordStatusAfterSubmit === 'pending'

  const studentThreePagesClear =
    c1?.status === 'pass' &&
    c2?.status === 'pass' &&
    c3?.status === 'pass'

  const reviewClosureVerified =
    d?.status === 'pass' &&
    d?.checked?.studentVisibleAfterApprove === true &&
    c3?.status === 'pass' &&
    c3?.checked?.ratedRecordActionAfter === 'detail'

  return {
    definitionsConsistent,
    assistantNotFormalAssignmentRole,
    leadMentorAndAdminFormalAssignmentRoles,
    mentorOnlyTeachesAndSubmitsRecords,
    studentThreePagesClear,
    reviewClosureVerified,
  }
}

function allCriteriaTrue(criteria) {
  return Object.values(criteria).every(Boolean)
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

  const serviceChecks = runAssignmentRoleServiceChecks()
  const scriptResults = {}

  for (const worker of WORKER_SCRIPTS) {
    scriptResults[worker.key] = runWorkerScript(worker)
  }

  const finalExitCriteria = buildFinalExitCriteria({ serviceChecks, scriptResults })
  const readyForAcceptance = allCriteriaTrue(finalExitCriteria)

  if (!readyForAcceptance) {
    throw new Error(`final exit criteria incomplete: ${JSON.stringify(finalExitCriteria, null, 2)}`)
  }

  const summary = {
    status: 'pass',
    readyForAcceptance,
    serviceChecks,
    scripts: scriptResults,
    finalExitCriteria,
  }

  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error('[f] five-end final closure failed')
  console.error(error.stack || String(error))
  process.exitCode = 1
})
