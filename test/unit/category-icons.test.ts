import { describe, expect, it } from 'vitest'
import { getCategoryIcon, getCategoryLabel, categoryIcons, categoryLabels } from '~~/shared/category-icons'

describe('getCategoryIcon', () => {
  it('既知のカテゴリに対して正しいアイコンを返す', () => {
    expect(getCategoryIcon('transport_train')).toBe('i-lucide-train-front')
    expect(getCategoryIcon('meal_cafe')).toBe('i-lucide-coffee')
    expect(getCategoryIcon('onsen')).toBe('i-lucide-flame')
  })

  it('未知のカテゴリにはデフォルトアイコンを返す', () => {
    expect(getCategoryIcon('unknown')).toBe('i-lucide-map-pin')
  })

  it('null/undefinedにはデフォルトアイコンを返す', () => {
    expect(getCategoryIcon(null)).toBe('i-lucide-map-pin')
    expect(getCategoryIcon(undefined)).toBe('i-lucide-map-pin')
  })
})

describe('getCategoryLabel', () => {
  it('既知のカテゴリに対して正しいラベルを返す', () => {
    expect(getCategoryLabel('transport_train')).toBe('電車')
    expect(getCategoryLabel('meal_cafe')).toBe('カフェ')
    expect(getCategoryLabel('onsen')).toBe('温泉')
  })

  it('未知のカテゴリにはデフォルトラベルを返す', () => {
    expect(getCategoryLabel('unknown')).toBe('その他')
  })

  it('null/undefinedにはデフォルトラベルを返す', () => {
    expect(getCategoryLabel(null)).toBe('その他')
    expect(getCategoryLabel(undefined)).toBe('その他')
  })
})

describe('categoryIcons / categoryLabels', () => {
  it('全カテゴリにアイコンとラベルが定義されている', () => {
    const iconKeys = Object.keys(categoryIcons)
    const labelKeys = Object.keys(categoryLabels)
    expect(iconKeys).toEqual(labelKeys)
    expect(iconKeys.length).toBeGreaterThan(0)
  })
})
