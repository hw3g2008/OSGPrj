import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const downloadUtilPath = path.resolve(__dirname, '../utils/download.ts')

describe('shared admin download helper', () => {
  it('uses fetch with bearer token and content-disposition based file naming', () => {
    const source = fs.readFileSync(downloadUtilPath, 'utf-8')

    expect(source).toContain('fetch(')
    expect(source).toContain('Authorization')
    expect(source).toContain('response.blob()')
    expect(source).toContain("response.headers.get('content-disposition')")
    expect(source).toContain('window.URL.createObjectURL')
    expect(source).toContain('decodeURIComponent')
  })
})
