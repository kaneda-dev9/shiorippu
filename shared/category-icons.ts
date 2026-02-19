import type { EventCategory } from '~~/types/database'

/** イベントカテゴリとLucideアイコンのマッピング */
export const categoryIcons: Record<EventCategory, string> = {
  transport_train: 'i-lucide-train-front',
  transport_car: 'i-lucide-car',
  transport_plane: 'i-lucide-plane',
  transport_bus: 'i-lucide-bus',
  transport_walk: 'i-lucide-footprints',
  transport_ship: 'i-lucide-ship',
  meal_restaurant: 'i-lucide-utensils',
  meal_cafe: 'i-lucide-coffee',
  meal_izakaya: 'i-lucide-beer',
  stay_hotel: 'i-lucide-hotel',
  stay_ryokan: 'i-lucide-japanese-yen',
  stay_camp: 'i-lucide-tent',
  sightseeing_temple: 'i-lucide-landmark',
  sightseeing_theme_park: 'i-lucide-ferris-wheel',
  sightseeing_beach: 'i-lucide-waves',
  sightseeing_park: 'i-lucide-trees',
  sightseeing_museum: 'i-lucide-building-2',
  onsen: 'i-lucide-flame',
  shopping: 'i-lucide-shopping-bag',
  photo_spot: 'i-lucide-camera',
  activity: 'i-lucide-mountain',
  memo: 'i-lucide-sticky-note',
  other: 'i-lucide-map-pin',
}

/** カテゴリの日本語ラベル */
export const categoryLabels: Record<EventCategory, string> = {
  transport_train: '電車',
  transport_car: '車',
  transport_plane: '飛行機',
  transport_bus: 'バス',
  transport_walk: '徒歩',
  transport_ship: '船',
  meal_restaurant: 'レストラン',
  meal_cafe: 'カフェ',
  meal_izakaya: '居酒屋',
  stay_hotel: 'ホテル',
  stay_ryokan: '旅館',
  stay_camp: 'キャンプ',
  sightseeing_temple: '寺社仏閣',
  sightseeing_theme_park: 'テーマパーク',
  sightseeing_beach: 'ビーチ',
  sightseeing_park: '公園',
  sightseeing_museum: '美術館・博物館',
  onsen: '温泉',
  shopping: 'ショッピング',
  photo_spot: 'フォトスポット',
  activity: 'アクティビティ',
  memo: 'メモ',
  other: 'その他',
}

/** カテゴリからアイコン名を取得（デフォルト付き） */
export function getCategoryIcon(category: string | null | undefined): string {
  return categoryIcons[category as EventCategory] || 'i-lucide-map-pin'
}

/** カテゴリからラベルを取得（デフォルト付き） */
export function getCategoryLabel(category: string | null | undefined): string {
  return categoryLabels[category as EventCategory] || 'その他'
}
