import { describe, expect, it } from 'vitest'
import { euroToInput, formatEuro, parseEuro } from './money'

describe('parseEuro', () => {
  it.each([
    ['60', 60],
    ['60,50', 60.5],
    ['60.5', 60.5],
    [' € 45 ', 45],
    ['1.200', 1200],
    ['1.200,50', 1200.5],
    ['0', 0],
  ])('%j → %d', (text, expected) => {
    expect(parseEuro(text)).toBe(expected)
  })

  it.each(['', 'gratis', '-10', '10,555', '1,2,3'])('rejects %j', (text) => {
    expect(parseEuro(text)).toBeNull()
  })
})

describe('formatEuro', () => {
  it('uses the Italian format', () => {
    expect(formatEuro(60).replace(/\s/g, ' ')).toBe('60 €')
    expect(formatEuro(60.5).replace(/\s/g, ' ')).toBe('60,50 €')
    expect(formatEuro(1200).replace(/\s/g, ' ')).toBe('1200 €')
  })
})

describe('euroToInput', () => {
  it('round-trips with parseEuro', () => {
    for (const amount of [0, 45, 60.5, 1200.25]) expect(parseEuro(euroToInput(amount))).toBe(amount)
    expect(euroToInput(undefined)).toBe('')
  })
})
