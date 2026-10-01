import { describe, expect, it } from 'vitest'
import { formatDayHeading, toIsoDate } from './dates'

describe('toIsoDate', () => {
  it('formats the local calendar date', () => {
    expect(toIsoDate(new Date(2026, 9, 1, 23, 30))).toBe('2026-10-01')
    expect(toIsoDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05')
  })
})

describe('formatDayHeading', () => {
  it('uses Italian weekday and month names', () => {
    expect(formatDayHeading(new Date(2026, 9, 1))).toBe('giovedì 1 ottobre')
    expect(formatDayHeading(new Date(2027, 1, 28))).toBe('domenica 28 febbraio')
  })
})
