import { describe, expect, it } from 'vitest'
import { DAY_COLORS, getDayColor } from '~~/shared/day-colors'

describe('getDayColor', () => {
  it('Day 1にorange-600を返す', () => {
    expect(getDayColor(1)).toBe('#ea580c')
  })

  it('Day 7まで各色が異なる', () => {
    const colors = Array.from({ length: 7 }, (_, i) => getDayColor(i + 1))
    expect(new Set(colors).size).toBe(7)
  })

  it('Day 8以降はラップする', () => {
    expect(getDayColor(8)).toBe(getDayColor(1))
    expect(getDayColor(14)).toBe(getDayColor(7))
  })

  it('Day 0は最後の色にフォールバックする', () => {
    // (0 - 1) % 7 = -1 → undefinedになり ?? でDAY_COLORS[0]
    expect(getDayColor(0)).toBe(DAY_COLORS[0])
  })

  it('全色がHEXカラーコード形式', () => {
    for (const color of DAY_COLORS) {
      expect(color).toMatch(/^#[\da-f]{6}$/)
    }
  })
})
