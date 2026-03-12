import type { BookingStatus } from '~~/types/database'

/** 予約ステータスの表示設定 */
export const bookingStatusConfig: Record<BookingStatus, { label: string, color: string, icon: string }> = {
  none: { label: '未設定', color: 'neutral', icon: 'i-lucide-minus' },
  pending: { label: '予約中', color: 'warning', icon: 'i-lucide-clock' },
  confirmed: { label: '予約済', color: 'success', icon: 'i-lucide-circle-check' },
  cancelled: { label: 'キャンセル', color: 'error', icon: 'i-lucide-circle-x' },
} as const
