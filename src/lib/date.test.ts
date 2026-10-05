import { describe, expect, it } from 'vitest'
import { formatCalendarDate, isValidIsoDate } from './date'

describe('date helpers', () => {
  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true)
    expect(isValidIsoDate('2026-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('1990-5-17')).toBe(false)
  })

  it('formats calendar dates without shifting the day across timezones', () => {
    expect(formatCalendarDate('1990-05-17')).toBe('17 May 1990')
    expect(formatCalendarDate('2000-01-01')).toBe('1 Jan 2000')
  })
})
