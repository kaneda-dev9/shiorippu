import dayjs from 'dayjs'
import 'dayjs/locale/ja'

dayjs.locale('ja')

/** 日付を「2025年1月15日」形式にフォーマット */
export function formatDateJa(dateStr: string | null): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY年M月D日')
}

/** 日付を「1/15」形式にフォーマット */
export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('M/D')
}

/** 日付範囲を「1/15 - 1/17」形式にフォーマット */
export function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return ''
  if (!endDate) return formatDateShort(startDate)
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
}

/** 時刻を「14:30」形式にフォーマット */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

/** 旅行の日数を計算 */
export function calcTripDays(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0
  return dayjs(endDate).diff(dayjs(startDate), 'day') + 1
}
