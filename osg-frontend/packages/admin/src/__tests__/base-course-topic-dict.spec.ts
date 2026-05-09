import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const dictsViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/dicts/index.vue'),
  'utf-8'
)
const typeSql = fs.readFileSync(
  path.resolve(__dirname, '../../../../../deploy/mysql-init/28_osg_base_course_topic_dict_type.sql'),
  'utf-8'
)
const dataSql = fs.readFileSync(
  path.resolve(__dirname, '../../../../../deploy/mysql-init/29_osg_base_course_topic_dict_data.sql'),
  'utf-8'
)

const dictRows = Array.from(
  dataSql.matchAll(/SELECT (\d+), '([^']+)', '([^']+)', 'osg_base_course_topic'/g)
).map((match) => ({
  dictSort: Number(match[1]),
  dictLabel: match[2],
  dictValue: match[3],
}))

describe('base course topic dictionary integration', () => {
  it('registers osg_base_course_topic under the course registry group used by admin dict page', () => {
    expect(typeSql).toContain("'course', '课程相关', 'osg_base_course_topic', '基础课题目'")
    expect(typeSql).toContain('groupKey')
    expect(typeSql).toContain('groupLabel')
    expect(dictsViewSource).toContain('getAdminDictRegistry')
    expect(dictsViewSource).toContain('group.dict_types.map(item')
    expect(dictsViewSource).toContain(':data-surface-trigger="tab.key"')
  })

  it('seeds 32 dict rows in display order with Chinese labels instead of naked dict values', () => {
    expect(dictRows).toHaveLength(32)
    expect(dictRows.map((row) => row.dictValue)).toEqual([
      'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08',
      'T09', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16',
      'T17', 'T18', 'T19', 'T20', 'T21', 'T22', 'T23', 'T24',
      'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
    ])
    expect(dictRows.map((row) => row.dictSort)).toEqual(Array.from({ length: 32 }, (_, index) => (index + 1) * 10))
    expect(dictRows.find((row) => row.dictValue === 'T01')?.dictLabel).toBe('损益表')
    expect(dictRows.find((row) => row.dictValue === 'T08')?.dictLabel).toBe('WACC')
    expect(dictRows.find((row) => row.dictValue === 'B7')?.dictLabel).toBe('动机')
    expect(dictRows.some((row) => row.dictLabel === row.dictValue)).toBe(false)
  })

  it('keeps specific dict value to label mappings for final acceptance examples', () => {
    expect(dictRows.find((row) => row.dictValue === 'T20')?.dictLabel).toBe('高级并购')
    expect(dictRows.find((row) => row.dictValue === 'B0')?.dictLabel).toBe('OSG 简历指南（不含 WM 功能）')
    expect(dictsViewSource).toContain('getAdminDictList')
    expect(dictsViewSource).toContain('dictType: selectedTab.value')
  })
})
