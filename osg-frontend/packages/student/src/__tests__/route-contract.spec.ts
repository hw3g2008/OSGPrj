import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)
const contractSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../../osg-spec-docs/docs/01-product/prd/student/UI-VISUAL-CONTRACT.yaml'
  ),
  'utf-8'
)
const readViewSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')

const protectedViewContracts = [
  { pageId: 'home', file: '../views/dashboard/index.vue' },
  { pageId: 'positions', file: '../views/positions/index.vue' },
  { pageId: 'job-tracking', file: '../views/applications/index.vue' },
  { pageId: 'mock-practice', file: '../views/mock-practice/index.vue' },
  { pageId: 'myclass', file: '../views/courses/index.vue' },
  { pageId: 'communication', file: '../views/communication/index.vue' },
  { pageId: 'netlog', file: '../views/netlog/index.vue' },
  { pageId: 'feedback', file: '../views/feedback/index.vue' },
  { pageId: 'report', file: '../views/report/index.vue' },
  { pageId: 'ai-interview', file: '../views/ai-interview/index.vue' },
  { pageId: 'resume', file: '../views/resume/index.vue' },
  { pageId: 'ai-resume', file: '../views/ai-resume/index.vue' },
  { pageId: 'files', file: '../views/files/index.vue' },
  { pageId: 'online-test-bank', file: '../views/online-test-bank/index.vue' },
  { pageId: 'interview-bank', file: '../views/interview-bank/index.vue' },
  { pageId: 'questions', file: '../views/questions/index.vue' },
  { pageId: 'profile', file: '../views/profile/index.vue' },
  { pageId: 'notice', file: '../views/notice/index.vue' },
  { pageId: 'faq', file: '../views/faq/index.vue' },
  { pageId: 'complaint', file: '../views/complaint/index.vue' }
]

describe('student final-gate route contract', () => {
  it('exposes alias routes for prototype-derived pages that were merged into app routes', () => {
    for (const routePath of ['home', 'job-tracking', 'myclass']) {
      expect(routerSource).toContain(`path: '${routePath}'`)
    }
  })

  it('uses app routes in the UI visual contract instead of raw prototype hash paths', () => {
    const forbiddenRoutes = [
      '/login.html',
      '/forgot-password.html',
      '/index.html#page-home',
      '/index.html#page-job-tracking',
      '/index.html#page-request',
      '/index.html#page-myclass'
    ]

    for (const routePath of forbiddenRoutes) {
      expect(contractSource).not.toContain(`route: ${routePath}`)
      expect(contractSource).not.toContain(`route: '${routePath}'`)
      expect(contractSource).not.toContain(`route: \"${routePath}\"`)
    }

    const expectedRoutes = ['/login', '/forgot-password', '/home', '/job-tracking', '/myclass']

    for (const routePath of expectedRoutes) {
      expect(contractSource).toContain(`route: ${routePath}`)
    }
  })

  it('removes prototype-inaccessible visual entries from the student contract', () => {
    const forbiddenPageIds = ['page_id: request']
    const forbiddenSurfaceIds = [
      'surface_id: modal-class-mock',
      'surface_id: modal-request',
      'surface_id: modal-student-mock-detail',
      'surface_id: modal-student-mock-feedback',
      'surface_id: modal-apply-coaching',
      'surface_id: modal-update-result',
      'surface_id: modal-reminder-settings',
      'surface_id: modal-question-pending',
      'surface_id: modal-question-detail',
      'surface_id: modal-question-edit'
    ]

    for (const marker of [...forbiddenPageIds, ...forbiddenSurfaceIds]) {
      expect(contractSource).not.toContain(marker)
    }
  })

  it('does not require stale student fixture files for static student pages', () => {
    expect(contractSource).not.toContain('osg-frontend/tests/e2e/fixtures/student/')
  })

  it('uses stable app-facing anchors for the home visual contract', () => {
    expect(contractSource).toContain("surface_id: home-dashboard")
    expect(contractSource).toContain("selector: '#page-home .student-profile-card'")
    expect(contractSource).not.toContain("selector: '#page-home .card:first-child'")
    expect(contractSource).not.toContain('#page-home .card-header')
    expect(contractSource).not.toContain('#page-home .card-body')
  })

  it('requires prototype-derived protected views to expose stable page ids', () => {
    for (const entry of protectedViewContracts) {
      const source = readViewSource(entry.file)
      expect(source).toContain(`id="page-${entry.pageId}"`)
    }
  })
})
