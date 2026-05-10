import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const applicationsApiSource = fs.readFileSync(
  path.resolve(__dirname, '../api/applications.ts'),
  'utf-8'
)

describe('student applications API contract', () => {
  it('models nested application coachings and exposes application-scoped coaching endpoints', () => {
    const requiredTokens = [
      'export interface StudentApplicationCoachingRecord',
      'coachings: StudentApplicationCoachingRecord[]',
      'requestStudentApplicationCoaching',
      'updateStudentApplicationCoaching',
      'getStudentApplicationCoachingClassRecords',
      "`/student/applications/${applicationId}/coachings`",
      "`/student/applications/${applicationId}/coachings/${coachingId}`",
      "`/student/applications/${applicationId}/coachings/${coachingId}/class-records`",
    ]

    for (const token of requiredTokens) {
      expect(applicationsApiSource).toContain(token)
    }
  })
})
