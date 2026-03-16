import { describe, expect, it } from 'vitest'
import { getCategoryEmoji } from '~~/shared/pdf/icons'

describe('getCategoryEmoji', () => {
  it('既知のカテゴリに絵文字を返す', () => {
    expect(getCategoryEmoji('onsen')).toBe('♨')
    expect(getCategoryEmoji('transport_train')).toBe('🚃')
  })

  it('未知/null/undefinedはデフォルト絵文字を返す', () => {
    expect(getCategoryEmoji('unknown')).toBe('📍')
    expect(getCategoryEmoji(null)).toBe('📍')
    expect(getCategoryEmoji(undefined)).toBe('📍')
  })
})
