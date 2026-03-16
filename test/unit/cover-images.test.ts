import { describe, expect, it } from 'vitest'
import {
  coverImagePresets,
  getCoverImageById,
  getCoverImageByPath,
  getCoverImagesByCategory,
  getDefaultCoverImage,
} from '~~/shared/cover-images'

describe('getCoverImageById', () => {
  it('有効なIDでプリセットを返す', () => {
    const result = getCoverImageById('city-tokyo')
    expect(result?.label).toBe('東京')
  })

  it('無効なIDでundefinedを返す', () => {
    expect(getCoverImageById('nonexistent')).toBeUndefined()
  })
})

describe('getCoverImageByPath', () => {
  it('有効なパスでプリセットを返す', () => {
    const result = getCoverImageByPath('/covers/sakura.webp')
    expect(result?.id).toBe('sakura')
  })

  it('無効なパスでundefinedを返す', () => {
    expect(getCoverImageByPath('/covers/xxx.webp')).toBeUndefined()
  })
})

describe('getCoverImagesByCategory', () => {
  it('カテゴリに属するプリセットのみ返す', () => {
    const results = getCoverImagesByCategory('beach')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(p => p.category === 'beach')).toBe(true)
  })
})

describe('getDefaultCoverImage', () => {
  it('defaultプリセットを返す', () => {
    expect(getDefaultCoverImage().id).toBe('default')
  })
})

describe('coverImagePresets', () => {
  it('全プリセットにIDとパスが設定されている', () => {
    for (const preset of coverImagePresets) {
      expect(preset.id).toBeTruthy()
      expect(preset.path).toMatch(/^\/covers\/.+\.webp$/)
    }
  })

  it('IDがユニーク', () => {
    const ids = coverImagePresets.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
