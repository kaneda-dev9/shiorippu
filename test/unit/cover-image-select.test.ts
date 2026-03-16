import { describe, expect, it } from 'vitest'
import { selectCoverImage } from '~~/server/utils/cover-image'

describe('selectCoverImage', () => {
  it('エリア名から適切なカバー画像を選択', () => {
    const result = selectCoverImage('京都', [])
    expect(result).toBe('/covers/kyoto-temple.webp')
  })

  it('イベント情報からマッチング', () => {
    const result = selectCoverImage(null, [
      { title: '草津温泉', category: 'onsen', address: '群馬県草津町' },
    ])
    expect(result).toBe('/covers/onsen.webp')
  })

  it('長いタグ（具体的）が短いタグより優先される', () => {
    // 「白川郷」(3文字)は「雪」(1文字)より高スコア → snow-village
    const result = selectCoverImage('白川郷', [])
    expect(result).toBe('/covers/snow-village.webp')
  })

  it('マッチなしの場合デフォルト画像を返す', () => {
    const result = selectCoverImage(null, [])
    expect(result).toBe('/covers/default.webp')
  })

  it('複数プリセットで最高スコアを選択', () => {
    // 沖縄 + 海 → beach-tropical（タグ「沖縄」「海」の両方でマッチ）
    const result = selectCoverImage('沖縄', [
      { title: '海水浴', category: 'activity' },
    ])
    expect(result).toBe('/covers/beach-tropical.webp')
  })

  it('カテゴリ名もマッチング対象', () => {
    const result = selectCoverImage(null, [
      { title: '食事', category: 'グルメ' },
    ])
    expect(result).toBe('/covers/food.webp')
  })
})
