import type { EventCategory } from '~~/types/database'

/** カテゴリ → 絵文字マッピング（PDF出力用） */
export const categoryEmojis: Record<EventCategory, string> = {
  transport_train: '🚃',
  transport_car: '🚗',
  transport_plane: '✈',
  transport_bus: '🚌',
  transport_walk: '🚶',
  transport_ship: '🚢',
  meal_restaurant: '🍽',
  meal_cafe: '☕',
  meal_izakaya: '🍺',
  stay_hotel: '🏨',
  stay_ryokan: '🏯',
  stay_camp: '⛺',
  sightseeing_temple: '⛩',
  sightseeing_theme_park: '🎡',
  sightseeing_beach: '🏖',
  sightseeing_park: '🌳',
  sightseeing_museum: '🏛',
  onsen: '♨',
  shopping: '🛍',
  photo_spot: '📷',
  activity: '⛰',
  memo: '📝',
  other: '📍',
}

/** カテゴリ絵文字を取得（デフォルト付き） */
export function getCategoryEmoji(category: string | null | undefined): string {
  return categoryEmojis[category as EventCategory] || '📍'
}
