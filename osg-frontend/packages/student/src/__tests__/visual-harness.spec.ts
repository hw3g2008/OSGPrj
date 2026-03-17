import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const authHarnessSource = fs.readFileSync(
  path.resolve(__dirname, '../../../../tests/e2e/support/auth.ts'),
  'utf-8'
)

describe('student visual auth harness source contract', () => {
  it('pins the student visual user instead of replaying admin nicknames into the shell', () => {
    expect(authHarnessSource).toContain("visualModule === 'student'")
    expect(authHarnessSource).toContain("nickName: 'Test Student'")
    expect(authHarnessSource).toContain("userName: 'student'")
  })

  it('uses a stable local student visual token instead of the captcha login flow', () => {
    expect(authHarnessSource).toContain("student-visual-token")
  })
})
