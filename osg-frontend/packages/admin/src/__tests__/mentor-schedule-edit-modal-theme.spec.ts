import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const editScheduleModalPath = path.resolve(
  __dirname,
  '../views/users/mentor-schedule/components/EditScheduleModal.vue',
)

function readSource() {
  return fs.readFileSync(editScheduleModalPath, 'utf-8')
}

function readBlock(source: string, anchor: string, nextAnchor: string) {
  const start = source.indexOf(anchor)
  if (start === -1) {
    throw new Error(`anchor not found: ${anchor}`)
  }
  const end = source.indexOf(nextAnchor, start + anchor.length)
  return end === -1 ? source.slice(start) : source.slice(start, end)
}

describe('mentor schedule edit modal theme', () => {
  it('keeps active controls and avatar on the indigo theme instead of black ink surfaces', () => {
    const source = readSource()
    const weekIndicatorBlock = readBlock(source, '&__indicator {', '\n  }\n\n  &[data-active="next"]')
    const quickHourActiveBlock = readBlock(source, '.esm-chip {', '\n}\n\n// ── Day list')
    const avatarRingBlock = readBlock(source, '&__avatar-ring {', '\n  }\n\n  &__avatar-text')
    const avatarTextBlock = readBlock(source, '&__avatar-text {', '\n  }\n\n  &__name')

    expect(weekIndicatorBlock).toContain('$indigo')
    expect(weekIndicatorBlock).not.toContain('$ink')
    expect(quickHourActiveBlock).toContain('$indigo')
    expect(quickHourActiveBlock).not.toContain('$ink')
    expect(avatarRingBlock).toContain('$indigo')
    expect(avatarRingBlock).not.toContain('$ink')
    expect(avatarTextBlock).toContain('$indigo')
    expect(avatarTextBlock).not.toContain('$ink')
  })
})
