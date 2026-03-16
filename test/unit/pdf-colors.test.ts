import { describe, expect, it } from 'vitest'
import { getPdfPalette } from '~~/shared/pdf/colors'

describe('getPdfPalette', () => {
  it('有効なテンプレートIDでパレットを返す', () => {
    const palette = getPdfPalette('nature')
    expect(palette.accent).toBe('#16a34a')
  })

  it('無効/null/undefinedはsimpleにフォールバック', () => {
    const simple = getPdfPalette('simple')
    expect(getPdfPalette('nonexistent')).toEqual(simple)
    expect(getPdfPalette(null)).toEqual(simple)
    expect(getPdfPalette(undefined)).toEqual(simple)
  })
})
