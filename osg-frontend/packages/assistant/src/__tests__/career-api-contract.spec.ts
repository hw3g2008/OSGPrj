import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assistant career api contract', () => {
  it('uses assistant job overview endpoints', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/src/api/assistantCareer.ts'),
      'utf-8',
    )

    expect(source).toContain('/assistant/job-overview/list')
    expect(source).toContain('/assistant/job-overview/calendar')
    expect(source).not.toContain('/api/mentor/job-overview/list')
  })
})
