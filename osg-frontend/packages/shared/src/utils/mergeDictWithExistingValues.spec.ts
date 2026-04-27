import { describe, it, expect } from 'vitest'
import { mergeDictWithExistingValues } from './mergeDictWithExistingValues'

describe('mergeDictWithExistingValues', () => {
  it('returns dict options when no existing values', () => {
    const dict = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    expect(mergeDictWithExistingValues(dict, [])).toEqual(dict)
    expect(mergeDictWithExistingValues(dict, null)).toEqual(dict)
    expect(mergeDictWithExistingValues(dict, undefined)).toEqual(dict)
  })

  it('returns existing values when no dict', () => {
    expect(mergeDictWithExistingValues(null, ['x', 'y'])).toEqual([
      { value: 'x', label: 'x' },
      { value: 'y', label: 'y' },
    ])
    expect(mergeDictWithExistingValues(undefined, [{ value: 'x', label: 'X' }])).toEqual([
      { value: 'x', label: 'X' },
    ])
  })

  it('dedupes by value and prefers dict option', () => {
    const dict = [{ value: 'a', label: 'A-DICT', cssClass: 'gold' }] as const
    const existing: Array<string | { value: string; label?: string }> = [
      'a', // 重复，应被字典覆盖
      'b',
    ]
    const merged = mergeDictWithExistingValues(dict, existing)
    expect(merged).toEqual([
      { value: 'a', label: 'A-DICT', cssClass: 'gold' },
      { value: 'b', label: 'b' },
    ])
  })

  it('appends existing values not in dict', () => {
    const dict = [{ value: 'a', label: 'A' }]
    const existing = ['b', 'c']
    expect(mergeDictWithExistingValues(dict, existing)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'b' },
      { value: 'c', label: 'c' },
    ])
  })

  it('skips empty / null / whitespace values', () => {
    const dict = [
      { value: '', label: 'empty' },
      { value: 'a', label: 'A' },
    ]
    const existing = ['', '  ', null as unknown as string, 'a', 'b']
    expect(mergeDictWithExistingValues(dict, existing)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'b' },
    ])
  })

  it('accepts object existing values with label override', () => {
    const dict = [{ value: 'a', label: 'A' }]
    const existing = [{ value: 'b', label: 'B-pretty' }]
    expect(mergeDictWithExistingValues(dict, existing)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B-pretty' },
    ])
  })

  it('trims whitespace in string existing values', () => {
    expect(mergeDictWithExistingValues([], ['  hello  '])).toEqual([
      { value: 'hello', label: 'hello' },
    ])
  })

  it('dedupes existing values among themselves', () => {
    expect(mergeDictWithExistingValues([], ['a', 'a', 'b'])).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
    ])
  })
})
