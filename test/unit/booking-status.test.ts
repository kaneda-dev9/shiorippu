import { describe, expect, it } from 'vitest'
import { bookingStatusConfig } from '~~/shared/booking-status'

describe('bookingStatusConfig', () => {
  it('全ステータスが定義されている', () => {
    const statuses = ['none', 'pending', 'confirmed', 'cancelled'] as const
    for (const status of statuses) {
      expect(bookingStatusConfig[status]).toBeDefined()
    }
  })

  it('各ステータスにlabel, color, iconが含まれる', () => {
    for (const config of Object.values(bookingStatusConfig)) {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(config).toHaveProperty('icon')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
      expect(typeof config.icon).toBe('string')
    }
  })

  it('予約済はsuccessカラー', () => {
    expect(bookingStatusConfig.confirmed.color).toBe('success')
  })

  it('キャンセルはerrorカラー', () => {
    expect(bookingStatusConfig.cancelled.color).toBe('error')
  })
})
