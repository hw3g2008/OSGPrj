import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../../..')
const prototypeAdminPath = path.join(repoRoot, 'osg-spec-docs/source/prototype/admin.html')

describe('permission prototype stability', () => {
  it('does not depend on external CDN assets for admin visual truth source', () => {
    const source = fs.readFileSync(prototypeAdminPath, 'utf-8')

    expect(source).not.toContain('https://cdn.jsdelivr.net')
    expect(source).not.toContain('https://fonts.googleapis.com')
  })
})
