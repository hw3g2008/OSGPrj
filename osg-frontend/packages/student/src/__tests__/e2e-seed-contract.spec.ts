import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const createStudentDemoUserSource = fs.readFileSync(
  path.resolve(__dirname, '../../e2e/support/java/CreateStudentDemoUser.java'),
  'utf-8'
)
const createManagedStudentPortalUserSourcePath = path.resolve(
  __dirname,
  '../../e2e/support/java/CreateManagedStudentPortalUser.java'
)
const createMentorChainSeedSourcePath = path.resolve(
  __dirname,
  '../../e2e/support/java/CreateMentorChainSeed.java'
)
const createAssistantCarrierSeedSourcePath = path.resolve(
  __dirname,
  '../../e2e/support/java/CreateAssistantCarrierSeed.java'
)

describe('student e2e seed source contract', () => {
  it('keeps the formal student main-data email aligned with the login account email', () => {
    expect(createStudentDemoUserSource).toContain('private static final String EMAIL = "student_demo@osg.local";')
    expect(createStudentDemoUserSource).toContain('private static final String STUDENT_MAIN_EMAIL = EMAIL;')
  })

  it('migrates legacy username-keyed osg_student rows onto the email-based identity resolver path', () => {
    expect(createStudentDemoUserSource).toContain(
      'Long legacyStudentId = findStudentIdByEmail(connection, USERNAME);'
    )
  })

  it('keeps the managed portal student seed bound to the existing lead-mentor-owned student main data', () => {
    expect(fs.existsSync(createManagedStudentPortalUserSourcePath)).toBe(true)

    const createManagedStudentPortalUserSource = fs.readFileSync(
      createManagedStudentPortalUserSourcePath,
      'utf-8'
    )

    expect(createManagedStudentPortalUserSource).toContain(
      'private static final String EMAIL = "leadmentor-zhangsan-12766@osg.local";'
    )
    expect(createManagedStudentPortalUserSource).toContain(
      'private static final long EXPECTED_STUDENT_ID = 12766L;'
    )
  })

  it('keeps the mentor submit chain seed bound to fixed mentor and student portal identities', () => {
    expect(fs.existsSync(createMentorChainSeedSourcePath)).toBe(true)

    const createMentorChainSeedSource = fs.readFileSync(createMentorChainSeedSourcePath, 'utf-8')

    expect(createMentorChainSeedSource).toContain(
      'private static final long STUDENT_PORTAL_USER_ID = 12766L;'
    )
    expect(createMentorChainSeedSource).toContain(
      'private static final String STUDENT_PORTAL_USERNAME = "student_d_chain";'
    )
    expect(createMentorChainSeedSource).toContain(
      'private static final long MENTOR_USER_ID = 12767L;'
    )
    expect(createMentorChainSeedSource).toContain(
      'private static final String MENTOR_USERNAME = "mentor_d_chain";'
    )
  })

  it('keeps the assistant carrier seed bound to fixed assistant portal and owned-student identities', () => {
    expect(fs.existsSync(createAssistantCarrierSeedSourcePath)).toBe(true)

    const createAssistantCarrierSeedSource = fs.readFileSync(
      createAssistantCarrierSeedSourcePath,
      'utf-8'
    )

    expect(createAssistantCarrierSeedSource).toContain(
      'private static final String ASSISTANT_USERNAME = "assistant_e_chain";'
    )
    expect(createAssistantCarrierSeedSource).toContain(
      'private static final String ASSISTANT_EMAIL = "assistant-e-chain@osg.local";'
    )
    expect(createAssistantCarrierSeedSource).toContain(
      'private static final long OWNED_STUDENT_ID = 12766L;'
    )
    expect(createAssistantCarrierSeedSource).toContain(
      'private static final String OWNED_STUDENT_EMAIL = "leadmentor-zhangsan-12766@osg.local";'
    )
  })
})
