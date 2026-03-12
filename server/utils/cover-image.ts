import { coverImagePresets, getDefaultCoverImage } from '~~/shared/cover-images'

/**
 * しおりの内容からカバー画像を自動選択（タグベースマッチング）
 * area + イベント情報からキーワードを抽出し、プリセットのタグとスコアリング
 */
export function selectCoverImage(
  area: string | null,
  events: { title: string; category: string; address?: string | null }[],
): string {
  // キーワードセットを構築
  const keywords: string[] = []

  if (area) {
    keywords.push(area)
  }

  for (const ev of events) {
    keywords.push(ev.title)
    if (ev.address) keywords.push(ev.address)
    // カテゴリ名もマッチング対象に
    keywords.push(ev.category)
  }

  const text = keywords.join(' ').toLowerCase()

  // 各プリセットのスコアを計算
  let bestScore = 0
  let bestPreset = getDefaultCoverImage()

  for (const preset of coverImagePresets) {
    if (preset.id === 'default') continue

    let score = 0
    for (const tag of preset.tags) {
      if (text.includes(tag.toLowerCase())) {
        // 長いタグほど高スコア（「白川郷」は「山」より具体的）
        score += tag.length
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestPreset = preset
    }
  }

  return bestPreset.path
}
