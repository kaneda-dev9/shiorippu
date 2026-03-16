import { describe, expect, it } from 'vitest'
import { formatDateJa, formatDateShort, formatDateRange, formatTime, calcTripDays } from '~~/app/utils/date'

describe('formatDateJa', () => {
  it('日付を「YYYY年M月D日」形式にフォーマットする', () => {
    expect(formatDateJa('2025-01-15')).toBe('2025年1月15日')
    expect(formatDateJa('2025-12-01')).toBe('2025年12月1日')
  })

  it('nullは空文字列を返す', () => {
    expect(formatDateJa(null)).toBe('')
  })
})

describe('formatDateShort', () => {
  it('日付を「M/D」形式にフォーマットする', () => {
    expect(formatDateShort('2025-01-15')).toBe('1/15')
    expect(formatDateShort('2025-12-25')).toBe('12/25')
  })

  it('nullは空文字列を返す', () => {
    expect(formatDateShort(null)).toBe('')
  })
})

describe('formatDateRange', () => {
  it('日付範囲を「M/D - M/D」形式にフォーマットする', () => {
    expect(formatDateRange('2025-01-15', '2025-01-17')).toBe('1/15 - 1/17')
  })

  it('endDateがnullの場合startDateのみ返す', () => {
    expect(formatDateRange('2025-01-15', null)).toBe('1/15')
  })

  it('startDateがnullの場合空文字列を返す', () => {
    expect(formatDateRange(null, '2025-01-17')).toBe('')
  })

  it('両方nullの場合空文字列を返す', () => {
    expect(formatDateRange(null, null)).toBe('')
  })
})

describe('formatTime', () => {
  it('時刻を「HH:MM」形式にフォーマットする', () => {
    expect(formatTime('14:30:00')).toBe('14:30')
    expect(formatTime('09:00:00')).toBe('09:00')
  })

  it('HH:MM形式はそのまま返す', () => {
    expect(formatTime('14:30')).toBe('14:30')
  })

  it('nullは空文字列を返す', () => {
    expect(formatTime(null)).toBe('')
  })
})

describe('calcTripDays', () => {
  it('旅行日数を計算する（開始日と終了日を含む）', () => {
    expect(calcTripDays('2025-01-15', '2025-01-17')).toBe(3)
  })

  it('日帰り（同日）は1日', () => {
    expect(calcTripDays('2025-01-15', '2025-01-15')).toBe(1)
  })

  it('startDateがnullの場合0を返す', () => {
    expect(calcTripDays(null, '2025-01-17')).toBe(0)
  })

  it('endDateがnullの場合0を返す', () => {
    expect(calcTripDays('2025-01-15', null)).toBe(0)
  })
})
