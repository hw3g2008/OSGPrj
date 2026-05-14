import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminDictApiSource = fs.readFileSync(
  path.resolve(__dirname, '../api/adminDict.ts'),
  'utf-8',
)
const dictsViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/dicts/index.vue'),
  'utf-8',
)

describe('admin dict data i18n wiring (Commit D)', () => {
  it('AdminDictListRow declares optional i18nKey carrying through the API', () => {
    expect(adminDictApiSource).toMatch(/i18nKey\?\s*:\s*string\s*\|\s*null/)
  })

  it('mapRow propagates i18nKey from the backend payload', () => {
    expect(adminDictApiSource).toMatch(/i18nKey:\s*row\?\.i18nKey\s*\?\?\s*null/)
  })

  it('dicts table renders dictLabel via resolveDictDisplayName with i18nKey', () => {
    // The bodyCell template for dictLabel must use the resolver, not raw record.dictLabel.
    expect(dictsViewSource).toMatch(
      /resolveDictDisplayName\(\s*\{\s*label:\s*record\.dictLabel,\s*i18nKey:\s*record\.i18nKey\s*\}/,
    )
    // Raw `<strong>{{ record.dictLabel }}</strong>` must be gone from the dictLabel template.
    expect(dictsViewSource).not.toMatch(
      /column\.dataIndex === 'dictLabel'\s*">[\s\S]{0,80}<strong>\s*\{\{\s*record\.dictLabel\s*\}\}\s*<\/strong>/,
    )
  })

  it('parent-options dropdown labels also go through the resolver', () => {
    // For osg_region (ENUM) parent, the dropdown must show translated labels.
    expect(dictsViewSource).toMatch(
      /map\[opt\.dictValue\]\s*=\s*resolveDictDisplayName\(\s*\{\s*label:\s*opt\.dictLabel,\s*i18nKey:\s*opt\.i18nKey\s*\}/,
    )
  })

  it('disable-confirm modal name uses translated label', () => {
    expect(dictsViewSource).toMatch(
      /confirm_disable_dict_item[\s\S]{0,120}resolveDictDisplayName\(\s*\{\s*label:\s*record\.dictLabel,\s*i18nKey:\s*record\.i18nKey\s*\}/,
    )
  })
})
