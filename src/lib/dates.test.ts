import { describe, expect, it } from 'vitest'
import {
  ageOn,
  formatDateIt,
  formatDayHeading,
  isoDateFromParts,
  parseDateText,
  toIsoDate,
} from './dates'

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

describe('formatDateIt', () => {
  it('formats as dd/mm/yyyy', () => {
    expect(formatDateIt('1985-10-03')).toBe('03/10/1985')
  })
})

describe('isoDateFromParts', () => {
  it('rejects days that do not exist', () => {
    expect(isoDateFromParts(2026, 2, 31)).toBeNull()
    expect(isoDateFromParts(2027, 2, 29)).toBeNull()
    expect(isoDateFromParts(2028, 2, 29)).toBe('2028-02-29')
  })
})

describe('parseDateText', () => {
  it.each([
    ['03/10/1985', '1985-10-03'],
    ['3/10/1985', '1985-10-03'],
    ['03-10-1985', '1985-10-03'],
    ['03.10.1985', '1985-10-03'],
    [' 1985-10-03 ', '1985-10-03'],
  ])('%j → %j', (text, expected) => {
    expect(parseDateText(text)).toBe(expected)
  })

  it.each(['', '31/02/1990', '03/10/85', '10/2026', 'ieri'])('rejects %j', (text) => {
    expect(parseDateText(text)).toBeNull()
  })
})

describe('ageOn', () => {
  it('counts whole years, turning a year older on the birthday', () => {
    expect(ageOn('1985-10-03', new Date(2026, 9, 2))).toBe(40)
    expect(ageOn('1985-10-03', new Date(2026, 9, 3))).toBe(41)
  })
})
