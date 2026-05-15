import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const dictsViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/dicts/index.vue'),
  'utf-8',
)

const adminDictApiSource = fs.readFileSync(
  path.resolve(__dirname, '../api/adminDict.ts'),
  'utf-8',
)

describe('admin dict registry i18n wiring', () => {
  it('adminDict.ts contract exposes optional i18n key fields for group and dict_type', () => {
    expect(adminDictApiSource).toMatch(/group_i18n_key\?\s*:\s*string/)
    expect(adminDictApiSource).toMatch(/dict_name_i18n_key\?\s*:\s*string/)
  })

  it('dicts/index.vue resolves group card labels and dict_type tabs through resolveDictDisplayName', () => {
    expect(dictsViewSource).toContain(
      "import { resolveDictDisplayName } from '@osg/shared/utils/dictI18n'",
    )
    // Group card label derives from i18nKey with fallback to raw group_label
    expect(dictsViewSource).toMatch(
      /resolveDictDisplayName\(\s*\{\s*label:\s*group\.group_label,\s*i18nKey:\s*group\.group_i18n_key\s*\}/,
    )
    // Dict type tab label derives from i18nKey with fallback to raw dict_name
    expect(dictsViewSource).toMatch(
      /resolveDictDisplayName\(\s*\{\s*label:\s*item\.dict_name,\s*i18nKey:\s*item\.dict_name_i18n_key\s*\}/,
    )
    // Category description also uses the resolver (no raw dict_name.join left behind).
    expect(dictsViewSource).not.toMatch(
      /group\.dict_types\.map\(item\s*=>\s*item\.dict_name\)\.join/,
    )
  })
})
