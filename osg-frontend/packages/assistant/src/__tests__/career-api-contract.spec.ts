import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('assistant career api contract', () => {
  it('uses assistant job overview endpoints', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../shared/src/api/assistantCareer.ts'),
      'utf-8',
    )

    expect(source).toContain('/assistant/job-overview/list')
    expect(source).toContain('/assistant/job-overview/calendar')
  })
})
