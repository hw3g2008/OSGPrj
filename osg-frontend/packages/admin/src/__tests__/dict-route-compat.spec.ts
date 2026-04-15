import { describe, expect, it } from 'vitest'
import router from '../router'

describe('dict route compatibility', () => {
  it('keeps /permission/base-data as an alias of the canonical dict route', () => {
    const canonical = router.resolve('/permission/dicts')
    const compat = router.resolve('/permission/base-data')

    expect(canonical.name).toBe('DictManagement')
    expect(compat.name).toBe('DictManagement')
    expect(canonical.matched.at(-1)?.components?.default).toBe(compat.matched.at(-1)?.components?.default)
  })
})
